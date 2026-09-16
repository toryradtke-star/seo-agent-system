const { createStageWorker } = require("./_baseWorker");
const { createPipelineQueue } = require("../queue");
const { discoverUrls, getRunPaths, initRunState, writeJson } = require("../pipelineRuntime");

const worker = createStageWorker("seo-platform", "crawl_site", async (job) => {
  const baseUrl = job.data.baseUrl;
  const outputDir = job.data.outputDir || "output/site";
  const options = job.data.options || {};

  const { normalizedBaseUrl, uniqueUrls, discoveryMethod } = await discoverUrls(baseUrl, options);
  const runId = `queue-${job.id}`;
  const paths = getRunPaths(outputDir, runId);

  await initRunState(paths, {
    runId,
    baseUrl: normalizedBaseUrl,
    total: uniqueUrls.length,
    options,
    uniqueUrls,
    docsFolderPath: `Site Audits/${new URL(normalizedBaseUrl).hostname}/${runId}`,
  });

  await writeJson(`${paths.runDir}/queue-run-meta.json`, {
    runId,
    baseUrl: normalizedBaseUrl,
    discoveryMethod,
    totalUrls: uniqueUrls.length,
    createdAt: new Date().toISOString(),
  });

  const queue = createPipelineQueue("seo-platform");
  for (let i = 0; i < uniqueUrls.length; i += 1) {
    await queue.add("scrape_page", {
      runId,
      baseUrl: normalizedBaseUrl,
      outputDir,
      options,
      url: uniqueUrls[i],
      index: i,
      total: uniqueUrls.length,
    });
  }
  await queue.close();

  return {
    runId,
    baseUrl: normalizedBaseUrl,
    discoveryMethod,
    totalUrls: uniqueUrls.length,
  };
});

worker.on("completed", (job, result) => {
  console.log(`crawlWorker completed ${job.id} run=${result?.runId} urls=${result?.totalUrls}`);
});

