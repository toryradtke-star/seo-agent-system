const path = require("path");
const { discoverUrls } = require("./_shared");
const { runAuditPipeline } = require("./auditPipeline");
const { runPdpPipeline } = require("./pdpPipeline");
const { runGapPipeline } = require("./gapPipeline");
const { createLogger } = require("../logger");

async function runFullPipeline(context = {}) {
  const logger = createLogger();
  const rootOutput = path.resolve(context.outputDir || path.join("output", "site"));
  const concurrency = Math.max(1, Number(context.concurrency || 8));

  logger.info("pipeline.full.start", {
    agent: "fullPipeline",
    baseUrl: context.baseUrl,
    outputDir: rootOutput,
    concurrency,
  });

  const discovered = await discoverUrls(context.baseUrl, context);
  const urls = discovered.urls || [];
  const sharedPageCache = context.sharedPageCache || {};

  const sharedContext = {
    ...context,
    concurrency,
    outputDir: rootOutput,
    sharedUrls: urls,
    sharedPageCache,
  };

  const auditResult = await runAuditPipeline(sharedContext);
  const optimizeResult = await runPdpPipeline(sharedContext);
  const gapResult = await runGapPipeline(sharedContext);

  const result = {
    mode: "full",
    baseUrl: context.baseUrl,
    generatedAt: new Date().toISOString(),
    discovery: {
      totalUrlsDiscovered: urls.length,
      discoveryMethod: discovered.discoveryMethod,
      preloadedFromScraper: 0,
      preloadErrors: 0,
    },
    audit: {
      pagesAudited: auditResult.pagesAudited,
      pagesSkipped: auditResult.pagesSkipped,
      reusedPreScraped: auditResult.reusedPreScraped || 0,
      reusedMemoryCache: auditResult.reusedMemoryCache || 0,
      errors: auditResult.errors?.length || 0,
      reportPath: auditResult.reportPath,
    },
    optimize: {
      pagesOptimized: optimizeResult.pagesOptimized,
      pagesSkipped: optimizeResult.pagesSkipped,
      reusedPreScraped: optimizeResult.reusedPreScraped || 0,
      reusedMemoryCache: optimizeResult.reusedMemoryCache || 0,
      errors: optimizeResult.errors?.length || 0,
      reportPath: optimizeResult.reportPath,
    },
    contentGaps: {
      pagesAnalyzed: gapResult.pagesAnalyzed,
      reusedPreScraped: gapResult.reusedPreScraped || 0,
      reusedMemoryCache: gapResult.reusedMemoryCache || 0,
      outputDir: gapResult.outputDir,
      reportPath: gapResult.reportPath,
      errors: gapResult.errors.length,
    },
    outputDir: rootOutput,
  };

  logger.info("pipeline.full.complete", {
    agent: "fullPipeline",
    pagesAudited: result.audit.pagesAudited,
    pagesOptimized: result.optimize.pagesOptimized,
    gapPagesAnalyzed: result.contentGaps.pagesAnalyzed,
    preloadCount: result.discovery.preloadedFromScraper,
    gapPreScrapedReuse: result.contentGaps.reusedPreScraped,
    gapMemoryReuse: result.contentGaps.reusedMemoryCache,
  });

  return result;
}

module.exports = { runFullPipeline };
