const path = require("path");
const fs = require("fs");
const fsp = fs.promises;
const buildSiteStrategy = require("../siteStrategistAgent");
const { createLogger } = require("../logger");
const { runPagePipeline } = require("../core/runPagePipeline");
const { mapWithConcurrency, discoverUrls } = require("./_shared");
const { readJsonSafe, writeJson } = require("../core/pipelineUtils");

async function runAuditPipeline(context = {}) {
  const logger = createLogger();
  const baseUrl = context.baseUrl;
  const concurrency = Math.max(1, Number(context.concurrency || 8));
  const rootOutput = path.resolve(context.outputDir || path.join("output", "site"));
  const outDir = path.join(rootOutput, "audit");

  const discovered = await discoverUrls(baseUrl, context);
  const urls = Array.isArray(context.sharedUrls) && context.sharedUrls.length > 0
    ? context.sharedUrls
    : discovered.urls;
  const discoveryMethod = Array.isArray(context.sharedUrls) && context.sharedUrls.length > 0
    ? "shared-list"
    : discovered.discoveryMethod;

  logger.info("pipeline.audit.start", {
    agent: "auditPipeline",
    baseUrl,
    urls: urls.length,
    discoveryMethod,
    concurrency,
  });

  const results = [];
  await mapWithConcurrency(urls, concurrency, async (url, index) => {
    logger.info("pipeline.audit.page", {
      agent: "auditPipeline",
      progress: `${index + 1}/${urls.length}`,
      url,
    });
    const result = await runPagePipeline(url, {
      ...context,
      mode: "audit",
      outputDir: outDir,
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
    results.push(result);
  });

  const pageAudits = [];
  for (const row of results) {
    const payload = await readJsonSafe(row.artifacts?.auditJsonPath, null);
    if (payload?.data) pageAudits.push(payload.data);
  }

  const siteStrategy = buildSiteStrategy({
    pageAudits,
    sitePages: urls,
    serpPatterns: {},
    keywordClusters: {},
    internalLinkGraph: { linkMap: [] },
  });

  const pagesSkipped = results.filter((x) => x.status === "skipped").length;
  const errors = results
    .filter((x) => x.status === "failed")
    .map((x) => ({ url: x.url, error: x.errors?.[0]?.message || "failed" }));
  const report = {
    mode: "audit",
    baseUrl,
    generatedAt: new Date().toISOString(),
    discoveryMethod,
    totalUrlsDiscovered: urls.length,
    pagesAudited: pageAudits.length,
    pagesSkipped,
    errors,
    siteStrategy,
  };

  const reportPath = path.join(outDir, "audit-report.json");
  const strategyPath = path.join(outDir, "site-strategy.json");
  await writeJson(reportPath, report);
  await writeJson(strategyPath, siteStrategy);
  await fsp.mkdir(path.dirname(path.join(outDir, "audit-report.md")), { recursive: true });
  await fsp.writeFile(path.join(outDir, "audit-report.md"), `# Audit Report\n\n${JSON.stringify(report, null, 2)}\n`, "utf-8");

  logger.info("pipeline.audit.complete", {
    agent: "auditPipeline",
    pagesAudited: report.pagesAudited,
    pagesSkipped: report.pagesSkipped,
    errors: report.errors.length,
  });

  return {
    ...report,
    outputDir: outDir,
    reportPath,
    strategyPath,
  };
}

module.exports = { runAuditPipeline };

