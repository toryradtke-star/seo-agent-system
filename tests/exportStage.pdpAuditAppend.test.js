const assert = require("assert");
const fs = require("fs");
const fsp = fs.promises;
const os = require("os");
const path = require("path");
const { runExportStage } = require("../core/stages/exportStage");

function countMatches(text, needle) {
  const m = String(text || "").match(new RegExp(needle, "g"));
  return m ? m.length : 0;
}

async function run() {
  const tmp = await fsp.mkdtemp(path.join(os.tmpdir(), "export-stage-"));
  const paths = {
    optimizedPath: path.join(tmp, "page.optimized.html"),
    auditJsonPath: path.join(tmp, "pages", "page.audit.json"),
    auditPath: path.join(tmp, "pages", "page.audit.md"),
    datasetPath: path.join(tmp, "dataset", "page.dataset.json"),
  };

  await fsp.mkdir(path.dirname(paths.optimizedPath), { recursive: true });
  await fsp.writeFile(paths.optimizedPath, "<h1>Test PDP</h1><p>Body content.</p>", "utf-8");

  const input = {
    url: "https://example.com/product/test",
    slug: "product--test",
    pageType: "pdp",
    productPage: true,
    optimizedContent: "<h1>Test PDP</h1><p>Body content.</p>",
    scrapedData: { title: "Test PDP", headings: [] },
    serpInsights: {},
    keywordClusters: {},
    internalLinksAnalysis: {},
    technicalSEO: {},
    contentQuality: {},
    evaluation: null,
    contentScore: null,
    retryMetadata: null,
    paths,
  };
  const context = {
    runId: "test-run",
    options: {
      sendDocs: false,
      promptVersion: "test",
      model: "test-model",
    },
  };

  await runExportStage(input, context);
  await runExportStage(input, context);

  const html = await fsp.readFile(paths.optimizedPath, "utf-8");
  const lower = html.toLowerCase();
  assert.ok(html.includes("SEO ANALYSIS & OPTIMIZATION SUMMARY"));
  assert.strictEqual(countMatches(html, "SEO ANALYSIS & OPTIMIZATION SUMMARY"), 1);
  assert.ok(!html.includes("<section class=\"seo-analysis-audit\">"));
  assert.ok(lower.includes("meta title structure"));
  assert.ok(lower.includes("content depth"));
  assert.ok(lower.includes("contextual internal link placement"));
  assert.ok(lower.includes("semantic keyword groupings"));
}

module.exports = { run };
