const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const crypto = require("crypto");
const axios = require("axios");
const { createLogger } = require("../logger");
const serpConfig = require("../config/serp");
const { scrapeSerpPage } = require("../services/serpScraper");
const { extractEntitiesAndPhrases } = require("../services/entityExtractor");
const { limitSERP } = require("../utils/rateLimiter");

const logger = createLogger();
const SERP_API_BASE = process.env.SERP_API_BASE || "https://serpapi.com/search.json";

function unique(arr) {
  return Array.from(new Set(arr));
}

function hashQuery(query) {
  return crypto.createHash("sha256").update(String(query || "").toLowerCase().trim()).digest("hex").slice(0, 16);
}

async function cacheExpired(filePath, ttlHours) {
  try {
    const stat = await fsp.stat(filePath);
    const ageMs = Date.now() - stat.mtimeMs;
    return ageMs > ttlHours * 60 * 60 * 1000;
  } catch (_) {
    return true;
  }
}

function aggregateIntel(query, productEntity, pageType, pageRows, topUrls) {
  const headingPatterns = [];
  const allText = [];
  const faqPatterns = [];
  const schemaTypes = [];
  const wordCounts = [];

  for (const row of pageRows) {
    for (const h of row.headings || []) headingPatterns.push(h.text);
    allText.push(row.paragraphText || "");
    faqPatterns.push(...(row.faqQuestions || []));
    schemaTypes.push(...(row.schemaTypes || []));
    if (row.wordCount) wordCounts.push(row.wordCount);
  }

  const entities = [];
  const phrases = [];
  for (const text of allText) {
    const e = extractEntitiesAndPhrases(text);
    entities.push(...(e.entities || []));
    phrases.push(...(e.phrases || []));
  }

  const avg = wordCounts.length
    ? Math.round(wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length)
    : 0;

  return {
    query,
    productEntity,
    pageType,
    averageWordCount: avg,
    headingPatterns: unique(headingPatterns).slice(0, 50),
    entityCoverage: unique(entities).slice(0, 50),
    semanticPhrases: unique(phrases).slice(0, 60),
    faqPatterns: unique(faqPatterns).slice(0, 30),
    schemaTypes: unique(schemaTypes).slice(0, 20),
    topUrls: topUrls.slice(0, serpConfig.maxResults),
  };
}

async function searchTopUrls(query) {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) return [];

  const res = await limitSERP.run(() =>
    axios.get(SERP_API_BASE, {
      timeout: serpConfig.requestTimeoutMs,
      params: {
        api_key: apiKey,
        engine: "google",
        q: query,
        num: serpConfig.maxResults,
        gl: "us",
        hl: "en",
      },
    })
  );

  const organic = Array.isArray(res.data?.organic_results) ? res.data.organic_results : [];
  return organic
    .map((x) => String(x.link || "").trim())
    .filter(Boolean)
    .slice(0, serpConfig.maxResults);
}

function fallbackIntel(input = {}) {
  const text = String(input.first1500Words || "");
  const ep = extractEntitiesAndPhrases(text);
  const avg = text.split(/\s+/).filter(Boolean).length;
  return {
    query: input.query || input.productEntity || "",
    productEntity: input.productEntity || "",
    pageType: input.pageType || "generic",
    averageWordCount: avg,
    headingPatterns: (input.headings || []).map((h) => h.text).filter(Boolean).slice(0, 20),
    entityCoverage: ep.entities || [],
    semanticPhrases: ep.phrases || [],
    faqPatterns: [],
    schemaTypes: [],
    topUrls: [],
  };
}

async function runSerpIntel(input = {}, options = {}) {
  const started = Date.now();
  const query = String(input.query || input.productEntity || "").trim().toLowerCase();
  const cacheDir = options.cacheDir || path.join(process.cwd(), "cache", "serp");
  const datasetDir = options.datasetDir || path.join(process.cwd(), "output", "site", "dataset", "serp");
  await fsp.mkdir(cacheDir, { recursive: true });
  await fsp.mkdir(datasetDir, { recursive: true });

  const hash = hashQuery(query || "unknown");
  const cachePath = path.join(cacheDir, `${hash}.json`);
  const safeQuery = (query || "unknown").replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "");
  const datasetPath = path.join(datasetDir, `${safeQuery || hash}.json`);

  if (!(await cacheExpired(cachePath, serpConfig.cacheTTLHours))) {
    const cached = JSON.parse(await fsp.readFile(cachePath, "utf-8"));
    await fsp.writeFile(datasetPath, JSON.stringify(cached, null, 2), "utf-8");
    logger.metric("serpIntelAgent", {
      query,
      durationMs: Date.now() - started,
      source: "cache",
      queueDepth: limitSERP.stats().queued,
    });
    return cached;
  }

  try {
    const urls = await searchTopUrls(query);

    const scrapeTasks = urls.slice(0, serpConfig.maxResults).map((url) =>
      limitSERP.run(async () => {
        try {
          return await scrapeSerpPage(url, serpConfig.requestTimeoutMs);
        } catch (_) {
          return null;
        }
      })
    );
    const scraped = await Promise.all(scrapeTasks);
    const pages = scraped.filter(Boolean);

    const intel = aggregateIntel(query, input.productEntity, input.pageType, pages, urls);
    await fsp.writeFile(cachePath, JSON.stringify(intel, null, 2), "utf-8");
    await fsp.writeFile(datasetPath, JSON.stringify(intel, null, 2), "utf-8");

    logger.metric("serpIntelAgent", {
      query,
      durationMs: Date.now() - started,
      source: "api",
      urls: urls.length,
      pagesParsed: pages.length,
      queueDepth: limitSERP.stats().queued,
    });

    return intel;
  } catch (err) {
    const fb = fallbackIntel({ ...input, query });
    await fsp.writeFile(cachePath, JSON.stringify(fb, null, 2), "utf-8");
    await fsp.writeFile(datasetPath, JSON.stringify(fb, null, 2), "utf-8");

    logger.error("serpIntelAgent.error", {
      query,
      durationMs: Date.now() - started,
      message: err?.message || String(err),
      queueDepth: limitSERP.stats().queued,
    });

    return fb;
  }
}

module.exports = runSerpIntel;
