const { createLogger } = require("../logger");

const logger = createLogger();

const WEIGHTS = {
  wordCount: 10,
  headings: 15,
  entityCoverage: 25,
  faqCoverage: 15,
  schema: 10,
  internalLinks: 10,
  structure: 15,
};

function normalize(s) {
  return String(s || "").toLowerCase();
}

function countWords(text) {
  return String(text || "").replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
}

function includesAny(text, terms = []) {
  const lower = normalize(text);
  return terms.filter((t) => lower.includes(normalize(t)));
}

function scoreContent(input = {}) {
  const started = Date.now();
  const content = String(input.optimizedContent || "");
  const serp = input.serpIntel || {};

  let score = 0;
  const missingEntities = [];
  const missingHeadings = [];
  const improvementSuggestions = [];

  const words = countWords(content);
  const avgWords = Number(serp.averageWordCount || 0);
  if (avgWords <= 0 || (words >= avgWords * 0.6 && words <= avgWords * 1.4)) {
    score += WEIGHTS.wordCount;
  } else {
    improvementSuggestions.push("Adjust content length closer to ranking-page average.");
  }

  const headingHits = includesAny(content, serp.headingPatterns || []);
  const headingRatio = (serp.headingPatterns || []).length
    ? headingHits.length / Math.min(10, serp.headingPatterns.length)
    : 1;
  score += WEIGHTS.headings * Math.min(1, headingRatio);
  for (const h of (serp.headingPatterns || []).slice(0, 10)) {
    if (!normalize(content).includes(normalize(h))) missingHeadings.push(h);
  }

  const entityHits = includesAny(content, serp.entityCoverage || []);
  const entityRatio = (serp.entityCoverage || []).length
    ? entityHits.length / Math.min(15, serp.entityCoverage.length)
    : 1;
  score += WEIGHTS.entityCoverage * Math.min(1, entityRatio);
  for (const e of (serp.entityCoverage || []).slice(0, 20)) {
    if (!normalize(content).includes(normalize(e))) missingEntities.push(e);
  }

  const faqHits = includesAny(content, serp.faqPatterns || []);
  const faqRatio = (serp.faqPatterns || []).length
    ? faqHits.length / Math.min(8, serp.faqPatterns.length)
    : 1;
  score += WEIGHTS.faqCoverage * Math.min(1, faqRatio);

  if (/"@context"\s*:\s*"https:\/\/schema.org"|schema\.org/i.test(content) || input.schemaPresent) {
    score += WEIGHTS.schema;
  } else {
    improvementSuggestions.push("Include schema-aligned structured data output.");
  }

  if (/\[[^\]]+\]\((https?:\/\/|\/)/.test(content) || /<a\s+href=/i.test(content)) {
    score += WEIGHTS.internalLinks;
  } else {
    improvementSuggestions.push("Add contextual internal links in paragraph copy.");
  }

  const requiredSections = [
    "PRODUCT HEADER",
    "PRODUCT OVERVIEW TAB",
    "MATERIAL OPTIONS TAB",
    "FINISHING OPTIONS TAB",
    "PRODUCTION TIMES TAB",
    "SHIPPING GUIDELINES TAB",
    "ARTWORK TAB",
    "POST-TAB CONTENT",
    "FAQ",
  ];
  const sectionHits = requiredSections.filter((s) => content.includes(s)).length;
  score += WEIGHTS.structure * (sectionHits / requiredSections.length);

  if (missingEntities.length > 0) {
    improvementSuggestions.push("Cover missing high-value entities from SERP leaders.");
  }
  if (missingHeadings.length > 0) {
    improvementSuggestions.push("Align more section headings with recurring SERP patterns.");
  }

  const result = {
    score: Math.max(0, Math.min(100, Math.round(score))),
    missingEntities: missingEntities.slice(0, 15),
    missingHeadings: missingHeadings.slice(0, 10),
    improvementSuggestions: Array.from(new Set(improvementSuggestions)).slice(0, 8),
  };

  logger.metric("contentScorer", {
    url: input.url || "",
    score: result.score,
    durationMs: Date.now() - started,
  });

  return result;
}

module.exports = scoreContent;
