const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const crypto = require("crypto");
const { execFile } = require("child_process");
const { promisify } = require("util");
const {
  crawlSitemap,
  crawlInternalLinks,
  normalizeBaseUrl,
  shouldSkipForSiteAudit,
} = require("./siteCrawlerAgent");
const analyzeTechnicalSeo = require("./technicalSeoAgent");
const analyzeInternalLinks = require("./internalLinkAgent");
const analyzeContentQuality = require("./contentQualityAgent");
const routePage = require("./pageRouterAgent");
const runCategoryAgent = require("./categoryAgent");
const runBlogAgent = require("./blogAgent");
const runSchemaAgent = require("./schemaAgent");
const buildSiteStrategy = require("./siteStrategistAgent");
const runSerpIntel = require("./agents/serpIntelAgent");
const buildKeywordClusters = require("./keywordClusterAgent");
const buildInternalLinkPlan = require("./internalLinkPlanner");
const { createLogger } = require("./logger");
const evaluatePdpOutput = require("./evals/evaluatePdpOutput");
const scoreContent = require("./evals/contentScorer");
const { openDatabase, initSchema, createRepository } = require("./db/database");
const { MAX_OPTIMIZATION_ATTEMPTS, runWithRetry, buildRetryMeta } = require("./core/retryPolicy");
const { runPagePipeline } = require("./core/runPagePipeline");
const { withArtifactMetadata } = require("./core/artifactMetadata");

const execFileAsync = promisify(execFile);

const OUTPUT_DIR = path.join(__dirname, "output");
const SITE_AUDITS_DIR = path.join(OUTPUT_DIR, "site-audits");
const DEFAULT_PAGE_CONCURRENCY = 8;
const SCRAPER_RETRIES = 3;
const PDP_RETRIES = 2;
const BASE_BACKOFF_MS = 1000;
const PDP_CACHE_VERSION = "v2";
const CHECKPOINT_VERSION = 1;
const PROMPTS_METADATA_PATH = path.join(__dirname, "prompts", "metadata.json");

const MODEL_PRICING_PER_1M = {
  "claude-3-5-haiku-latest": { in: 0.8, out: 4.0 },
  "claude-3-5-haiku-20241022": { in: 0.8, out: 4.0 },
  "claude-sonnet-4-20250514": { in: 3.0, out: 15.0 },
  default: { in: 1.0, out: 5.0 },
};

const REQUIRED_PDP_SECTIONS = [
  "BEFORE HEADING STRUCTURE",
  "AFTER OPTIMIZED STRUCTURE",
  "PRODUCT HEADER",
  "PRODUCT OVERVIEW TAB",
  "MATERIAL OPTIONS TAB",
  "FINISHING OPTIONS TAB",
  "PRODUCTION TIMES TAB",
  "SHIPPING GUIDELINES TAB",
  "ARTWORK TAB",
  "POST-TAB CONTENT",
  "FAQ",
];

function ensureOutputDir() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function readPromptMetadata() {
  const fallback = {
    promptVersion: "unknown",
    templateVersion: "unknown",
    model: process.env.CLAUDE_MODEL || "claude-3-5-haiku-latest",
  };
  try {
    const raw = fs.readFileSync(PROMPTS_METADATA_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      promptVersion: parsed.promptVersion || fallback.promptVersion,
      templateVersion: parsed.templateVersion || fallback.templateVersion,
      model: parsed.model || fallback.model,
    };
  } catch (_) {
    return fallback;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffMs(attempt) {
  const jitter = Math.floor(Math.random() * 300);
  return BASE_BACKOFF_MS * Math.pow(2, attempt - 1) + jitter;
}

function isRetryableError(err) {
  const msg = String(err?.message || err || "").toLowerCase();
  return (
    msg.includes("status code 503") ||
    msg.includes("status code 429") ||
    msg.includes("status code 502") ||
    msg.includes("status code 504") ||
    msg.includes("overloaded") ||
    msg.includes("timeout")
  );
}

function readJsonSafe(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (_) {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf-8");
}


async function readJsonSafeAsync(filePath, fallback) {
  try {
    return JSON.parse(await fsp.readFile(filePath, "utf-8"));
  } catch (_) {
    return fallback;
  }
}

async function writeJsonAsync(filePath, value) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, JSON.stringify(value, null, 2), "utf-8");
}

function hashObject(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function estimateModelCost(model, inputTokens, outputTokens) {
  const pricing = MODEL_PRICING_PER_1M[model] || MODEL_PRICING_PER_1M.default;
  const inCost = (Number(inputTokens || 0) / 1000000) * pricing.in;
  const outCost = (Number(outputTokens || 0) / 1000000) * pricing.out;
  return Number((inCost + outCost).toFixed(6));
}

function tryParseJson(stdout) {
  const trimmed = (stdout || "").trim();
  if (!trimmed) throw new Error("Scraper produced empty output.");

  try {
    return JSON.parse(trimmed);
  } catch (_) {
    const lines = trimmed.split(/\r?\n/).filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      try {
        return JSON.parse(lines[i]);
      } catch (_) {
        // continue scanning
      }
    }
  }

  throw new Error("Could not parse JSON from scraper output.");
}

function safeFilenameFromUrl(url) {
  const u = new URL(url);
  const pathname = (u.pathname || "/").replace(/\/+$/g, "");
  const slug = pathname === "/" ? "home" : pathname.replace(/^\/+/, "").replace(/\//g, "--");
  return slug.replace(/[^a-zA-Z0-9-_]+/g, "-");
}

function safeSlugFromText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizeOptimizedResult(result) {
  if (typeof result === "string") return result;
  if (!result || typeof result !== "object") {
    throw new Error("pdpAgent returned an unsupported result type.");
  }

  if (typeof result.content === "string") return result.content;
  if (typeof result.optimizedContent === "string") return result.optimizedContent;
  if (typeof result.text === "string") return result.text;

  return JSON.stringify(result, null, 2);
}

function validatePdpOutput(content) {
  const text = String(content || "");
  const missingSections = REQUIRED_PDP_SECTIONS.filter((section) => !text.includes(section));
  const hasFaq = /FAQ/i.test(text);
  return {
    ok: missingSections.length === 0 && hasFaq,
    missingSections,
  };
}

function injectInternalLinksIntoContent(content, links) {
  const text = String(content || "");
  if (!Array.isArray(links) || links.length === 0) return text;

  const selected = links.slice(0, 4);
  const markdownLinks = selected
    .map((row) => `[${String(row.anchor || "related page").trim()}](${String(row.url || "").trim()})`)
    .filter(Boolean);

  if (markdownLinks.length === 0) return text;

  if (/<p[^>]*>/i.test(text)) {
    let index = 0;
    return text.replace(/<p[^>]*>([\s\S]*?)<\/p>/i, (match, group) => {
      const link = markdownLinks[index] || markdownLinks[0];
      index += 1;
      return `<p>${group} See also ${link}.</p>`;
    });
  }

  return `${text}\n\nCONTEXTUAL INTERNAL LINKS\n- ${markdownLinks.join("\n- ")}`;
}

function buildCostReport(metricsRows, reportMeta = {}) {
  const rows = Array.isArray(metricsRows) ? metricsRows : [];
  const totals = rows.reduce(
    (acc, row) => {
      acc.tokensIn += Number(row.tokensIn || 0);
      acc.tokensOut += Number(row.tokensOut || 0);
      acc.estimatedCostUsd += Number(row.estimatedCostUsd || 0);
      return acc;
    },
    { tokensIn: 0, tokensOut: 0, estimatedCostUsd: 0 }
  );

  return {
    generatedAt: new Date().toISOString(),
    ...reportMeta,
    pagesWithClaudeCalls: rows.length,
    totals: {
      tokensIn: totals.tokensIn,
      tokensOut: totals.tokensOut,
      estimatedCostUsd: Number(totals.estimatedCostUsd.toFixed(6)),
    },
    pages: rows,
  };
}

function checkpointDefault() {
  return {
    version: CHECKPOINT_VERSION,
    updatedAt: new Date().toISOString(),
    pages: {},
  };
}

function shouldProcessPageType(pageType, options = {}) {
  if (!options.pageTypeFilter) return true;
  return pageType === options.pageTypeFilter;
}

function shouldTreatAsProductPage(routePageType, options = {}) {
  if (options.forcePdp === true) return true;
  return routePageType === "pdp";
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

function formatPageAuditMarkdown(audit) {
  const lines = [];
  lines.push(`# Page Audit`);
  lines.push("");
  lines.push(`- URL: ${audit.url}`);
  lines.push(`- Page Type: ${audit.pageType}`);
  lines.push(`- Product Page: ${audit.productPage}`);
  lines.push(`- Word Count: ${audit.contentQuality?.wordCount || 0}`);
  lines.push(`- Thin Content: ${audit.contentQuality?.thinContent ? "yes" : "no"}`);
  lines.push(`- Internal Links: ${audit.internalLinks?.internalLinkCount || 0}`);
  lines.push(`- Orphan Risk: ${audit.internalLinks?.orphanPageRisk ? "yes" : "no"}`);
  lines.push(`- Prompt Version: ${audit.promptVersion || "unknown"}`);
  lines.push(`- Content Score: ${audit.contentScore?.score ?? "n/a"}`);
  lines.push("");
  lines.push(`## SERP Themes`);
  for (const theme of audit.serpInsights?.keywordThemes || []) lines.push(`- ${theme}`);
  lines.push("");
  lines.push(`## Keyword Clusters`);
  for (const cluster of audit.keywordClusters?.clusters || []) {
    lines.push(`- ${cluster.topic}: ${(cluster.keywords || []).join(", ")}`);
  }
  lines.push("");
  lines.push(`## Suggested Internal Links`);
  for (const link of audit.internalLinks?.contextualLinks || []) {
    lines.push(`- ${link.anchor}: ${link.url}`);
  }
  lines.push("");
  lines.push(`## Recommendations`);
  lines.push(audit.seoRecommendations || "No specialized recommendations generated.");
  return lines.join("\n");
}

function onePageOverviewFromSiteReport(report, strategy) {
  const lines = [];
  lines.push(`# SEO Optimization Overview`);
  lines.push("");
  lines.push(`- Base URL: ${report.baseUrl}`);
  lines.push(`- Generated At: ${report.generatedAt}`);
  lines.push(`- Total URLs Discovered: ${report.totalUrlsDiscovered}`);
  lines.push(`- Pages Audited: ${report.pagesAudited}`);
  lines.push(`- Pages Skipped: ${report.pagesSkipped}`);
  lines.push(`- Product Pages Detected: ${report.productPagesDetected}`);
  lines.push(`- Product Pages Optimized: ${report.productPagesOptimized}`);
  lines.push(`- Errors: ${report.errors.length}`);
  lines.push("");
  lines.push(`## Site Strategy Summary`);
  lines.push(`- Page Types: ${JSON.stringify(strategy.summary.pageTypes)}`);
  lines.push(`- Thin Pages: ${strategy.summary.thinPages}`);
  lines.push(`- Weak Internal Link Pages: ${strategy.summary.weakInternalLinkPages}`);
  lines.push(`- Missing Meta Pages: ${strategy.summary.missingMetaPages}`);
  lines.push(`- SERP Analyzed Pages: ${strategy.summary.serpAnalyzedPages}`);
  lines.push(`- Keyword Clustered Pages: ${strategy.summary.keywordClusteredPages}`);
  lines.push(`- Internal Link Recommendations: ${strategy.summary.internalLinkRecommendations}`);
  lines.push(`- Estimated Claude Cost (USD): ${report.costReport?.totals?.estimatedCostUsd || 0}`);
  lines.push("");
  lines.push(`## Keyword Gaps`);
  for (const gap of strategy.keywordGaps.slice(0, 10)) {
    lines.push(`- ${gap.url} [${gap.topic}]: ${(gap.missingKeywords || []).join(", ")}`);
  }
  lines.push("");
  lines.push(`## Recommended Blog Topics`);
  for (const topic of strategy.recommendedBlogTopics.slice(0, 10)) lines.push(`- ${topic}`);
  lines.push("");
  return lines.join("\n");
}

async function runScraper(url) {
  const scraperPath = path.join(__dirname, "scraper.js");
  const { stdout } = await execFileAsync("node", [scraperPath, url], {
    maxBuffer: 20 * 1024 * 1024,
  });
  return tryParseJson(stdout);
}

async function runScraperWithRetry(url, retries = SCRAPER_RETRIES) {
  let lastErr = null;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await runScraper(url);
    } catch (err) {
      lastErr = err;
      if (!isRetryableError(err) || attempt === retries) break;
      await sleep(backoffMs(attempt));
    }
  }
  throw lastErr || new Error("Scraper failed");
}

async function runPdpAgent(_scrapedData, context) {
  const pdpPath = path.join(__dirname, "pdpAgent.js");
  if (!fs.existsSync(pdpPath)) {
    throw new Error(`Missing pdpAgent.js at ${pdpPath}`);
  }

  const env = {
    ...process.env,
    SCRAPED_DATA_PATH: context.scrapedPath,
  };
  if (context.metricsPath) env.PDP_METRICS_PATH = context.metricsPath;
  if (context.extraPrompt) env.EXTRA_PROMPT = context.extraPrompt;

  const { stdout } = await execFileAsync("node", [pdpPath, context.url, context.scrapedPath], {
    maxBuffer: 20 * 1024 * 1024,
    env,
  });

  const cliOutput = (stdout || "").trim();
  if (!cliOutput) throw new Error("pdpAgent.js returned empty output.");
  return normalizeOptimizedResult(cliOutput);
}

async function runPdpAgentWithRetry(scrapedData, context, retryOptions = PDP_RETRIES) {
  const maxAttempts = typeof retryOptions === "number"
    ? retryOptions
    : Number(retryOptions?.maxAttempts || PDP_RETRIES);

  const { result, retryMeta } = await runWithRetry(
    () => runPdpAgent(scrapedData, context),
    {
      maxAttempts,
      baseBackoffMs: BASE_BACKOFF_MS,
      isRetryable: (err) => {
        if (isRetryableError(err)) return true;
        return String(err?.message || "").includes("empty output");
      },
      retryReason: "low_score",
    }
  );

  if (context && typeof context === "object") {
    context.retryMeta = retryMeta;
  }

  return result;
}

async function runDocsAgent(content, docTitle, options = {}) {
  const sendToGoogleDoc = require("./docsAgent.js");
  return sendToGoogleDoc(content, docTitle, options);
}

async function runSinglePageAudit(url) {
  ensureOutputDir();
  const runId = `single-${Date.now()}`;
  const result = await runPagePipeline(url, {
    runId,
    baseUrl: new URL(url).origin,
    outputDir: OUTPUT_DIR,
    mode: "optimize",
    options: {
      forcePdp: true,
      sendDocs: true,
      resume: false,
    },
    sharedCache: {},
    services: {
      sitePages: [url],
    },
  });

  return {
    url,
    createdAt: new Date().toISOString(),
    runId,
    result,
    outputDir: OUTPUT_DIR,
  };
}

async function runFullSiteAudit(baseUrl, options = {}) {
  ensureOutputDir();
  fs.mkdirSync(SITE_AUDITS_DIR, { recursive: true });

  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const root = new URL(normalizedBaseUrl);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  const rootOutput = path.resolve(options.outputDir || path.join(OUTPUT_DIR, "site"));
  const datasetDir = path.join(rootOutput, "dataset");
  const auditsDir = path.join(rootOutput, "audits");
  const optimizedDir = path.join(rootOutput, "optimized");
  const schemasDir = path.join(rootOutput, "schemas");
  const logsDir = path.join(rootOutput, "logs");
  const evalsDir = path.join(rootOutput, "evals");
  const runsDataDir = path.join(rootOutput, "runs");
  const serpDatasetDir = path.join(datasetDir, "serp");
  const keywordDatasetDir = path.join(datasetDir, "keyword-clusters");
  const linkMapDatasetDir = path.join(datasetDir, "link-map");
  const cacheDir = path.join(rootOutput, "cache");
  const cacheSerpDir = path.join(cacheDir, "serp");
  const cachePdpDir = path.join(cacheDir, "pdp");

  for (const dir of [datasetDir, auditsDir, optimizedDir, schemasDir, logsDir, evalsDir, runsDataDir, serpDatasetDir, keywordDatasetDir, linkMapDatasetDir, cacheDir, cacheSerpDir, cachePdpDir]) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const runDir = path.join(auditsDir, `${root.hostname}-${timestamp}`);
  const pagesDir = path.join(runDir, "pages");
  fs.mkdirSync(pagesDir, { recursive: true });

  const logger = createLogger({ logFile: path.join(logsDir, `${root.hostname}-${timestamp}.jsonl`) });
  const promptMeta = readPromptMetadata();
  logger.info("audit.start", {
    agent: "masterAgent",
    baseUrl: normalizedBaseUrl,
    concurrency: options.concurrency || DEFAULT_PAGE_CONCURRENCY,
    promptVersion: promptMeta.promptVersion,
    templateVersion: promptMeta.templateVersion,
    model: promptMeta.model,
    mode: {
      pageTypeFilter: options.pageTypeFilter || null,
      changedOnly: options.changedOnly === true,
      maxPages: options.maxPages || null,
    },
  });

  const dbPath = path.join(runsDataDir, "platform.db");
  let db = null;
  let repo = null;
  let runRecord = null;
  let siteRecord = null;
  try {
    db = openDatabase(dbPath);
    initSchema(db);
    repo = createRepository(db);
    const project = repo.ensureProject(options.projectName || "default");
    siteRecord = repo.ensureSite(project.id, normalizedBaseUrl, {
      outputDir: rootOutput,
      concurrency: options.concurrency || DEFAULT_PAGE_CONCURRENCY,
    });
    runRecord = repo.createRun(siteRecord.id, {
      mode: options.pageTypeFilter || "full",
      promptVersion: promptMeta.promptVersion,
      templateVersion: promptMeta.templateVersion,
      model: promptMeta.model,
      status: "running",
    });
  } catch (err) {
    logger.warn("db.init.failed", { agent: "masterAgent", message: err?.message || String(err) });
  }

  const docsFolderPath = `Site Audits/${root.hostname}/${timestamp}`;

  let urls = [];
  let discoveryMethod = "sitemap";

  if (Array.isArray(options.urlList) && options.urlList.length > 0) {
    urls = options.urlList.map((u) => String(u || "").trim()).filter(Boolean);
    discoveryMethod = "url-list";
  } else {
    urls = await crawlSitemap(normalizedBaseUrl);
    if (urls.length === 0) {
      urls = await crawlInternalLinks(normalizedBaseUrl);
      discoveryMethod = "crawl";
    }
  }

  let uniqueUrls = Array.from(new Set(urls)).filter((u) => !shouldSkipForSiteAudit(u));
  if (options.maxPages && Number(options.maxPages) > 0) {
    uniqueUrls = uniqueUrls.slice(0, Number(options.maxPages));
  }

  const pageConcurrency = Math.max(1, Number(options.concurrency || DEFAULT_PAGE_CONCURRENCY));

  const checkpointPath = path.join(datasetDir, "checkpoint.json");
  const checkpoint = readJsonSafe(checkpointPath, checkpointDefault());
  if (!checkpoint.pages || typeof checkpoint.pages !== "object") checkpoint.pages = {};

  function saveCheckpoint() {
    checkpoint.updatedAt = new Date().toISOString();
    writeJson(checkpointPath, checkpoint);
  }

  const initialPageTypes = {};
  for (const u of uniqueUrls) {
    initialPageTypes[u] = routePage({ url: u, headings: [], title: "", visibleText: "" }).pageType;
  }

  const initialLinkPlan = buildInternalLinkPlan({
    allPages: uniqueUrls,
    pageTypes: initialPageTypes,
    productEntities: {},
    categories: {},
    internalLinks: {},
  });
  writeJson(path.join(linkMapDatasetDir, "internal-link-map.initial.json"), initialLinkPlan);

  const linkSuggestionsBySource = (initialLinkPlan.linkMap || []).reduce((acc, row) => {
    const source = row.sourcePage;
    if (!acc[source]) acc[source] = [];
    acc[source].push({ anchor: row.anchor, url: row.targetPage });
    return acc;
  }, {});

  const pageAudits = [];
  const errors = [];
  const serpPatterns = {};
  const keywordClusters = {};
  const serpIntelByEntity = new Map();
  const serpIntelPromiseByEntity = new Map();
  const pageTypes = { ...initialPageTypes };
  const productEntities = {};
  const pageInternalLinks = {};
  const pdpMetricsRows = [];
  let pagesSkipped = 0;
  let productPagesDetected = 0;
  let productPagesOptimized = 0;

  await mapWithConcurrency(uniqueUrls, pageConcurrency, async (url, index) => {
    const pageSlug = safeFilenameFromUrl(url);
    const optimizedPath = path.join(optimizedDir, `${pageSlug}.optimized.html`);
    const auditMdPath = path.join(auditsDir, `${pageSlug}.audit.md`);
    const schemaPath = path.join(schemasDir, `${pageSlug}.schema.json`);
    const datasetPath = path.join(datasetDir, `${pageSlug}.dataset.json`);
    const serpPath = path.join(serpDatasetDir, `${pageSlug}.serp.json`);
    const keywordsPath = path.join(keywordDatasetDir, `${pageSlug}.keywords.json`);
    const scorePath = path.join(evalsDir, `${pageSlug}.score.json`);
    const pdpMetricsPath = path.join(cachePdpDir, `${pageSlug}.metrics.json`);

    checkpoint.pages[url] = {
      ...(checkpoint.pages[url] || {}),
      status: "running",
      runAt: new Date().toISOString(),
    };
    saveCheckpoint();

    if (fs.existsSync(optimizedPath) && options.changedOnly !== true) {
      pagesSkipped += 1;
      checkpoint.pages[url] = {
        ...(checkpoint.pages[url] || {}),
        status: "done",
        skipped: true,
        reason: "optimized_exists",
      };
      saveCheckpoint();
      logger.info("page.skip", { agent: "masterAgent", url, reason: "optimized_exists" });
      console.log(`[SKIP] ${url} already processed`);
      return;
    }

    console.log(`[${index + 1}/${uniqueUrls.length}] auditing ${url}`);
    const t0 = Date.now();

    try {
      const scrapedData = await runScraperWithRetry(url);

      const contentHash = hashObject({
        title: scrapedData.title,
        metaDescription: scrapedData.metaDescription,
        first1500Words: scrapedData.first1500Words,
        headings: scrapedData.headings,
      });

      let pageRecord = null;
      let snapshotId = null;
      if (repo && runRecord && siteRecord) {
        pageRecord = repo.ensurePage(siteRecord.id, url, url);
        const latestSnapshot = repo.getLatestSnapshotByPage(pageRecord.id);
        if (
          latestSnapshot &&
          latestSnapshot.content_hash === contentHash &&
          fs.existsSync(optimizedPath)
        ) {
          snapshotId = repo.createSnapshot(pageRecord.id, runRecord.id, {
            contentHash,
            datasetPath: datasetPath,
            status: "unchanged",
          });
          repo.addArtifact(snapshotId, "optimized", optimizedPath);
          pagesSkipped += 1;
          checkpoint.pages[url] = {
            ...(checkpoint.pages[url] || {}),
            status: "done",
            skipped: true,
            reason: "unchanged_db_hash",
            lastContentHash: contentHash,
          };
          saveCheckpoint();
          logger.info("page.skip", { agent: "masterAgent", url, reason: "unchanged_db_hash" });
          console.log(`[SKIP] ${url} unchanged (db)`); 
          return;
        }
        snapshotId = repo.createSnapshot(pageRecord.id, runRecord.id, {
          contentHash,
          datasetPath: datasetPath,
          status: "processing",
        });
      }

      if (
        options.changedOnly === true &&
        fs.existsSync(optimizedPath) &&
        checkpoint.pages[url]?.lastContentHash === contentHash
      ) {
        pagesSkipped += 1;
        checkpoint.pages[url] = {
          ...(checkpoint.pages[url] || {}),
          status: "done",
          skipped: true,
          reason: "unchanged_content_hash",
          lastContentHash: contentHash,
        };
        saveCheckpoint();
        logger.info("page.skip", { agent: "masterAgent", url, reason: "unchanged_content_hash" });
        console.log(`[SKIP] ${url} unchanged`);
        if (repo && snapshotId) {
          repo.updateSnapshotMetrics(snapshotId, { status: "unchanged" });
          repo.addArtifact(snapshotId, "optimized", optimizedPath);
        }
        return;
      }

      const route = routePage({
        url,
        title: scrapedData.title,
        headings: scrapedData.headings,
        visibleText: scrapedData.first1500Words,
      });

      if (!shouldProcessPageType(route.pageType, options)) {
        pagesSkipped += 1;
        checkpoint.pages[url] = {
          ...(checkpoint.pages[url] || {}),
          status: "done",
          skipped: true,
          reason: `filtered_${route.pageType}`,
          lastContentHash: contentHash,
        };
        saveCheckpoint();
        logger.info("page.skip", { agent: "masterAgent", url, reason: `filtered_${route.pageType}` });
        return;
      }

      pageTypes[url] = route.pageType;
      productEntities[url] = scrapedData.productEntity || "";

      const entityKey = safeSlugFromText(scrapedData.productEntity || route.pageType || "generic");
      let serpInsights = serpIntelByEntity.get(entityKey) || null;
      if (!serpInsights) {
        if (!serpIntelPromiseByEntity.has(entityKey)) {
          const serpDatasetPath = path.join(serpDatasetDir, `${entityKey || "generic"}.json`);
          const serpPromise = runSerpIntel(
            {
              query: scrapedData.productEntity || scrapedData.title || url,
              productEntity: scrapedData.productEntity || scrapedData.title || "",
              pageType: route.pageType,
              url,
              headings: scrapedData.headings,
              first1500Words: scrapedData.first1500Words,
            },
            {
              cacheDir: cacheSerpDir,
              datasetDir: serpDatasetDir,
            }
          ).then(async (intel) => {
            await writeJsonAsync(serpDatasetPath, intel);
            const normalized = {
              query: intel.query,
              keywordThemes: (intel.semanticPhrases || []).slice(0, 24),
              commonHeadings: intel.headingPatterns || [],
              avgWordCount: intel.averageWordCount || 0,
              faqPatterns: intel.faqPatterns || [],
              relatedEntities: intel.entityCoverage || [],
              schemaTypes: intel.schemaTypes || [],
              topUrls: intel.topUrls || [],
            };
            serpIntelByEntity.set(entityKey, normalized);
            return normalized;
          });
          serpIntelPromiseByEntity.set(entityKey, serpPromise);
        }
        serpInsights = await serpIntelPromiseByEntity.get(entityKey);
      }
      serpPatterns[url] = serpInsights;
      await writeJsonAsync(serpPath, serpInsights);

      const keywordCluster = buildKeywordClusters({
        productEntity: scrapedData.productEntity,
        serpKeywordThemes: serpInsights.keywordThemes,
        headings: scrapedData.headings,
        url,
      });
      keywordClusters[url] = keywordCluster;
      await writeJsonAsync(keywordsPath, keywordCluster);

      const plannerLinks = linkSuggestionsBySource[url] || [];

      const internalLinks = await analyzeInternalLinks({
        url,
        productEntity: scrapedData.productEntity,
        pageType: route.pageType,
        existingContent: scrapedData.html || scrapedData.first1500Words || "",
        sitePages: uniqueUrls,
      });

      const mergedInternalSuggestions = [];
      const seenAnchors = new Set();
      for (const row of [...(plannerLinks || []), ...(internalLinks.contextualLinks || [])]) {
        const anchor = String(row.anchor || "").toLowerCase();
        if (!anchor || seenAnchors.has(anchor)) continue;
        seenAnchors.add(anchor);
        mergedInternalSuggestions.push(row);
        if (mergedInternalSuggestions.length >= 5) break;
      }
      internalLinks.contextualLinks = mergedInternalSuggestions;
      pageInternalLinks[url] = internalLinks.internalLinks || [];

      const enrichedScrapedData = {
        ...scrapedData,
        serpInsights,
        keywordClusters: keywordCluster,
        internalLinkSuggestions: mergedInternalSuggestions,
        promptVersion: "2026-03-04.v2",
        templateVersion: "site-template.v2",
      };

      await writeJsonAsync(datasetPath, enrichedScrapedData);

      let seoRecommendations = "";
      let optimizedHtml = "";
      let retryReason = null;
      let optimizationAttemptCount = 0;
      let retryMetadata = null;
      const productPage = shouldTreatAsProductPage(route.pageType, options);

      if (productPage) {
        productPagesDetected += 1;
        const pdpCacheKey = `${pageSlug}-${contentHash}-${PDP_CACHE_VERSION}.json`;
        const pdpCachePath = path.join(cachePdpDir, pdpCacheKey);
        const cachedPdp = await readJsonSafeAsync(pdpCachePath, null);

        if (cachedPdp && typeof cachedPdp.optimizedContent === "string") {
          seoRecommendations = cachedPdp.optimizedContent;
          retryReason = cachedPdp.retryReason || null;
          optimizationAttemptCount = Number(cachedPdp.optimizationAttemptCount || 1);
          retryMetadata = cachedPdp.retryMetadata || buildRetryMeta(optimizationAttemptCount, retryReason);
          const m = cachedPdp.metrics || {};
          if (m.model) {
            pdpMetricsRows.push({
              url,
              model: m.model,
              tokensIn: Number(m.usage?.input_tokens || 0),
              tokensOut: Number(m.usage?.output_tokens || 0),
              estimatedCostUsd: estimateModelCost(m.model, m.usage?.input_tokens || 0, m.usage?.output_tokens || 0),
              cached: true,
            });
          }
          optimizationAttemptCount = 1;
        } else {
          for (let attempt = 1; attempt <= MAX_OPTIMIZATION_ATTEMPTS; attempt += 1) {
            optimizationAttemptCount = attempt;
            const retryPrompt =
              attempt === 1 || !retryReason
                ? undefined
                : `Retry reason: ${retryReason}. Fix this only and preserve existing good sections.`;

            const pdpRunContext = {
              url,
              outputDir: pagesDir,
              scrapedPath: datasetPath,
              optimizedPath,
              prefix: `${root.hostname}-${pageSlug}-${timestamp}`,
              metricsPath: pdpMetricsPath,
              extraPrompt: retryPrompt,
            };

            seoRecommendations = await runPdpAgentWithRetry(
              enrichedScrapedData,
              pdpRunContext,
              { maxAttempts: 1 }
            );
            retryMetadata = pdpRunContext.retryMeta || buildRetryMeta(attempt, retryReason);

            seoRecommendations = injectInternalLinksIntoContent(seoRecommendations, mergedInternalSuggestions);
            const schemaCandidate = runSchemaAgent({
              url,
              pageType: "pdp",
              scrapedData: enrichedScrapedData,
              optimizedContent: seoRecommendations,
            });
            const scoreCandidate = scoreContent({
              url,
              optimizedContent: seoRecommendations,
              serpIntel: serpInsights,
              schemaPresent: !!schemaCandidate,
            });
            const evalCandidate = evaluatePdpOutput({
              optimizedContent: seoRecommendations,
              schema: schemaCandidate,
              productEntity: enrichedScrapedData.productEntity,
            });
            const sectionQuality = validatePdpOutput(seoRecommendations);
            const needsRetry =
              attempt < MAX_OPTIMIZATION_ATTEMPTS &&
              (!sectionQuality.ok || scoreCandidate.score < 85 || evalCandidate.retry);

            if (!needsRetry) break;

            if (!sectionQuality.ok) {
              retryReason = "missing_sections";
            } else if (scoreCandidate.missingEntities?.length) {
              retryReason = "missing_entities";
            } else if (scoreCandidate.missingHeadings?.length) {
              retryReason = "missing_headings";
            } else {
              retryReason = "low_score";
            }

            logger.metric("masterAgent.retry", {
              url,
              attempt,
              retryReason,
              queueDepthHTTP: require("./utils/rateLimiter").limitHTTP.stats().queued,
              queueDepthClaude: require("./utils/rateLimiter").limitClaude.stats().queued,
            });
          }

          const metrics = await readJsonSafeAsync(pdpMetricsPath, null);
          if (metrics && metrics.model) {
            pdpMetricsRows.push({
              url,
              model: metrics.model,
              tokensIn: Number(metrics.usage?.input_tokens || 0),
              tokensOut: Number(metrics.usage?.output_tokens || 0),
              estimatedCostUsd: estimateModelCost(
                metrics.model,
                Number(metrics.usage?.input_tokens || 0),
                Number(metrics.usage?.output_tokens || 0)
              ),
              cached: false,
            });
          }

          await writeJsonAsync(pdpCachePath, {
            optimizedContent: seoRecommendations,
            metrics: metrics || null,
            optimizationAttemptCount,
            retryReason,
            retryMetadata: retryMetadata || buildRetryMeta(optimizationAttemptCount, retryReason),
            cacheVersion: PDP_CACHE_VERSION,
          });
        }

        optimizedHtml = seoRecommendations;
        productPagesOptimized += 1;

        await runDocsAgent(seoRecommendations, `PDP Optimization - ${root.hostname} - ${pageSlug}`, {
          folderPath: docsFolderPath,
        });
      } else if (route.pageType === "category") {
        const result = await runCategoryAgent({
          url,
          scrapedData: enrichedScrapedData,
          internalLinks,
          serpInsights,
          keywordCluster,
        });
        seoRecommendations = result.suggestions.join(" ");
        optimizedHtml = injectInternalLinksIntoContent(result.optimizedHtml, mergedInternalSuggestions);
      } else if (route.pageType === "blog") {
        const result = await runBlogAgent({
          url,
          scrapedData: enrichedScrapedData,
          internalLinks,
          serpInsights,
          keywordCluster,
        });
        seoRecommendations = result.suggestions.join(" ");
        optimizedHtml = injectInternalLinksIntoContent(result.optimizedHtml, mergedInternalSuggestions);
      } else {
        seoRecommendations = "No specialized optimization agent applied for this page type.";
        optimizedHtml = `<p>${seoRecommendations}</p>`;
      }

      const schema = runSchemaAgent({
        url,
        pageType: productPage ? "pdp" : route.pageType,
        scrapedData: enrichedScrapedData,
        optimizedContent: optimizedHtml,
      });

      let evalResult = null;
      let contentScore = null;
      if (productPage) {
        contentScore = scoreContent({
          url,
          optimizedContent: optimizedHtml,
          serpIntel: serpInsights,
          schemaPresent: !!schema,
        });

        evalResult = evaluatePdpOutput({
          optimizedContent: optimizedHtml,
          schema,
          productEntity: enrichedScrapedData.productEntity,
        });
      }

      const technicalSEO = await analyzeTechnicalSeo(
        url,
        enrichedScrapedData.html || enrichedScrapedData.first1500Words || ""
      );
      const contentQuality = analyzeContentQuality(enrichedScrapedData.first1500Words || "", enrichedScrapedData.headings);

      await fsp.writeFile(optimizedPath, optimizedHtml, "utf-8");
      await writeJsonAsync(
        schemaPath,
        withArtifactMetadata(
          { data: schema },
          {
            producer: "schemaAgent",
            runId: String(runRecord?.id || ""),
            promptVersion: promptMeta.promptVersion,
            model: promptMeta.model,
          }
        )
      );
      const evalPath = path.join(evalsDir, `${pageSlug}.eval.json`);
      if (evalResult) {
        await writeJsonAsync(
          evalPath,
          withArtifactMetadata(
            { data: evalResult },
            {
              producer: "evaluatePdpOutput",
              runId: String(runRecord?.id || ""),
              promptVersion: promptMeta.promptVersion,
              model: promptMeta.model,
            }
          )
        );
      }
      if (contentScore) {
        await writeJsonAsync(
          scorePath,
          withArtifactMetadata(
            { data: contentScore },
            {
              producer: "contentScorer",
              runId: String(runRecord?.id || ""),
              promptVersion: promptMeta.promptVersion,
              model: promptMeta.model,
            }
          )
        );
      }

      const pageAudit = {
        url,
        pageType: route.pageType,
        productPage,
        promptVersion: enrichedScrapedData.promptVersion,
        templateVersion: enrichedScrapedData.templateVersion,
        serpInsights,
        keywordClusters: keywordCluster,
        technicalSEO,
        internalLinks,
        contentQuality,
        headings: enrichedScrapedData.headings,
        evaluation: evalResult,
        contentScore,
        optimizationAttemptCount,
        retryReason,
        retryMetadata: retryMetadata || buildRetryMeta(optimizationAttemptCount || 1, retryReason),
        seoRecommendations,
      };

      pageAudits.push(pageAudit);
      await writeJsonAsync(
        path.join(pagesDir, `${pageSlug}.audit.json`),
        withArtifactMetadata(
          { data: pageAudit },
          {
            producer: "masterAgent",
            runId: String(runRecord?.id || ""),
            promptVersion: promptMeta.promptVersion,
            model: promptMeta.model,
          }
        )
      );
      await fsp.writeFile(auditMdPath, formatPageAuditMarkdown(pageAudit), "utf-8");

      checkpoint.pages[url] = {
        ...(checkpoint.pages[url] || {}),
        status: "done",
        skipped: false,
        outputPath: optimizedPath,
        evalPath: evalResult ? evalPath : null,
        scorePath: contentScore ? scorePath : null,
        optimizationAttemptCount,
        retryReason,
        retryMetadata: retryMetadata || buildRetryMeta(optimizationAttemptCount || 1, retryReason),
        lastContentHash: contentHash,
        lastRunAt: new Date().toISOString(),
      };
      saveCheckpoint();

      if (repo && snapshotId) {
        const metrics = await readJsonSafeAsync(pdpMetricsPath, null);
        repo.updateSnapshotMetrics(snapshotId, {
          tokensIn: metrics?.usage?.input_tokens || null,
          tokensOut: metrics?.usage?.output_tokens || null,
          costUsd:
            metrics && metrics.model
              ? estimateModelCost(metrics.model, metrics?.usage?.input_tokens || 0, metrics?.usage?.output_tokens || 0)
              : null,
          status: evalResult && evalResult.score < 85 ? "low_score" : "completed",
        });
        repo.addArtifact(snapshotId, "dataset", datasetPath);
        repo.addArtifact(snapshotId, "optimized", optimizedPath);
        repo.addArtifact(snapshotId, "schema", schemaPath);
        if (evalResult) repo.addArtifact(snapshotId, "eval", evalPath);
        if (contentScore) repo.addArtifact(snapshotId, "score", scorePath);
      }

      logger.metric("masterAgent", {
        url,
        pageType: route.pageType,
        durationMs: Date.now() - t0,
      });
    } catch (err) {
      errors.push({ url, error: err?.message || String(err) });
      checkpoint.pages[url] = {
        ...(checkpoint.pages[url] || {}),
        status: "failed",
        error: err?.message || String(err),
        failedAt: new Date().toISOString(),
      };
      saveCheckpoint();
      if (repo && runRecord && siteRecord) {
        try {
          const pageRecord = repo.ensurePage(siteRecord.id, url, url);
          const failedSnapshotId = repo.createSnapshot(pageRecord.id, runRecord.id, {
            contentHash: checkpoint.pages[url]?.lastContentHash || "",
            datasetPath,
            status: "failed",
            error: err?.message || String(err),
          });
          repo.updateSnapshotMetrics(failedSnapshotId, {
            status: "failed",
            error: err?.message || String(err),
          });
        } catch (_) {
          // ignore db failure path
        }
      }
      logger.error("page.error", { agent: "masterAgent", url, message: err?.message || String(err) });
    }
  });

  const finalLinkGraph = buildInternalLinkPlan({
    allPages: uniqueUrls,
    productEntities,
    categories: pageTypes,
    internalLinks: pageInternalLinks,
    pageTypes,
  });
  writeJson(path.join(linkMapDatasetDir, "internal-link-map.json"), finalLinkGraph);

  const costReport = buildCostReport(pdpMetricsRows, {
    baseUrl: normalizedBaseUrl,
    domain: root.hostname,
  });
  writeJson(path.join(runDir, "cost-report.json"), costReport);
  writeJson(path.join(datasetDir, "cost-report.latest.json"), costReport);

  const report = {
    baseUrl: normalizedBaseUrl,
    domain: root.hostname,
    generatedAt: new Date().toISOString(),
    discoveryMethod,
    totalUrlsDiscovered: uniqueUrls.length,
    pagesAudited: pageAudits.length,
    pagesSkipped,
    productPagesDetected,
    productPagesOptimized,
    errors,
    pageAudits,
    costReport,
  };

  const reportPath = path.join(runDir, "full-site-audit.json");
  writeJson(reportPath, report);

  const siteStrategy = buildSiteStrategy({
    pageAudits,
    sitePages: uniqueUrls,
    serpPatterns,
    keywordClusters,
    internalLinkGraph: finalLinkGraph,
  });
  const strategyPath = path.join(runDir, "site-strategy.json");
  writeJson(strategyPath, siteStrategy);

  const overview = onePageOverviewFromSiteReport(report, siteStrategy);
  const markdownPath = path.join(runDir, "seo-overview.md");
  fs.writeFileSync(markdownPath, overview, "utf-8");

  const summaryDoc = await runDocsAgent(
    overview,
    `SEO Optimization Overview - ${root.hostname} - ${timestamp}`,
    { folderPath: docsFolderPath }
  );

  if (repo && runRecord) {
    try {
      repo.finishRun(runRecord.id, {
        status: errors.length > 0 ? "completed_with_errors" : "completed",
        mode: options.pageTypeFilter || "full",
        promptVersion: promptMeta.promptVersion,
        templateVersion: promptMeta.templateVersion,
        model: promptMeta.model,
      });
    } catch (err) {
      logger.warn("db.run.finish.failed", { agent: "masterAgent", message: err?.message || String(err) });
    }
  }

  const runHistoryPath = path.join(runsDataDir, `run-${timestamp}.json`);
  writeJson(runHistoryPath, {
    baseUrl: normalizedBaseUrl,
    runDir,
    reportPath,
    strategyPath,
    costReportPath: path.join(runDir, "cost-report.json"),
    promptVersion: promptMeta.promptVersion,
    templateVersion: promptMeta.templateVersion,
    model: promptMeta.model,
    runId: runRecord?.id || null,
    generatedAt: new Date().toISOString(),
  });

  logger.info("audit.complete", {
    agent: "masterAgent",
    pagesAudited: report.pagesAudited,
    pagesSkipped: report.pagesSkipped,
    errors: report.errors.length,
    estimatedCostUsd: report.costReport.totals.estimatedCostUsd,
  });

  if (db) {
    try {
      db.close();
    } catch (_) {
      // no-op
    }
  }

  return {
    ...report,
    reportPath,
    markdownPath,
    runDir,
    docsFolderPath,
    summaryDoc,
    output: {
      rootOutput,
      datasetDir,
      auditsDir,
      optimizedDir,
      schemasDir,
      logsDir,
      evalsDir,
      runsDataDir,
      serpDatasetDir,
      keywordDatasetDir,
      linkMapDatasetDir,
      checkpointPath,
      dbPath,
    },
  };
}

async function main() {
  const url = process.argv[2];

  if (!url) {
    console.error("Usage: node masterAgent.js <url>");
    process.exit(1);
  }

  await runSinglePageAudit(url);
}

module.exports = {
  runScraper,
  runScraperWithRetry,
  runPdpAgent,
  runPdpAgentWithRetry,
  runDocsAgent,
  runSinglePageAudit,
  runFullSiteAudit,
  validatePdpOutput,
  injectInternalLinksIntoContent,
};

if (require.main === module) {
  main().catch((err) => {
    console.error("MASTER error:", err?.message || err);
    process.exit(1);
  });
}





