const { createStageWorker } = require("./_baseWorker");
const { createPipelineQueue } = require("../queue");
const {
  getRunPaths,
  readJsonSafe,
  writeJson,
  updateRunState,
  runAnalyzeStage,
} = require("../pipelineRuntime");

const worker = createStageWorker("seo-platform", "analyze_page", async (job) => {
  const { runId, outputDir, url, options, pagePaths } = job.data;
  const paths = getRunPaths(outputDir, runId);
  const state = await readJsonSafe(paths.statePath, { uniqueUrls: [], options: {} });
  const scrapedData = await readJsonSafe(pagePaths.datasetPath, null);
  if (!scrapedData) throw new Error(`Missing dataset for ${url}`);

  const analysis = await runAnalyzeStage(url, scrapedData, state, paths);

  if (analysis.skipped) {
    await updateRunState(paths, (s) => {
      s.completed += 1;
      s.pages[url] = { ...(s.pages[url] || {}), status: "skipped", reason: analysis.reason };
    });
    return { skipped: true, url, reason: analysis.reason };
  }

  await writeJson(pagePaths.serpPath, analysis.serpInsights);
  await writeJson(pagePaths.keywordsPath, analysis.keywordCluster);

  const enriched = {
    ...scrapedData,
    serpInsights: analysis.serpInsights,
    keywordClusters: analysis.keywordCluster,
    internalLinkSuggestions: analysis.internalLinks.contextualLinks || [],
    internalLinksAnalysis: analysis.internalLinks,
    pageType: analysis.route.pageType,
  };
  await writeJson(pagePaths.datasetPath, enriched);

  await updateRunState(paths, (s) => {
    s.pages[url] = {
      ...(s.pages[url] || {}),
      status: "analyzed",
      pageType: analysis.route.pageType,
      serpPath: pagePaths.serpPath,
      keywordsPath: pagePaths.keywordsPath,
    };
  });

  const queue = createPipelineQueue("seo-platform");
  await queue.add("optimize_page", {
    runId,
    outputDir,
    url,
    options,
    pagePaths,
  });
  await queue.close();

  return { url, pageType: analysis.route.pageType };
});

worker.on("completed", (job) => {
  console.log(`analyzeWorker completed ${job.id}`);
});

