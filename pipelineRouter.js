const { runAuditPipeline } = require("./pipelines/auditPipeline");
const { runPdpPipeline } = require("./pipelines/pdpPipeline");
const { runGapPipeline } = require("./pipelines/gapPipeline");
const { runFullPipeline } = require("./pipelines/fullPipeline");

async function runPipeline(mode, context = {}) {
  const normalizedMode = String(mode || "full").toLowerCase().trim();
  switch (normalizedMode) {
    case "audit":
      return runAuditPipeline(context);
    case "optimize":
      return runPdpPipeline(context);
    case "gaps":
      return runGapPipeline(context);
    case "full":
    default:
      return runFullPipeline(context);
  }
}

module.exports = { runPipeline };

