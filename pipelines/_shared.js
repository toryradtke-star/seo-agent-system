const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const {
  crawlSitemap,
  crawlInternalLinks,
  normalizeBaseUrl,
  shouldSkipForSiteAudit,
} = require("../siteCrawlerAgent");

async function ensureDir(dirPath) {
  await fsp.mkdir(dirPath, { recursive: true });
}

async function writeJson(filePath, value) {
  await ensureDir(path.dirname(filePath));
  await fsp.writeFile(filePath, JSON.stringify(value, null, 2), "utf-8");
}

async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await fsp.readFile(filePath, "utf-8"));
  } catch (_) {
    return fallback;
  }
}

async function loadScrapedFromDir(preScrapedDir, url) {
  if (!preScrapedDir) return null;
  try {
    const slug = safeFilenameFromUrl(url);
    const candidatePaths = [
      path.join(preScrapedDir, `${slug}.dataset.json`),
      path.join(preScrapedDir, `${slug}.scraped.json`),
      path.join(preScrapedDir, `${slug}.json`),
    ];
    for (const filePath of candidatePaths) {
      const parsed = await readJson(filePath, null);
      if (parsed && typeof parsed === "object") return parsed;
    }
    return null;
  } catch (_) {
    return null;
  }
}

function getFromSharedCache(sharedPageCache, url) {
  if (!sharedPageCache || typeof sharedPageCache !== "object") return null;
  const value = sharedPageCache[url];
  return value && typeof value === "object" ? value : null;
}

function setToSharedCache(sharedPageCache, url, scraped) {
  if (!sharedPageCache || typeof sharedPageCache !== "object") return;
  if (!scraped || typeof scraped !== "object") return;
  sharedPageCache[url] = scraped;
}

async function resolveScrapedPage({
  url,
  sharedPageCache,
  preScrapedDir,
  runScraper,
}) {
  const cached = getFromSharedCache(sharedPageCache, url);
  if (cached) return { scraped: cached, source: "memory-cache" };

  const pre = await loadScrapedFromDir(preScrapedDir, url);
  if (pre) {
    setToSharedCache(sharedPageCache, url, pre);
    return { scraped: pre, source: "pre-scraped" };
  }

  const fresh = await runScraper(url);
  setToSharedCache(sharedPageCache, url, fresh);
  return { scraped: fresh, source: "scraper" };
}

function safeFilenameFromUrl(url) {
  const u = new URL(url);
  const pathname = (u.pathname || "/").replace(/\/+$/g, "");
  const slug = pathname === "/" ? "home" : pathname.replace(/^\/+/, "").replace(/\//g, "--");
  return slug.replace(/[^a-zA-Z0-9-_]+/g, "-");
}

function mapWithConcurrency(items, limit, worker) {
  if (!Array.isArray(items) || items.length === 0) return Promise.resolve([]);
  const normalizedLimit = Math.max(1, Math.floor(limit || 1));
  const results = new Array(items.length);
  let cursor = 0;

  async function runWorker() {
    while (true) {
      const i = cursor;
      cursor += 1;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  }

  const workers = [];
  for (let i = 0; i < Math.min(normalizedLimit, items.length); i += 1) {
    workers.push(runWorker());
  }
  return Promise.all(workers).then(() => results);
}

async function discoverUrls(baseUrl, options = {}) {
  if (Array.isArray(options.urlList) && options.urlList.length > 0) {
    return {
      urls: Array.from(new Set(options.urlList.map((u) => String(u).trim()).filter(Boolean))),
      discoveryMethod: "explicit-list",
    };
  }

  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  let urls = await crawlSitemap(normalizedBaseUrl);
  let discoveryMethod = "sitemap";

  if (!Array.isArray(urls) || urls.length === 0) {
    urls = await crawlInternalLinks(normalizedBaseUrl);
    discoveryMethod = "internal-crawl";
  }

  const filtered = Array.from(
    new Set(
      (urls || [])
        .map((u) => String(u).trim())
        .filter(Boolean)
        .filter((u) => !shouldSkipForSiteAudit(u))
    )
  );

  return {
    urls: filtered,
    discoveryMethod,
  };
}

module.exports = {
  ensureDir,
  writeJson,
  readJson,
  loadScrapedFromDir,
  resolveScrapedPage,
  safeFilenameFromUrl,
  mapWithConcurrency,
  discoverUrls,
};
