const fs = require("fs");
const fsp = fs.promises;
const path = require("path");

function createLogger(options = {}) {
  const logFile = options.logFile ? path.resolve(options.logFile) : null;
  const buffer = [];
  let flushing = false;

  async function flush() {
    if (flushing || !logFile || buffer.length === 0) return;
    flushing = true;
    const chunk = buffer.splice(0, buffer.length).join("");
    try {
      await fsp.mkdir(path.dirname(logFile), { recursive: true });
      await fsp.appendFile(logFile, chunk, "utf-8");
    } catch (_) {
      // Logging failures should never fail the pipeline.
    } finally {
      flushing = false;
      if (buffer.length > 0) {
        setImmediate(() => {
          flush().catch(() => {
            // ignore
          });
        });
      }
    }
  }

  function emit(level, event, data = {}) {
    const entry = {
      ts: new Date().toISOString(),
      level,
      event,
      ...data,
    };

    const line = JSON.stringify(entry);
    if (logFile) {
      buffer.push(line + "\n");
      setImmediate(() => {
        flush().catch(() => {
          // ignore
        });
      });
    }
    if (level === "error") {
      console.error(line);
    } else {
      console.log(line);
    }
    return entry;
  }

  return {
    info: (event, data) => emit("info", event, data),
    warn: (event, data) => emit("warn", event, data),
    error: (event, data) => emit("error", event, data),
    metric: (agent, data) => emit("info", "metric", { agent, ...data }),
  };
}

module.exports = {
  createLogger,
};

