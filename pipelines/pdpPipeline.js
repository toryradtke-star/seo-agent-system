const path = require("path");
const { createLogger } = require("../logger");
const { runPagePipeline } = require("../core/runPagePipeline");
const { writeJson } = require("../core/pipelineUtils");
const { mapWithConcurrency, discoverUrls } = require("./_shared");

async function runPdpPipeline(context = {}) {
  const logger = createLogger();
  const baseUrl = context.baseUrl;
  const concurrency = Math.max(1, Number(context.concurrency || 8));
  const rootOutput = path.resolve(context.outputDir || path.join("output", "site"));
  const outDir = path.join(rootOutput, "optimized");

  const discovered = await discoverUrls(baseUrl, context);
  const urls = Array.isArray(context.sharedUrls) && context.sharedUrls.length > 0
    ? context.sharedUrls
    : discovered.urls;
  const discoveryMethod = Array.isArray(context.sharedUrls) && context.sharedUrls.length > 0
    ? "shared-list"
    : discovered.discoveryMethod;

  logger.info("pipeline.optimize.start", {
    agent: "pdpPipeline",
    baseUrl,
    urls: urls.length,
    discoveryMethod,
    concurrency,
  });

  const results = [];
  await mapWithConcurrency(urls, concurrency, async (url, index) => {
    logger.info("pipeline.optimize.page", {
      agent: "pdpPipeline",
      progress: `${index + 1}/${urls.length}`,
      url,
    });
    const result = await runPagePipeline(url, {
      ...context,
      mode: "optimize",
      outputDir: outDir,
      options: {
        ...(context.options || {}),
        preScrapedDir: context.preScrapedDir,
        forcePdp: context.forcePdp,
        pageTypeFilter: context.pageTypeFilter,
        sendDocs: context.sendDocs === true,
        docsFolderPath: context.docsFolderPath || "",
        resume: true,
      },
      services: {
        ...(context.services || {}),
        sitePages: urls,
      },
    });
    results.push(result);
  });

  const pagesSkipped = results.filter((x) => x.status === "skipped").length;
  const pagesOptimized = results.filter((x) => x.status === "completed").length;
  const errors = results
    .filter((x) => x.status === "failed")
    .map((x) => ({ url: x.url, error: x.errors?.[0]?.message || "failed" }));

  const report = {
    mode: "optimize",
    baseUrl,
    generatedAt: new Date().toISOString(),
    discoveryMethod,
    totalUrlsDiscovered: urls.length,
    pagesOptimized,
    pagesSkipped,
    errors,
  };

  const reportPath = path.join(outDir, "optimized-report.json");
  await writeJson(reportPath, report);

  logger.info("pipeline.optimize.complete", {
    agent: "pdpPipeline",
    pagesOptimized,
    pagesSkipped,
    errors: errors.length,
  });

  return {
    ...report,
    outputDir: outDir,
    reportPath,
  };
}

module.exports = { runPdpPipeline };

