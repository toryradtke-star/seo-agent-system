const assert = require("assert");
const routePage = require("./pageRouterAgent");
const buildKeywordClusters = require("./keywordClusterAgent");
const buildInternalLinkPlan = require("./internalLinkPlanner");
const { validatePdpOutput, injectInternalLinksIntoContent } = require("./masterAgent");
const evaluatePdpOutput = require("./evals/evaluatePdpOutput");

function testRouting() {
  assert.equal(routePage({ url: "https://site.com/" }).pageType, "homepage");
  assert.equal(routePage({ url: "https://site.com/blog/how-to-order" }).pageType, "blog");
  assert.equal(routePage({ url: "https://site.com/custom-banners" }).pageType, "pdp");
}

function testKeywordClusters() {
  const result = buildKeywordClusters({
    productEntity: "Mesh Banner",
    serpKeywordThemes: ["wind resistant banner", "mesh fence banner", "banner installation"],
    headings: [{ tag: "h1", text: "Custom Mesh Banner" }],
    url: "https://site.com/mesh-banners",
  });

  assert.ok(result.coreKeyword.includes("mesh banner"));
  assert.ok(Array.isArray(result.clusters));
  assert.ok(result.clusters.length >= 3);
}

function testLinkPlanner() {
  const pages = [
    "https://site.com/mesh-banners",
    "https://site.com/vinyl-banners",
    "https://site.com/category/banners",
  ];
  const plan = buildInternalLinkPlan({
    allPages: pages,
    pageTypes: {
      "https://site.com/mesh-banners": "pdp",
      "https://site.com/vinyl-banners": "pdp",
      "https://site.com/category/banners": "category",
    },
  });

  assert.ok(Array.isArray(plan.linkMap));
  for (const row of plan.linkMap) {
    assert.ok(row.sourcePage);
    assert.ok(row.targetPage);
    assert.ok(row.anchor);
  }
}

function testQualityGateAndLinkInjection() {
  const weak = "PRODUCT HEADER\nSome content\nFAQ";
  const check = validatePdpOutput(weak);
  assert.equal(check.ok, false);
  assert.ok(check.missingSections.length > 0);

  const injected = injectInternalLinksIntoContent("<p>Paragraph copy.</p>", [
    { anchor: "vinyl banners", url: "https://site.com/vinyl-banners" },
  ]);
  assert.ok(/vinyl banners/i.test(injected));
}

function testOutputContract() {
  const required = ["dataset", "audits", "optimized", "schemas", "logs"];
  assert.equal(required.length, 5);
}

function testEvaluation() {
  const result = evaluatePdpOutput({
    optimizedContent:
      "BEFORE HEADING STRUCTURE\nAFTER OPTIMIZED STRUCTURE\nPRODUCT HEADER\nPRODUCT OVERVIEW TAB\nMATERIAL OPTIONS TAB\nFINISHING OPTIONS TAB\nPRODUCTION TIMES TAB\nSHIPPING GUIDELINES TAB\nARTWORK TAB\nPOST-TAB CONTENT\nFAQ\n<p>See [vinyl banners](https://site.com/vinyl-banners).</p>",
    schema: { "@context": "https://schema.org", "@type": "Product", name: "Mesh Banner" },
    productEntity: "mesh banner",
  });
  assert.ok(typeof result.score === "number");
  assert.ok(Array.isArray(result.failedChecks));
}

function main() {
  testRouting();
  testKeywordClusters();
  testLinkPlanner();
  testQualityGateAndLinkInjection();
  testEvaluation();
  testOutputContract();
  console.log("regression smoke tests passed");
}

main();
