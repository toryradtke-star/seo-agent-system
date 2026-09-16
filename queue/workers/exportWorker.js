const fs = require("fs");
const fsp = fs.promises;
const { createStageWorker } = require("./_baseWorker");
const {
  getRunPaths,
  readRunState,
  readJsonSafe,
  writeJson,
  buildOverview,
  runDocsAgent,
} = require("../pipelineRuntime");

const worker = createStageWorker("seo-platform", "export_results", async (job) => {
  const { runId, outputDir } = job.data;
  const paths = getRunPaths(outputDir, runId);
  const state = await readRunState(paths);

  const strategy = await readJsonSafe(`${paths.runDir}/site-strategy.json`, {});
  const errors = Object.entries(state.pages || {})
    .filter(([, row]) => row.status === "failed")
    .map(([url, row]) => ({ url, error: row.error || "failed" }));

  const report = {
    baseUrl: state.baseUrl,
    generatedAt: new Date().toISOString(),
    runId,
    totalUrlsDiscovered: state.total || 0,
    pagesAudited: (state.pageAudits || []).length,
    pagesSkipped: Object.values(state.pages || {}).filter((x) => x.status === "skipped").length,
    productPagesOptimized: (state.pageAudits || []).filter((x) => x.productPage).length,
    errors,
    pageAudits: state.pageAudits || [],
  };

  await writeJson(`${paths.runDir}/full-site-audit.json`, report);

  const overview = buildOverview(report, strategy);
  await fsp.writeFile(`${paths.runDir}/seo-overview.md`, overview, "utf-8");

  if (state.options?.sendDocs !== false) {
    await runDocsAgent(overview, `SEO Overview - ${runId}`, {
      folderPath: state.docsFolderPath || undefined,
    });
  }

  await writeJson(`${paths.runDir}/queue-export.json`, {
    doneAt: new Date().toISOString(),
    reportPath: `${paths.runDir}/full-site-audit.json`,
    overviewPath: `${paths.runDir}/seo-overview.md`,
  });

  return { exported: true, runId };
});

worker.on("completed", (job) => {
  console.log(`exportWorker completed ${job.id}`);
});



