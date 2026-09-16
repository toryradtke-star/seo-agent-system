const assert = require("assert");
const { withArtifactMetadata, SCHEMA_VERSION } = require("../core/artifactMetadata");

async function run() {
  const wrapped = withArtifactMetadata(
    { data: { hello: "world" } },
    { producer: "test", runId: "r1", promptVersion: "p1", model: "m1" }
  );
  assert.strictEqual(wrapped.schemaVersion, SCHEMA_VERSION);
  assert.strictEqual(wrapped.producer, "test");
  assert.strictEqual(wrapped.runId, "r1");
  assert.ok(wrapped.createdAt);
}

module.exports = { run };

