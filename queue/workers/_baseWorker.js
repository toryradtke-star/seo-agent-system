const { Worker, Queue } = require("bullmq");

function redisConnection() {
  const url = process.env.REDIS_URL || "redis://127.0.0.1:6379";
  return { connection: { url } };
}

function createDeadLetterQueue(name = "seo-platform-dlq") {
  return new Queue(name, redisConnection());
}

function createStageWorker(queueName, jobName, handler) {
  const dlq = createDeadLetterQueue();

  const worker = new Worker(
    queueName,
    async (job) => {
      if (job.name !== jobName) return null;
      try {
        return await handler(job);
      } catch (err) {
        try {
          const data = job.data || {};
          if (data.runId && data.outputDir) {
            const rt = require("../pipelineRuntime");
            const paths = rt.getRunPaths(data.outputDir, data.runId);
            await rt.updateRunState(paths, (state) => {
              state.failed = Number(state.failed || 0) + 1;
              state.pages = state.pages || {};
              const url = data.url || `job-${job.id}`;
              state.pages[url] = {
                ...(state.pages[url] || {}),
                status: "failed",
                error: err?.message || String(err),
                failedStage: jobName,
              };
            });
          }
        } catch (_) {
          // ignore state update failures
        }
        await dlq.add("dead_letter", {
          stage: jobName,
          payload: job.data,
          error: err?.message || String(err),
          failedAt: new Date().toISOString(),
        });
        throw err;
      }
    },
    {
      ...redisConnection(),
      concurrency: Number(process.env.QUEUE_WORKER_CONCURRENCY || 4),
    }
  );

  return worker;
}

module.exports = {
  createStageWorker,
};
