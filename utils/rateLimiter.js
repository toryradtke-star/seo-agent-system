class Limiter {
  constructor(maxConcurrency = 4, name = "limiter") {
    this.maxConcurrency = Math.max(1, Number(maxConcurrency || 1));
    this.name = name;
    this.active = 0;
    this.queue = [];
    this.executed = 0;
  }

  stats() {
    return {
      name: this.name,
      active: this.active,
      queued: this.queue.length,
      maxConcurrency: this.maxConcurrency,
      executed: this.executed,
    };
  }

  async run(task) {
    if (typeof task !== "function") {
      throw new Error("Limiter task must be a function");
    }

    if (this.active >= this.maxConcurrency) {
      await new Promise((resolve) => this.queue.push(resolve));
    }

    this.active += 1;
    this.executed += 1;
    try {
      return await task();
    } finally {
      this.active -= 1;
      const next = this.queue.shift();
      if (next) next();
    }
  }
}

const limitHTTP = new Limiter(Number(process.env.LIMIT_HTTP || 8), "http");
const limitSERP = new Limiter(Number(process.env.LIMIT_SERP || 4), "serp");
const limitClaude = new Limiter(Number(process.env.LIMIT_CLAUDE || 3), "claude");

module.exports = {
  Limiter,
  limitHTTP,
  limitSERP,
  limitClaude,
};
