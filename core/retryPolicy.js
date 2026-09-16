const MAX_OPTIMIZATION_ATTEMPTS = 2;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffMs(attempt, baseMs = 1000) {
  const jitter = Math.floor(Math.random() * 300);
  return baseMs * Math.pow(2, attempt - 1) + jitter;
}

function defaultIsRetryable(err) {
  const msg = String(err?.message || err || "").toLowerCase();
  return (
    msg.includes("status code 503")
    || msg.includes("status code 429")
    || msg.includes("status code 502")
    || msg.includes("status code 504")
    || msg.includes("overloaded")
    || msg.includes("timeout")
    || msg.includes("econnreset")
    || msg.includes("socket hang up")
  );
}

function buildRetryMeta(attemptCount, retryReason = null) {
  return {
    attemptCount: Number(attemptCount || 1),
    retryReason: retryReason || null,
    timestamp: new Date().toISOString(),
  };
}

async function runWithRetry(task, options = {}) {
  const maxAttempts = Math.max(1, Number(options.maxAttempts || 1));
  const isRetryable = typeof options.isRetryable === "function" ? options.isRetryable : defaultIsRetryable;
  const onRetry = typeof options.onRetry === "function" ? options.onRetry : null;
  const retryReason = options.retryReason || "retryable_error";

  let lastErr = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const result = await task(attempt);
      return {
        result,
        retryMeta: buildRetryMeta(attempt, attempt > 1 ? retryReason : null),
      };
    } catch (err) {
      lastErr = err;
      if (attempt >= maxAttempts || !isRetryable(err)) break;
      if (onRetry) {
        await onRetry({
          ...buildRetryMeta(attempt, retryReason),
          nextAttempt: attempt + 1,
          error: err?.message || String(err),
        });
      }
      await sleep(backoffMs(attempt, Number(options.baseBackoffMs || 1000)));
    }
  }

  if (lastErr && !lastErr.retryMeta) {
    lastErr.retryMeta = buildRetryMeta(maxAttempts, retryReason);
  }
  throw lastErr || new Error("retry policy exhausted");
}

module.exports = {
  MAX_OPTIMIZATION_ATTEMPTS,
  buildRetryMeta,
  defaultIsRetryable,
  runWithRetry,
};

