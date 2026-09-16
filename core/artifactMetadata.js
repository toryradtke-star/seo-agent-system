const SCHEMA_VERSION = "1.0";

function withArtifactMetadata(payload, meta = {}) {
  return {
    schemaVersion: SCHEMA_VERSION,
    producer: meta.producer || "unknown",
    runId: meta.runId || "",
    promptVersion: meta.promptVersion || "unknown",
    model: meta.model || "",
    createdAt: meta.createdAt || new Date().toISOString(),
    ...payload,
  };
}

module.exports = {
  SCHEMA_VERSION,
  withArtifactMetadata,
};

