const fs = require("fs");
const fsp = fs.promises;
const { createStageWorker } = require("./_baseWorker");
const { createPipelineQueue } = require("../queue");
const {
  getRunPaths,
  readJsonSafe,
  updateRunState,
  runOptimizeStage,
} = require("../pipelineRuntime");

const worker = createStageWorker("seo-platform", "optimize_page", async (job) => {
  const { runId, outputDir, url, options, pagePaths } = job.data;
  const paths = getRunPaths(outputDir, runId);

  const enriched = await readJsonSafe(pagePaths.datasetPath, null);
  if (!enriched) throw new Error(`Missing enriched dataset for ${url}`);

  const route = { pageType: enriched.pageType || "generic" };
  const { optimized, productPage } = await runOptimizeStage(url, enriched, route, options || {});

  await fsp.writeFile(pagePaths.optimizedPath, optimized, "utf-8");

  await updateRunState(paths, (s) => {
    s.pages[url] = {
      ...(s.pages[url] || {}),
      status: "optimized",
      productPage,
      optimizedPath: pagePaths.optimizedPath,
    };
  });

  const queue = createPipelineQueue("seo-platform");
  await queue.add("generate_schema", {
    runId,
    outputDir,
    url,
    options,
    pagePaths,
  });
  await queue.close();

  return { url, productPage, optimizedPath: pagePaths.optimizedPath };
});

worker.on("completed", (job) => {
  console.log(`optimizeWorker completed ${job.id}`);
});



