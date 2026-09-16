const fs = require("fs");
const fsp = fs.promises;
const { createStageWorker } = require("./_baseWorker");
const { createPipelineQueue } = require("../queue");
const {
  getRunPaths,
  readJsonSafe,
  writeJson,
  updateRunState,
  runSchemaAgent,
  analyzeTechnicalSeo,
  analyzeContentQuality,
  evaluateAndMaybeRetry,
  formatAuditMarkdown,
} = require("../pipelineRuntime");

const worker = createStageWorker("seo-platform", "generate_schema", async (job) => {
  const { runId, outputDir, url, pagePaths } = job.data;
  const paths = getRunPaths(outputDir, runId);

  const enriched = await readJsonSafe(pagePaths.datasetPath, null);
  if (!enriched) throw new Error(`Missing dataset for ${url}`);

  const optimizedHtml = (await readJsonSafe(pagePaths.optimizedPath, null))
    || (fs.existsSync(pagePaths.optimizedPath) ? await fsp.readFile(pagePaths.optimizedPath, "utf-8") : "");

  const schema = runSchemaAgent({
    url,
    pageType: enriched.pageType || "generic",
    scrapedData: enriched,
    optimizedContent: optimizedHtml,
  });
  await writeJson(pagePaths.schemaPath, schema);

  const check = evaluateAndMaybeRetry(
    enriched.pageType === "pdp",
    optimizedHtml,
    schema,
    enriched.productEntity
  );
  if (check.evaluation) {
    await writeJson(pagePaths.evalPath, check.evaluation);
  }

  const technicalSEO = await analyzeTechnicalSeo(url, enriched.first1500Words || "");
  const contentQuality = analyzeContentQuality(enriched.first1500Words || "", enriched.headings || []);

  const pageAudit = {
    url,
    pageType: enriched.pageType || "generic",
    productPage: enriched.pageType === "pdp",
    serpInsights: enriched.serpInsights || {},
    keywordClusters: enriched.keywordClusters || {},
    internalLinks: enriched.internalLinksAnalysis || {},
    technicalSEO,
    contentQuality,
    evaluation: check.evaluation,
    headings: enriched.headings || [],
    seoRecommendations: optimizedHtml,
  };

  await writeJson(`${paths.runDir}/${pagePaths.slug}.audit.json`, pageAudit);
  await fsp.writeFile(pagePaths.auditPath, formatAuditMarkdown(pageAudit), "utf-8");

  const state = await updateRunState(paths, (s) => {
    s.completed += 1;
    s.pages[url] = {
      ...(s.pages[url] || {}),
      status: "completed",
      schemaPath: pagePaths.schemaPath,
      evalPath: check.evaluation ? pagePaths.evalPath : null,
      auditPath: pagePaths.auditPath,
    };
    s.pageAudits = s.pageAudits || [];
    s.pageAudits.push(pageAudit);
  });

  if (!state.queuedFinal && state.completed + state.failed >= state.total) {
    const q = createPipelineQueue("seo-platform");
    await q.add("plan_internal_links", {
      runId,
      outputDir,
      baseUrl: state.baseUrl,
    });
    await q.close();

    await updateRunState(paths, (s) => {
      s.queuedFinal = true;
    });
  }

  return { url, completed: state.completed, total: state.total };
});

worker.on("completed", (job) => {
  console.log(`schemaWorker completed ${job.id}`);
});



