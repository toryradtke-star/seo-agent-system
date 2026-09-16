const assert = require("assert");
const fs = require("fs");
const path = require("path");

async function run() {
  const file = fs.readFileSync(path.join(__dirname, "..", "queue", "workers", "scrapeWorker.js"), "utf-8");
  assert.ok(/runPagePipeline/.test(file), "scrapeWorker should call runPagePipeline");
  assert.ok(/queuedFinal/.test(file), "scrapeWorker should finalize queue flow");
}

module.exports = { run };

