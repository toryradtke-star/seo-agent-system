const REQUIRED_SECTIONS = [
  "BEFORE HEADING STRUCTURE",
  "AFTER OPTIMIZED STRUCTURE",
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

const GENERIC_HEADING_PATTERNS = [
  /\bOverview\b/i,
  /\bProduct Details\b/i,
  /\bProduct Information\b/i,
  /\bSpecifications\b/i,
];

function missingSections(output) {
  const text = String(output || "");
  return REQUIRED_SECTIONS.filter((section) => !text.includes(section));
}

function hasGenericHeadings(output) {
  const text = String(output || "");
  return GENERIC_HEADING_PATTERNS.some((rx) => rx.test(text));
}

function ctaViolations(output) {
  const text = String(output || "");
  const restrictedTerms = /(order|buy|purchase|get started|order now|customize now)/i;

  const restrictedSections = [
    "MATERIAL OPTIONS TAB",
    "FINISHING OPTIONS TAB",
    "PRODUCTION TIMES TAB",
    "SHIPPING GUIDELINES TAB",
    "ARTWORK TAB",
  ];

  const violations = [];
  for (const section of restrictedSections) {
    const start = text.indexOf(section);
    if (start < 0) continue;
    const slice = text.slice(start, start + 700);
    if (restrictedTerms.test(slice)) violations.push(section);
  }
  return violations;
}

function hasLinksInHeadings(output) {
  const text = String(output || "");
  return /<h[1-6][^>]*>[^<]*(https?:\/\/|<a\s)/i.test(text);
}

function schemaValid(schemaObj) {
  if (!schemaObj || typeof schemaObj !== "object") return false;
  if (!schemaObj["@context"]) return false;
  if (!schemaObj["@type"]) return false;
  return true;
}

function headingHierarchyValid(output) {
  const text = String(output || "");
  const tags = [];
  const regex = /<h([1-6])\b/gi;
  let match;
  while ((match = regex.exec(text))) {
    tags.push(Number(match[1]));
  }
  for (let i = 1; i < tags.length; i += 1) {
    if (tags[i] - tags[i - 1] > 1) return false;
  }
  return true;
}

function sectionWordCountWithinRange(output, section, minWords, maxWords) {
  const text = String(output || "");
  const start = text.indexOf(section);
  if (start < 0) return false;
  const slice = text.slice(start, start + 1300);
  const words = slice.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  return words >= minWords && words <= maxWords;
}

module.exports = {
  missingSections,
  hasGenericHeadings,
  ctaViolations,
  hasLinksInHeadings,
  schemaValid,
  headingHierarchyValid,
  sectionWordCountWithinRange,
  REQUIRED_SECTIONS,
};
