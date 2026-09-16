const rules = require("./scoringRules");

const THRESHOLD = 85;

function evaluatePdpOutput(input = {}) {
  const output = String(input.optimizedContent || "");
  const schema = input.schema || null;
  const productEntity = String(input.productEntity || "").trim().toLowerCase();

  const failedChecks = [];
  let score = 100;

  const missing = rules.missingSections(output);
  if (missing.length > 0) {
    failedChecks.push({ check: "required_sections", details: missing });
    score -= Math.min(40, missing.length * 4);
  }

  if (!rules.headingHierarchyValid(output)) {
    failedChecks.push({ check: "heading_hierarchy", details: "Invalid heading level jumps" });
    score -= 10;
  }

  if (productEntity && !output.toLowerCase().includes(productEntity)) {
    failedChecks.push({ check: "product_entity", details: `Entity not found: ${productEntity}` });
    score -= 12;
  }

  const ctaViolations = rules.ctaViolations(output);
  if (ctaViolations.length > 0) {
    failedChecks.push({ check: "cta_section_rules", details: ctaViolations });
    score -= 10;
  }

  if (rules.hasGenericHeadings(output)) {
    failedChecks.push({ check: "generic_headings", details: "Contains generic headings" });
    score -= 8;
  }

  const overviewLengthOk = rules.sectionWordCountWithinRange(output, "PRODUCT OVERVIEW TAB", 150, 260);
  if (!overviewLengthOk) {
    failedChecks.push({ check: "overview_length", details: "Overview section out of range" });
    score -= 6;
  }

  if (!rules.schemaValid(schema)) {
    failedChecks.push({ check: "schema_validation", details: "Schema is missing required fields" });
    score -= 10;
  }

  if (rules.hasLinksInHeadings(output)) {
    failedChecks.push({ check: "links_in_headings", details: "Detected links in heading tags" });
    score -= 8;
  }

  if (!/\[[^\]]+\]\((https?:\/\/|\/)/.test(output) && !/<a\s+href=/i.test(output)) {
    failedChecks.push({ check: "internal_links", details: "No internal links detected in output" });
    score -= 5;
  }

  if (score < 0) score = 0;

  return {
    score,
    failedChecks,
    retry: score < THRESHOLD,
    threshold: THRESHOLD,
  };
}

module.exports = evaluatePdpOutput;
