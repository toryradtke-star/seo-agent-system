const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const { normalizeBaseUrl, crawlSitemap, crawlInternalLinks, shouldSkipForSiteAudit } = require("../siteCrawlerAgent");
const routePage = require("../pageRouterAgent");
const analyzeSerp = require("../serpAnalysisAgent");
const buildKeywordClusters = require("../keywordClusterAgent");
const analyzeInternalLinks = require("../internalLinkAgent");
const analyzeTechnicalSeo = require("../technicalSeoAgent");
const analyzeContentQuality = require("../contentQualityAgent");
const runSchemaAgent = require("../schemaAgent");
const buildSiteStrategy = require("../siteStrategistAgent");
const buildInternalLinkPlan = require("../internalLinkPlanner");
const evaluatePdpOutput = require("../evals/evaluatePdpOutput");
const {
  runScraperWithRetry,
  runPdpAgentWithRetry,
  runDocsAgent,
  injectInternalLinksIntoContent,
} = require("../masterAgent");

function safeFilenameFromUrl(url) {
  const u = new URL(url);
  const pathname = (u.pathname || "/").replace(/\/+$/g, "");
  const slug = pathname === "/" ? "home" : pathname.replace(/^\/+/, "").replace(/\//g, "--");
  return slug.replace(/[^a-zA-Z0-9-_]+/g, "-");
}

async function readJsonSafe(filePath, fallback) {
  try {
    return JSON.parse(await fsp.readFile(filePath, "utf-8"));
  } catch (_) {
    return fallback;
  }
}

async function writeJson(filePath, data) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  await fsp.writeFile(tmpPath, JSON.stringify(data, null, 2), "utf-8");
  await fsp.rename(tmpPath, filePath);
}

function makeRunId(seed = "") {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  return `${seed || "run"}-${ts}`;
}

function getRunPaths(baseOutput, runId) {
  const rootOutput = path.resolve(baseOutput || "output/site");
  const datasetDir = path.join(rootOutput, "dataset");
  const auditsDir = path.join(rootOutput, "audits");
  const optimizedDir = path.join(rootOutput, "optimized");
  const schemasDir = path.join(rootOutput, "schemas");
  const logsDir = path.join(rootOutput, "logs");
  const evalsDir = path.join(rootOutput, "evals");
  const runsDir = path.join(rootOutput, "runs");
  const serpDatasetDir = path.join(datasetDir, "serp");
  const keywordDatasetDir = path.join(datasetDir, "keyword-clusters");
  const linkMapDatasetDir = path.join(datasetDir, "link-map");

  for (const dir of [
    rootOutput,
    datasetDir,
    auditsDir,
    optimizedDir,
    schemasDir,
    logsDir,
    evalsDir,
    runsDir,
    serpDatasetDir,
    keywordDatasetDir,
    linkMapDatasetDir,
  ]) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const runDir = path.join(auditsDir, runId);
  fs.mkdirSync(runDir, { recursive: true });

  return {
    rootOutput,
    datasetDir,
    auditsDir,
    optimizedDir,
    schemasDir,
    logsDir,
    evalsDir,
    runsDir,
    serpDatasetDir,
    keywordDatasetDir,
    linkMapDatasetDir,
    runDir,
    statePath: path.join(runsDir, `${runId}.state.json`),
  };
}

async function initRunState(paths, payload) {
  const state = {
    runId: payload.runId,
    baseUrl: payload.baseUrl,
    createdAt: new Date().toISOString(),
    status: "running",
    total: payload.total || 0,
    completed: 0,
    failed: 0,
    pages: {},
    pageAudits: [],
    queuedFinal: false,
    options: payload.options || {},
    docsFolderPath: payload.docsFolderPath || "",
    uniqueUrls: payload.uniqueUrls || [],
  };
  await writeJson(paths.statePath, state);
  return state;
}

async function readRunState(paths) {
  return readJsonSafe(paths.statePath, {
    total: 0,
    completed: 0,
    failed: 0,
    pages: {},
    pageAudits: [],
    queuedFinal: false,
    uniqueUrls: [],
    options: {},
  });
}

async function updateRunState(paths, mutate) {
  const state = await readRunState(paths);
  mutate(state);
  state.updatedAt = new Date().toISOString();
  await writeJson(paths.statePath, state);
  return state;
}

async function discoverUrls(baseUrl, options = {}) {
  const normalized = normalizeBaseUrl(baseUrl);
  let urls = [];
  let discoveryMethod = "sitemap";

  if (Array.isArray(options.urlList) && options.urlList.length > 0) {
    urls = options.urlList;
    discoveryMethod = "url-list";
  } else {
    urls = await crawlSitemap(normalized);
    if (urls.length === 0) {
      urls = await crawlInternalLinks(normalized);
      discoveryMethod = "crawl";
    }
  }

  let uniqueUrls = Array.from(new Set(urls)).filter((u) => !shouldSkipForSiteAudit(u));
  if (Number(options.maxPages || 0) > 0) {
    uniqueUrls = uniqueUrls.slice(0, Number(options.maxPages));
  }

  return { normalizedBaseUrl: normalized, uniqueUrls, discoveryMethod };
}

function makePagePaths(paths, url) {
  const slug = safeFilenameFromUrl(url);
  return {
    slug,
    datasetPath: path.join(paths.datasetDir, `${slug}.dataset.json`),
    serpPath: path.join(paths.serpDatasetDir, `${slug}.serp.json`),
    keywordsPath: path.join(paths.keywordDatasetDir, `${slug}.keywords.json`),
    optimizedPath: path.join(paths.optimizedDir, `${slug}.optimized.html`),
    schemaPath: path.join(paths.schemasDir, `${slug}.schema.json`),
    evalPath: path.join(paths.evalsDir, `${slug}.eval.json`),
    auditPath: path.join(paths.auditsDir, `${slug}.audit.md`),
  };
}

function formatAuditMarkdown(pageAudit) {
  const lines = [];
  lines.push("# Page Audit");
  lines.push("");
  lines.push(`- URL: ${pageAudit.url}`);
  lines.push(`- Page Type: ${pageAudit.pageType}`);
  lines.push(`- Product Page: ${pageAudit.productPage}`);
  lines.push(`- Score: ${pageAudit.evaluation?.score ?? "n/a"}`);
  lines.push("");
  lines.push("## Recommendations");
  lines.push(pageAudit.seoRecommendations || "");
  return lines.join("\n");
}

function evaluateAndMaybeRetry(productPage, optimizedContent, schema, entity) {
  if (!productPage) return { optimizedContent, evaluation: null };
  let evaluation = evaluatePdpOutput({
    optimizedContent,
    schema,
    productEntity: entity,
  });
  return { optimizedContent, evaluation };
}

function routeAllowed(pageType, options = {}) {
  if (!options.pageTypeFilter) return true;
  return pageType === options.pageTypeFilter;
}

async function runAnalyzeStage(url, scrapedData, state, paths) {
  const route = routePage({
    url,
    title: scrapedData.title,
    headings: scrapedData.headings,
    visibleText: scrapedData.first1500Words,
  });

  if (!routeAllowed(route.pageType, state.options || {})) {
    return {
      skipped: true,
      reason: `filtered_${route.pageType}`,
      route,
    };
  }

  const serpInsights = await analyzeSerp({
    productEntity: scrapedData.productEntity,
    pageType: route.pageType,
    url,
    headings: scrapedData.headings,
    first1500Words: scrapedData.first1500Words,
  });

  const keywordCluster = buildKeywordClusters({
    productEntity: scrapedData.productEntity,
    serpKeywordThemes: serpInsights.keywordThemes,
    headings: scrapedData.headings,
    url,
  });

  const internalLinks = await analyzeInternalLinks({
    url,
    productEntity: scrapedData.productEntity,
    pageType: route.pageType,
    existingContent: scrapedData.first1500Words || "",
    sitePages: state.uniqueUrls || [],
  });

  return {
    skipped: false,
    route,
    serpInsights,
    keywordCluster,
    internalLinks,
  };
}

async function runOptimizeStage(url, enrichedData, route, options = {}) {
  let optimized = "";
  let productPage = route.pageType === "pdp" || options.forcePdp === true;

  if (productPage) {
    const tmpPath = path.join(process.cwd(), "output", "site", "dataset", `${safeFilenameFromUrl(url)}.dataset.json`);
    await writeJson(tmpPath, enrichedData);
    optimized = await runPdpAgentWithRetry(enrichedData, {
      url,
      scrapedPath: tmpPath,
      optimizedPath: "",
      prefix: safeFilenameFromUrl(url),
    });
  } else if (route.pageType === "category") {
    optimized = `<p>Category optimization recommendations generated for ${url}.</p>`;
  } else if (route.pageType === "blog") {
    optimized = `<p>Blog optimization recommendations generated for ${url}.</p>`;
  } else {
    optimized = `<p>No specialized optimization agent for ${route.pageType}.</p>`;
  }

  optimized = injectInternalLinksIntoContent(optimized, enrichedData.internalLinkSuggestions || []);
  return { optimized, productPage };
}

function buildOverview(report, strategy) {
  const lines = [];
  lines.push("# SEO Optimization Overview");
  lines.push("");
  lines.push(`- Base URL: ${report.baseUrl}`);
  lines.push(`- Pages Audited: ${report.pagesAudited}`);
  lines.push(`- Pages Skipped: ${report.pagesSkipped}`);
  lines.push(`- Errors: ${report.errors.length}`);
  lines.push(`- Product Pages Optimized: ${report.productPagesOptimized}`);
  lines.push("");
  lines.push("## Strategy Highlights");
  for (const item of strategy.pillarPageRecommendations || []) lines.push(`- ${item}`);
  lines.push("");
  return lines.join("\n");
}

module.exports = {
  discoverUrls,
  getRunPaths,
  initRunState,
  readRunState,
  updateRunState,
  makePagePaths,
  writeJson,
  readJsonSafe,
  safeFilenameFromUrl,
  formatAuditMarkdown,
  runAnalyzeStage,
  runOptimizeStage,
  evaluateAndMaybeRetry,
  buildOverview,
  buildSiteStrategy,
  buildInternalLinkPlan,
  runSchemaAgent,
  analyzeTechnicalSeo,
  analyzeContentQuality,
  runScraperWithRetry,
  runDocsAgent,
};


