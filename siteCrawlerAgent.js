const axios = require("axios");
const cheerio = require("cheerio");
const { parseStringPromise } = require("xml2js");
const { assertSafeUrl } = require("./core/urlSafety");

const USER_AGENT = "Mozilla/5.0";
const REQUEST_TIMEOUT_MS = 30000;
const MAX_SITEMAPS = 40;
const MAX_CRAWL_PAGES = 250;
const MAX_CRAWL_DEPTH = 2;
const FETCH_RETRIES = 3;
const FETCH_BASE_DELAY_MS = 800;

function normalizeBaseUrl(input) {
  const withScheme = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  const u = new URL(withScheme);
  return `${u.protocol}//${u.host}`;
}

function normalizeUrl(url) {
  const u = new URL(url);
  u.hash = "";
  return u.toString();
}

function isSameDomain(url, hostname) {
  try {
    return new URL(url).hostname === hostname;
  } catch (_) {
    return false;
  }
}

function isLikelyHtml(url) {
  try {
    const p = new URL(url).pathname || "";
    return !/\.(jpg|jpeg|png|gif|webp|svg|pdf|zip|xml|json|css|js|ico|txt)$/i.test(p);
  } catch (_) {
    return false;
  }
}

function shouldSkipForSiteAudit(urlString) {
  try {
    const u = new URL(urlString);
    const p = (u.pathname || "/").toLowerCase();
    if (p === "/" || p === "") return false;

    return /(\/(login|recover-password|share|feedback|contact|customer-care|help-center-and-support|track-my-order|returns|issues-and-resolutions|resources|videos)(\/|$))/.test(
      p
    );
  } catch (_) {
    return false;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffMs(attempt) {
  const jitter = Math.floor(Math.random() * 300);
  return FETCH_BASE_DELAY_MS * Math.pow(2, attempt - 1) + jitter;
}

function isRetryableStatus(status) {
  return status === 429 || status === 503 || status === 502 || status === 504;
}

async function fetchText(url) {
  await assertSafeUrl(url, {
    enforceRobots: String(process.env.ENFORCE_ROBOTS || "").toLowerCase() === "true",
  });
  let lastErr = null;

  for (let attempt = 1; attempt <= FETCH_RETRIES; attempt += 1) {
    try {
      const response = await axios.get(url, {
        headers: { "User-Agent": USER_AGENT },
        timeout: REQUEST_TIMEOUT_MS,
        validateStatus: () => true,
      });

      if (response.status >= 200 && response.status < 300) {
        return String(response.data || "");
      }

      const err = new Error(`HTTP ${response.status}`);
      if (!isRetryableStatus(response.status) || attempt === FETCH_RETRIES) {
        throw err;
      }
      lastErr = err;
      await sleep(backoffMs(attempt));
    } catch (err) {
      lastErr = err;
      if (attempt === FETCH_RETRIES) break;
      await sleep(backoffMs(attempt));
    }
  }

  throw lastErr || new Error("fetchText failed");
}

async function parseSitemapUrls(xml) {
  const doc = await parseStringPromise(xml, { trim: true });
  const urls = [];
  const sitemaps = [];

  if (doc?.urlset?.url) {
    for (const entry of doc.urlset.url) {
      const loc = entry?.loc?.[0];
      if (loc) urls.push(String(loc).trim());
    }
  }

  if (doc?.sitemapindex?.sitemap) {
    for (const entry of doc.sitemapindex.sitemap) {
      const loc = entry?.loc?.[0];
      if (loc) sitemaps.push(String(loc).trim());
    }
  }

  return { urls, sitemaps };
}

async function crawlSitemap(baseUrl) {
  const normalizedBase = normalizeBaseUrl(baseUrl);
  const root = new URL(normalizedBase);
  const startSitemap = `${root.protocol}//${root.host}/sitemap.xml`;
  const queue = [startSitemap];
  const seenSitemaps = new Set();
  const pageUrls = new Set();

  while (queue.length > 0 && seenSitemaps.size < MAX_SITEMAPS) {
    const sitemapUrl = queue.shift();
    if (!sitemapUrl || seenSitemaps.has(sitemapUrl)) continue;
    seenSitemaps.add(sitemapUrl);

    try {
      const xml = await fetchText(sitemapUrl);
      const parsed = await parseSitemapUrls(xml);

      for (const url of parsed.urls) {
        const normalized = normalizeUrl(url);
        if (!isSameDomain(normalized, root.hostname)) continue;
        if (!isLikelyHtml(normalized)) continue;
        if (shouldSkipForSiteAudit(normalized)) continue;
        pageUrls.add(normalized);
      }

      for (const childSitemap of parsed.sitemaps) {
        const normalized = normalizeUrl(childSitemap);
        if (!isSameDomain(normalized, root.hostname)) continue;
        if (!seenSitemaps.has(normalized)) queue.push(normalized);
      }
    } catch (_) {
      // Skip broken or unavailable sitemap files.
    }
  }

  return Array.from(pageUrls);
}

async function crawlInternalLinks(baseUrl) {
  const normalizedBase = normalizeBaseUrl(baseUrl);
  const root = new URL(normalizedBase);
  const queue = [{ url: normalizedBase, depth: 0 }];
  const visited = new Set();
  const pages = new Set();

  while (queue.length > 0 && visited.size < MAX_CRAWL_PAGES) {
    const current = queue.shift();
    if (!current) continue;

    let currentUrl;
    try {
      currentUrl = normalizeUrl(current.url);
    } catch (_) {
      continue;
    }

    if (visited.has(currentUrl)) continue;
    visited.add(currentUrl);

    try {
      const html = await fetchText(currentUrl);
      pages.add(currentUrl);

      if (current.depth >= MAX_CRAWL_DEPTH) continue;

      const $ = cheerio.load(html);
      $("a[href]").each((_, el) => {
        const href = $(el).attr("href");
        if (!href) return;
        try {
          const resolved = normalizeUrl(new URL(href, currentUrl).toString());
          if (!isSameDomain(resolved, root.hostname)) return;
          if (!isLikelyHtml(resolved)) return;
          if (shouldSkipForSiteAudit(resolved)) return;
          if (!visited.has(resolved)) {
            queue.push({ url: resolved, depth: current.depth + 1 });
          }
        } catch (_) {
          // ignore invalid links
        }
      });
    } catch (_) {
      // Skip pages that fail to load.
    }
  }

  return Array.from(pages);
}

module.exports = {
  crawlSitemap,
  crawlInternalLinks,
  normalizeBaseUrl,
  shouldSkipForSiteAudit,
};
