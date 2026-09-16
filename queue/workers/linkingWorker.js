const { createStageWorker } = require("./_baseWorker");
const { createPipelineQueue } = require("../queue");
const {
  getRunPaths,
  readRunState,
  writeJson,
  buildInternalLinkPlan,
} = require("../pipelineRuntime");

const worker = createStageWorker("seo-platform", "plan_internal_links", async (job) => {
  const { runId, outputDir } = job.data;
  const paths = getRunPaths(outputDir, runId);
  const state = await readRunState(paths);

  const pageTypes = {};
  const internalLinks = {};
  const productEntities = {};
  for (const row of state.pageAudits || []) {
    pageTypes[row.url] = row.pageType || "generic";
    internalLinks[row.url] = row.internalLinks?.internalLinks || [];
    productEntities[row.url] = row.headings?.[0]?.text || "";
  }

  const linkMap = buildInternalLinkPlan({
    allPages: state.uniqueUrls || Object.keys(pageTypes),
    pageTypes,
    categories: pageTypes,
    internalLinks,
    productEntities,
  });

  await writeJson(`${paths.linkMapDatasetDir}/internal-link-map.json`, linkMap);

  const q = createPipelineQueue("seo-platform");
  await q.add("generate_site_strategy", {
    runId,
    outputDir,
  });
  await q.close();

  return { recommendations: (linkMap.linkMap || []).length };
});

worker.on("completed", (job) => {
  console.log(`linkingWorker completed ${job.id}`);
});

