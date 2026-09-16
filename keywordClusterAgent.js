const { createLogger } = require("./logger");

const logger = createLogger();

function normalizeToken(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function baseVariants(core) {
  const c = normalizeToken(core);
  const short = c || "custom product";
  return [
    `${short} printing`,
    `${short} custom sizes`,
    `${short} design upload`,
    `${short} online order`,
    `${short} near me`,
  ];
}

function buildClusters(coreKeyword, serpKeywordThemes) {
  const core = normalizeToken(coreKeyword);
  const source = Array.from(new Set([...(serpKeywordThemes || []).map(normalizeToken).filter(Boolean), ...baseVariants(core)]));

  const groups = [
    { topic: "installation", match: /(install|mount|fence|setup|hardware|hang)/, keywords: [] },
    { topic: "durability", match: /(durable|weather|wind|outdoor|uv|waterproof|perforated)/, keywords: [] },
    { topic: "pricing", match: /(price|cost|cheap|quote|bulk)/, keywords: [] },
    { topic: "customization", match: /(custom|design|artwork|upload|template|print)/, keywords: [] },
    { topic: "shipping", match: /(shipping|delivery|turnaround|production|rush)/, keywords: [] },
  ];

  for (const phrase of source) {
    for (const group of groups) {
      if (group.match.test(phrase) && !group.keywords.includes(phrase)) {
        group.keywords.push(phrase);
      }
    }
  }

  for (const group of groups) {
    if (group.keywords.length === 0) {
      group.keywords = baseVariants(`${core} ${group.topic}`).slice(0, 3);
    }
    group.keywords = group.keywords.slice(0, 8);
  }

  return groups;
}

function buildKeywordClusters(input = {}) {
  const started = Date.now();
  const productEntity = input.productEntity || (Array.isArray(input.headings) ? input.headings[0]?.text : "") || "product";
  const coreKeyword = normalizeToken(productEntity);
  const serpKeywordThemes = Array.isArray(input.serpKeywordThemes) ? input.serpKeywordThemes : [];

  const result = {
    coreKeyword,
    clusters: buildClusters(coreKeyword, serpKeywordThemes),
  };

  logger.metric("keywordClusterAgent", {
    url: input.url || "",
    coreKeyword,
    clusterCount: result.clusters.length,
    durationMs: Date.now() - started,
  });

  return result;
}

module.exports = buildKeywordClusters;
