const fs = require("fs");
const path = require("path");
const { createLogger } = require("../logger");
const { ensureDir, safeFilenameFromUrl, writeJson } = require("./pipelineUtils");
const { withArtifactMetadata } = require("./artifactMetadata");
const { runScrapeStage } = require("./stages/scrapeStage");
const { runRouteStage } = require("./stages/routeStage");
const { runAnalyzeStage } = require("./stages/analyzeStage");
const { runOptimizeStage } = require("./stages/optimizeStage");
const { runSchemaStage } = require("./stages/schemaStage");
const { runEvaluateStage } = require("./stages/evaluateStage");
const { runExportStage } = require("./stages/exportStage");

function buildPagePaths(outputDir, slug) {
  const root = path.resolve(outputDir || path.join("output", "site"));
  const datasetDir = path.join(root, "dataset", "pages");
  const auditsDir = path.join(root, "audits", "pages");
  const optimizedDir = path.join(root, "optimized");
  const schemasDir = path.join(root, "schemas");
  const evalsDir = path.join(root, "evals");

  return {
    root,
    datasetDir,
    auditsDir,
    optimizedDir,
    schemasDir,
    evalsDir,
    datasetPath: path.join(datasetDir, `${slug}.dataset.json`),
    tempScrapedPath: path.join(datasetDir, `${slug}.tmp-scraped.json`),
    optimizedPath: path.join(optimizedDir, `${slug}.optimized.html`),
    schemaPath: path.join(schemasDir, `${slug}.schema.json`),
    evalPath: path.join(evalsDir, `${slug}.eval.json`),
    scorePath: path.join(evalsDir, `${slug}.score.json`),
    auditPath: path.join(auditsDir, `${slug}.audit.md`),
    auditJsonPath: path.join(auditsDir, `${slug}.audit.json`),
  };
}

async function ensurePaths(paths) {
  await Promise.all([
    ensureDir(paths.datasetDir),
    ensureDir(paths.auditsDir),
    ensureDir(paths.optimizedDir),
    ensureDir(paths.schemasDir),
    ensureDir(paths.evalsDir),
  ]);
}

async function runPagePipeline(url, context = {}) {
  const logger = context.logger || createLogger();
  const runId = context.runId || `run-${Date.now()}`;
  const slug = safeFilenameFromUrl(url);
  const paths = buildPagePaths(context.outputDir, slug);
  const options = context.options || {};
  const startedAt = Date.now();

  context.sharedCache = context.sharedCache || {};
  context.services = context.services || {};
  await ensurePaths(paths);

  if (options.resume !== false && fs.existsSync(paths.optimizedPath) && fs.existsSync(paths.schemaPath)) {
    return {
      url,
      slug,
      status: "skipped",
      pageType: "unknown",
      artifacts: {
        optimizedPath: paths.optimizedPath,
        schemaPath: paths.schemaPath,
      },
      metrics: {
        durationMs: Date.now() - startedAt,
        skipped: true,
      },
      errors: [],
    };
  }

  try {
    let pagePayload = {
      url,
      slug,
      runId,
      status: "running",
      pageType: "generic",
      paths,
      metrics: {},
    };

    pagePayload = await runScrapeStage(pagePayload, context);
    pagePayload = await runRouteStage(pagePayload, context);

    if (pagePayload.status === "skipped") {
      return {
        url,
        slug,
        status: "skipped",
        pageType: pagePayload.pageType || "generic",
        artifacts: { datasetPath: paths.datasetPath },
        metrics: {
          durationMs: Date.now() - startedAt,
          skipReason: pagePayload.skipReason,
        },
        errors: [],
      };
    }

    pagePayload = await runAnalyzeStage(pagePayload, context);

    if (context.mode === "gaps") {
      await writeJson(
        paths.datasetPath,
        withArtifactMetadata(
          {
            data: {
              ...(pagePayload.scrapedData || {}),
              pageType: pagePayload.pageType,
              serpInsights: pagePayload.serpInsights || {},
              keywordClusters: pagePayload.keywordClusters || {},
              internalLinksAnalysis: pagePayload.internalLinksAnalysis || {},
            },
          },
          {
            producer: "runPagePipeline",
            runId,
            promptVersion: options.promptVersion,
            model: options.model,
          }
        )
      );
      return {
        url,
        slug,
        status: "completed",
        pageType: pagePayload.pageType,
        artifacts: {
          datasetPath: paths.datasetPath,
        },
        metrics: {
          durationMs: Date.now() - startedAt,
        },
        errors: [],
      };
    }

    pagePayload = await runOptimizeStage(pagePayload, context);
    pagePayload = await runSchemaStage(pagePayload, context);
    pagePayload = await runEvaluateStage(pagePayload, context);
    pagePayload = await runExportStage(pagePayload, context);

    const result = {
      url,
      slug,
      status: "completed",
      pageType: pagePayload.pageType,
      artifacts: {
        datasetPath: paths.datasetPath,
        optimizedPath: paths.optimizedPath,
        schemaPath: paths.schemaPath,
        evalPath: pagePayload.evaluation ? paths.evalPath : null,
        scorePath: pagePayload.contentScore ? paths.scorePath : null,
        auditPath: paths.auditPath,
        auditJsonPath: paths.auditJsonPath,
      },
      metrics: {
        durationMs: Date.now() - startedAt,
        retryMetadata: pagePayload.retryMetadata || null,
      },
      errors: [],
    };

    logger.metric("runPagePipeline", {
      url,
      runId,
      pageType: result.pageType,
      durationMs: result.metrics.durationMs,
      status: result.status,
    });

    return result;
  } catch (err) {
    logger.error("runPagePipeline.error", {
      agent: "runPagePipeline",
      url,
      runId,
      message: err?.message || String(err),
    });
    return {
      url,
      slug,
      status: "failed",
      pageType: "unknown",
      artifacts: {},
      metrics: {
        durationMs: Date.now() - startedAt,
      },
      errors: [{ message: err?.message || String(err) }],
    };
  }
}

module.exports = {
  runPagePipeline,
  buildPagePaths,
};
