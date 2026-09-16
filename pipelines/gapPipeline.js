const path = require("path");
const { createLogger } = require("../logger");
const runContentGapAgent = require("../contentGapAgent");
const { runPagePipeline } = require("../core/runPagePipeline");
const { readJsonSafe, writeJson } = require("../core/pipelineUtils");
const { mapWithConcurrency, discoverUrls } = require("./_shared");

async function runGapPipeline(context = {}) {
  const logger = createLogger();
  const baseUrl = context.baseUrl;
  const concurrency = Math.max(1, Number(context.concurrency || 8));
  const rootOutput = path.resolve(context.outputDir || path.join("output", "site"));
  const outDir = path.join(rootOutput, "content-gaps");
  const datasetDir = path.join(rootOutput, "dataset");
  const cacheDir = path.join(rootOutput, "cache");

  const discovered = await discoverUrls(baseUrl, context);
  const urls = Array.isArray(context.sharedUrls) && context.sharedUrls.length > 0
    ? context.sharedUrls
    : discovered.urls;
  const discoveryMethod = Array.isArray(context.sharedUrls) && context.sharedUrls.length > 0
    ? "shared-list"
    : discovered.discoveryMethod;

  logger.info("pipeline.gaps.start", {
    agent: "gapPipeline",
    baseUrl,
    urls: urls.length,
    discoveryMethod,
    concurrency,
  });

  const pages = [];
  const errors = [];
  let pagesSkipped = 0;

  await mapWithConcurrency(urls, concurrency, async (url, index) => {
    logger.info("pipeline.gaps.page", {
      agent: "gapPipeline",
      progress: `${index + 1}/${urls.length}`,
      url,
    });
    const result = await runPagePipeline(url, {
      ...context,
      mode: "gaps",
      outputDir: rootOutput,
      options: {
        ...(context.options || {}),
        preScrapedDir: context.preScrapedDir,
        resume: true,
        sendDocs: false,
      },
      services: {
        ...(context.services || {}),
        sitePages: urls,
      },
    });

    if (result.status === "skipped") {
      pagesSkipped += 1;
      return;
    }
    if (result.status === "failed") {
      errors.push({ url, error: result.errors?.[0]?.message || "failed" });
      return;
    }

    const dataset = await readJsonSafe(result.artifacts?.datasetPath, null);
    const data = dataset?.data || {};
    pages.push({
      url,
      pageType: data.pageType || "generic",
      title: data.title || "",
      productEntity: data.productEntity || "",
      headings: data.headings || [],
      first1500Words: data.first1500Words || "",
      visibleText: data.visibleText || "",
    });
  });

  const gapResult = await runContentGapAgent(
    { pages },
    {
      cacheDir: path.join(cacheDir, "serp"),
      datasetDir: path.join(datasetDir, "serp"),
    }
  );

  const report = {
    mode: "gaps",
    baseUrl,
    generatedAt: new Date().toISOString(),
    discoveryMethod,
    totalUrlsDiscovered: urls.length,
    pagesAnalyzed: pages.length,
    pagesSkipped,
    errors,
  };

  const reportPath = path.join(outDir, "gap-report.json");
  await writeJson(reportPath, report);
  await writeJson(path.join(outDir, "recommended-pages.json"), gapResult.recommendedPages || []);
  await writeJson(path.join(outDir, "keyword-opportunities.json"), gapResult.keywordOpportunities || []);
  await require("fs").promises.mkdir(outDir, { recursive: true });
  await require("fs").promises.writeFile(
    path.join(outDir, "content-gap-report.md"),
    gapResult.contentGapReportMd || "# Content Gap Report\n",
    "utf-8"
  );

  logger.info("pipeline.gaps.complete", {
    agent: "gapPipeline",
    pagesAnalyzed: report.pagesAnalyzed,
    pagesSkipped: report.pagesSkipped,
    errors: report.errors.length,
    recommendations: (gapResult.recommendedPages || []).length,
  });

  return {
    ...report,
    outputDir: outDir,
    reportPath,
  };
}

module.exports = { runGapPipeline };

