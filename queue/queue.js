const { Queue, QueueEvents } = require("bullmq");

function redisConnection() {
  const url = process.env.REDIS_URL || "redis://127.0.0.1:6379";
  return { connection: { url } };
}

function createPipelineQueue(name = "seo-platform") {
  return new Queue(name, {
    ...redisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: 1000,
      removeOnFail: 2000,
    },
  });
}

function createQueueEvents(name = "seo-platform") {
  return new QueueEvents(name, redisConnection());
}

module.exports = {
  createPipelineQueue,
  createQueueEvents,
};
