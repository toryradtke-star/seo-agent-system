const assert = require("assert");
const { runWithRetry, MAX_OPTIMIZATION_ATTEMPTS } = require("../core/retryPolicy");

async function run() {
  let attempts = 0;
  const out = await runWithRetry(async () => {
    attempts += 1;
    if (attempts < 2) throw new Error("status code 503");
    return "ok";
  }, { maxAttempts: MAX_OPTIMIZATION_ATTEMPTS });

  assert.strictEqual(out.result, "ok");
  assert.strictEqual(out.retryMeta.attemptCount, 2);
  assert.ok(out.retryMeta.timestamp);
}

module.exports = { run };

