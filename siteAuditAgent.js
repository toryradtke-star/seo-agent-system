const fs = require("fs");
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");
const { execFile } = require("child_process");
const { promisify } = require("util");
const { assertSafeUrl } = require("./core/urlSafety");

const execFileAsync = promisify(execFile);
const OUTPUT_ROOT = path.join(__dirname, "output");
const DEFAULT_CONCURRENCY = 2;
const DEFAULT_CLASSIFY_CONCURRENCY = 4;
const MAX_SITEMAPS = 30;
const MAX_CRAWL_PAGES = 60;
const MAX_CRAWL_DEPTH = 2;

function normalizeRootUrl(input) {
  const withProtocol = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  const u = new URL(withProtocol);
  return `${u.protocol}//${u.hostname}`;
}

function domainToSlug(hostname) {
  return hostname.replace(/[^a-zA-Z0-9.-]+/g, "-");
}

function pageToSlug(urlString) {
  const u = new URL(urlString);
  const rawPath = (u.pathname || "/").replace(/\/+$/g, "");
  if (!rawPath || rawPath === "/") return "home";
  return rawPath
    .replace(/^\/+/, "")
    .replace(/[^a-zA-Z0-9/_-]+/g, "-")
    .replace(/\//g, "--");
}

function normalizeUrlNoHash(urlString) {
  const u = new URL(urlString);
  u.hash = "";
  return u.toString();
}

function isInternalUrl(candidate, rootHostname) {
  try {
    const u = new URL(candidate);
    return u.hostname === rootHostname;
  } catch (_) {
    return false;
  }
}

function isLikelyHtmlPage(urlString) {
  try {
    const u = new URL(urlString);
    return !/\.(jpg|jpeg|png|gif|webp|svg|pdf|zip|xml|json|css|js|ico|txt)$/i.test(
      u.pathname || ""
    );
  } catch (_) {
    return false;
  }
}

function getProductSignals(urlString, html) {
  const htmlText = String(html || "");
  const htmlLower = htmlText.toLowerCase();
  const pathLower = (() => {
    try {
      return new URL(urlString).pathname.toLowerCase();
    } catch (_) {
      return "";
    }
  })();

  const urlPattern =
    /\/(product|products|p|item|banner|sign)(\/|$)/i.test(pathLower) ||
    /(\/banner|\/sign)/i.test(pathLower);

  const htmlCta =
    /add\s*to\s*cart/i.test(htmlLower) ||
    /upload\s*artwork/i.test(htmlLower) ||
    /customize/i.test(htmlLower) ||
    /select\s*size/i.test(htmlLower) ||
    /choose\s*options?/i.test(htmlLower);

  const pricing = /\$\s?\d/.test(htmlText) || /\bprice\b/i.test(htmlLower);
  const schema =
    /schema\.org\/Product/i.test(htmlText) ||
    /"@type"\s*:\s*"Product"/i.test(htmlText) ||
    /"@type"\s*:\s*\[\s*"Product"/i.test(htmlText);

  let heading = false;
  try {
    const $ = cheerio.load(htmlText);
    const h1 = ($("h1").first().text() || "").toLowerCase();
    heading = /(banner|sticker|decal|sign|poster|display)/i.test(h1);
  } catch (_) {
    heading = false;
  }

  return { urlPattern, htmlCta, pricing, schema, heading };
}

function isProductPage(url, html) {
  const s = getProductSignals(url, html);
  const score =
    Number(s.urlPattern) +
    Number(s.htmlCta) +
    Number(s.pricing) +
    Number(s.schema) +
    Number(s.heading);

  if (s.schema) return true;
  if (s.urlPattern && (s.htmlCta || s.pricing || s.heading)) return true;
  return score >= 2;
}

function extractLocsFromXml(xml) {
  const out = [];
  const re = /<loc>([\s\S]*?)<\/loc>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const loc = String(m[1] || "").trim();
    if (loc) out.push(loc);
  }
  return out;
}

async function fetchText(url) {
  await assertSafeUrl(url, {
    enforceRobots: String(process.env.ENFORCE_ROBOTS || "").toLowerCase() === "true",
  });
  const resp = await axios.get(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    timeout: 30000,
    validateStatus: () => true,
  });
  if (resp.status < 200 || resp.status >= 300) {
    throw new Error(`HTTP ${resp.status}`);
  }
  return String(resp.data || "");
}

async function discoverFromSitemap(rootUrl) {
  const root = new URL(rootUrl);
  const start = `${root.protocol}//${root.host}/sitemap.xml`;
  const queue = [start];
  const seen = new Set();
  const pageUrls = new Set();

  while (queue.length > 0 && seen.size < MAX_SITEMAPS) {
    const sitemapUrl = queue.shift();
    if (!sitemapUrl || seen.has(sitemapUrl)) continue;
    seen.add(sitemapUrl);

    try {
      const xml = await fetchText(sitemapUrl);
      const locs = extractLocsFromXml(xml);
      for (const loc of locs) {
        const normalized = normalizeUrlNoHash(loc);
        if (!isInternalUrl(normalized, root.hostname)) continue;

        if (/\.xml(\?|$)/i.test(normalized) || /sitemap/i.test(normalized)) {
          if (!seen.has(normalized) && queue.length < MAX_SITEMAPS) {
            queue.push(normalized);
          }
          continue;
        }
        if (isLikelyHtmlPage(normalized)) pageUrls.add(normalized);
      }
    } catch (_) {
      // ignore missing/invalid sitemap files and continue
    }
  }

  return Array.from(pageUrls);
}

async function crawlInternalLinks(rootUrl) {
  const root = new URL(rootUrl);
  const queue = [{ url: rootUrl, depth: 0 }];
  const seen = new Set();
  const pages = new Set();

  while (queue.length > 0 && seen.size < MAX_CRAWL_PAGES) {
    const current = queue.shift();
    if (!current) continue;
    const currentUrl = normalizeUrlNoHash(current.url);
    if (seen.has(currentUrl)) continue;
    seen.add(currentUrl);

    try {
      const html = await fetchText(currentUrl);
      pages.add(currentUrl);

      if (current.depth >= MAX_CRAWL_DEPTH) continue;

      const $ = cheerio.load(html);
      $("a[href]").each((_, el) => {
        const href = $(el).attr("href");
        if (!href) return;
        try {
          const nextUrl = normalizeUrlNoHash(new URL(href, currentUrl).toString());
          if (!isInternalUrl(nextUrl, root.hostname)) return;
          if (!isLikelyHtmlPage(nextUrl)) return;
          if (!seen.has(nextUrl)) queue.push({ url: nextUrl, depth: current.depth + 1 });
        } catch (_) {
          // ignore invalid links
        }
      });
    } catch (_) {
      // ignore fetch failures during crawl
    }
  }

  return Array.from(pages);
}

function parseMasterArtifactPaths(stdoutText) {
  const lines = String(stdoutText || "").split(/\r?\n/);
  const out = {};
  for (const line of lines) {
    const scraped = line.match(/^MASTER: scraped -> (.+)$/);
    if (scraped) out.scrapedPath = scraped[1].trim();
    const optimized = line.match(/^MASTER: optimized -> (.+)$/);
    if (optimized) out.optimizedPath = optimized[1].trim();
    const meta = line.match(/^MASTER: run metadata -> (.+)$/);
    if (meta) out.runMetaPath = meta[1].trim();
  }
  return out;
}

function writeJson(filePath, obj) {
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), "utf-8");
}

function copyIfExists(src, dest) {
  if (!src) return;
  if (fs.existsSync(src)) fs.copyFileSync(src, dest);
}

async function runMasterForUrl(pageUrl, pageDir) {
  const masterPath = path.join(__dirname, "masterAgent.js");
  const result = await execFileAsync("node", [masterPath, pageUrl], {
    maxBuffer: 30 * 1024 * 1024,
  });

  const stdout = String(result.stdout || "");
  const stderr = String(result.stderr || "");
  fs.writeFileSync(path.join(pageDir, "master.stdout.log"), stdout, "utf-8");
  fs.writeFileSync(path.join(pageDir, "master.stderr.log"), stderr, "utf-8");

  const artifacts = parseMasterArtifactPaths(stdout);
  copyIfExists(artifacts.scrapedPath, path.join(pageDir, "scraped.json"));
  copyIfExists(artifacts.optimizedPath, path.join(pageDir, "optimized.md"));
  copyIfExists(artifacts.runMetaPath, path.join(pageDir, "run.json"));

  return artifacts;
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let index = 0;

  async function runner() {
    while (true) {
      const i = index;
      index += 1;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  }

  const workers = [];
  for (let i = 0; i < Math.min(limit, items.length); i += 1) {
    workers.push(runner());
  }
  await Promise.all(workers);
  return results;
}

async function main() {
  const rootInput = process.argv[2];
  const concurrencyArg = Number(process.argv[3] || DEFAULT_CONCURRENCY);
  const concurrency = Number.isFinite(concurrencyArg) && concurrencyArg > 0
    ? Math.floor(concurrencyArg)
    : DEFAULT_CONCURRENCY;

  if (!rootInput) {
    console.error("Usage: node siteAuditAgent.js <root-site-url> [concurrency]");
    process.exit(1);
  }

  const rootUrl = normalizeRootUrl(rootInput);
  const root = new URL(rootUrl);
  const domainSlug = domainToSlug(root.hostname);
  const domainDir = path.join(OUTPUT_ROOT, domainSlug);
  fs.mkdirSync(domainDir, { recursive: true });

  console.log(`SITE: root URL: ${rootUrl}`);
  console.log("SITE: discovering pages from sitemap...");
  let discovered = await discoverFromSitemap(rootUrl);
  let discoveryMethod = "sitemap";

  if (discovered.length === 0) {
    console.log("SITE: sitemap discovery returned 0 pages, crawling homepage links...");
    discovered = await crawlInternalLinks(rootUrl);
    discoveryMethod = "crawl";
  }

  const discoveredUnique = Array.from(new Set(discovered.map(normalizeUrlNoHash)));
  const classifyConcurrency = Math.max(
    1,
    Math.min(DEFAULT_CLASSIFY_CONCURRENCY, concurrency * 2)
  );

  console.log(`SITE: classifying ${discoveredUnique.length} URLs for PDP signals...`);

  const classifications = await mapWithConcurrency(
    discoveredUnique,
    classifyConcurrency,
    async (pageUrl) => {
      try {
        const html = await fetchText(pageUrl);
        const signals = getProductSignals(pageUrl, html);
        const product = isProductPage(pageUrl, html);
        return { url: pageUrl, product, signals };
      } catch (err) {
        return {
          url: pageUrl,
          product: false,
          signals: null,
          error: err?.message || String(err),
        };
      }
    }
  );

  const candidates = classifications.filter((x) => x.product).map((x) => x.url);
  const skipped = classifications.filter((x) => !x.product);
  const classificationErrors = skipped.filter((x) => x.error).length;

  const discoveryMeta = {
    rootUrl,
    discoveredCount: discoveredUnique.length,
    candidateCount: candidates.length,
    discoveryMethod,
    generatedAt: new Date().toISOString(),
    candidates,
  };
  writeJson(path.join(domainDir, "discovery.json"), discoveryMeta);
  writeJson(path.join(domainDir, "classification.json"), classifications);
  writeJson(path.join(domainDir, "skipped-urls.json"), skipped);

  console.log(`SITE: pages discovered: ${discoveredUnique.length}`);
  console.log(`SITE: product pages detected: ${candidates.length}`);
  console.log(`SITE: pages skipped (non-PDP or failed): ${skipped.length}`);

  let processed = 0;
  let errors = 0;

  await mapWithConcurrency(candidates, concurrency, async (pageUrl, i) => {
    const pageSlug = pageToSlug(pageUrl);
    const pageDir = path.join(domainDir, "products", pageSlug);
    fs.mkdirSync(pageDir, { recursive: true });

    console.log(`SITE: [${i + 1}/${candidates.length}] processing ${pageUrl}`);
    try {
      await runMasterForUrl(pageUrl, pageDir);
      writeJson(path.join(pageDir, "status.json"), {
        url: pageUrl,
        status: "ok",
        processedAt: new Date().toISOString(),
      });
      processed += 1;
    } catch (err) {
      errors += 1;
      const message = err?.message || String(err);
      fs.writeFileSync(path.join(pageDir, "error.log"), message, "utf-8");
      writeJson(path.join(pageDir, "status.json"), {
        url: pageUrl,
        status: "error",
        error: message,
        processedAt: new Date().toISOString(),
      });
      console.error(`SITE: error on ${pageUrl}: ${message}`);
    }
  });

  const summary = {
    rootUrl,
    domain: root.hostname,
    totalUrlsDiscovered: discoveredUnique.length,
    productPagesDetected: candidates.length,
    pagesAudited: processed,
    pagesSkipped: skipped.length,
    errors: errors + classificationErrors,
    concurrency,
    finishedAt: new Date().toISOString(),
  };
  writeJson(path.join(domainDir, "audit-summary.json"), summary);

  console.log("SITE: complete");
  console.log(`SITE: processed=${processed}, errors=${errors}, total=${candidates.length}`);
  console.log(`SITE: output dir: ${domainDir}`);
}

main().catch((err) => {
  console.error("SITE error:", err?.message || err);
  process.exit(1);
});
