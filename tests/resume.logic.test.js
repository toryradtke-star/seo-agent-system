const assert = require("assert");
const fs = require("fs");
const fsp = fs.promises;
const os = require("os");
const path = require("path");
const { runPagePipeline, buildPagePaths } = require("../core/runPagePipeline");

async function run() {
  const tmp = await fsp.mkdtemp(path.join(os.tmpdir(), "seo-pipeline-"));
  const paths = buildPagePaths(tmp, "home");
  await fsp.mkdir(path.dirname(paths.optimizedPath), { recursive: true });
  await fsp.mkdir(path.dirname(paths.schemaPath), { recursive: true });
  await fsp.writeFile(paths.optimizedPath, "<p>ok</p>", "utf-8");
  await fsp.writeFile(paths.schemaPath, "{}", "utf-8");

  const res = await runPagePipeline("https://site.com/", {
    runId: "resume-test",
    outputDir: tmp,
    options: { resume: true },
    sharedCache: {},
    services: { sitePages: [] },
  });

  assert.strictEqual(res.status, "skipped");
}

module.exports = { run };
