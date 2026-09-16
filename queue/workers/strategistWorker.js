const { createStageWorker } = require("./_baseWorker");
const { createPipelineQueue } = require("../queue");
const {
  getRunPaths,
  readRunState,
  readJsonSafe,
  writeJson,
  buildSiteStrategy,
} = require("../pipelineRuntime");

const worker = createStageWorker("seo-platform", "generate_site_strategy", async (job) => {
  const { runId, outputDir } = job.data;
  const paths = getRunPaths(outputDir, runId);
  const state = await readRunState(paths);

  const linkGraph = await readJsonSafe(`${paths.linkMapDatasetDir}/internal-link-map.json`, { linkMap: [] });

  const serpPatterns = {};
  const keywordClusters = {};
  for (const audit of state.pageAudits || []) {
    serpPatterns[audit.url] = audit.serpInsights || {};
    keywordClusters[audit.url] = audit.keywordClusters || {};
  }

  const strategy = buildSiteStrategy({
    pageAudits: state.pageAudits || [],
    sitePages: state.uniqueUrls || [],
    serpPatterns,
    keywordClusters,
    internalLinkGraph: linkGraph,
  });

  await writeJson(`${paths.runDir}/site-strategy.json`, strategy);

  const q = createPipelineQueue("seo-platform");
  await q.add("export_results", {
    runId,
    outputDir,
  });
  await q.close();

  return { strategyReady: true };
});

worker.on("completed", (job) => {
  console.log(`strategistWorker completed ${job.id}`);
});

