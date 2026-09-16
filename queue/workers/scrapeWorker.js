const fs = require("fs");
const { createStageWorker } = require("./_baseWorker");
const { createPipelineQueue } = require("../queue");
const { runPagePipeline } = require("../../core/runPagePipeline");
const {
  getRunPaths,
  updateRunState,
} = require("../pipelineRuntime");

function slugFromUrl(url) {
  const pathname = new URL(url).pathname.replace(/\/+$/g, "");
  return (pathname === "/" ? "home" : pathname.replace(/^\/+/, "").replace(/\//g, "--"))
    .replace(/[^a-zA-Z0-9-_]+/g, "-");
}

function readStateSafe(statePath) {
  try {
    return JSON.parse(fs.readFileSync(statePath, "utf-8"));
  } catch (_) {
    return { uniqueUrls: [], options: {} };
  }
}

const worker = createStageWorker("seo-platform", "scrape_page", async (job) => {
  const { runId, outputDir, url, index, total, baseUrl, options } = job.data;
  const paths = getRunPaths(outputDir, runId);
  const pageSlug = slugFromUrl(url);

  const optimizedPath = `${paths.optimizedDir}/${pageSlug}.optimized.html`;
  if (fs.existsSync(optimizedPath) && options.changedOnly !== true) {
    await updateRunState(paths, (state) => {
      state.completed += 1;
      state.pages[url] = { status: "skipped", reason: "optimized_exists" };
    });
    return { skipped: true, reason: "optimized_exists", url };
  }

  const stateSnapshot = readStateSafe(paths.statePath);
  const result = await runPagePipeline(url, {
    runId,
    outputDir,
    mode: "queue",
    options: {
      ...(options || {}),
      preScrapedDir: options?.preScrapedDir,
      sendDocs: stateSnapshot.options?.sendDocs !== false,
      docsFolderPath: stateSnapshot.docsFolderPath || "",
      resume: options?.changedOnly !== true,
    },
    sharedCache: {},
    services: {
      sitePages: stateSnapshot.uniqueUrls || [],
    },
  });

  const state = await updateRunState(paths, (state) => {
    state.pages[url] = {
      status: result.status,
      index,
      total,
      slug: pageSlug,
      datasetPath: result.artifacts?.datasetPath || null,
      optimizedPath: result.artifacts?.optimizedPath || null,
      schemaPath: result.artifacts?.schemaPath || null,
      auditPath: result.artifacts?.auditPath || null,
      baseUrl,
    };
    if (result.status === "completed" || result.status === "skipped") {
      state.completed += 1;
    } else if (result.status === "failed") {
      state.failed += 1;
    }
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

  return { url, status: result.status };
});

worker.on("completed", (job) => {
  console.log(`scrapeWorker completed ${job.id}`);
});
