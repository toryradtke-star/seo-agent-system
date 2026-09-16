const runSerpIntel = require("./agents/serpIntelAgent");

function uniq(values) {
  return Array.from(new Set((values || []).filter(Boolean)));
}

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((x) => x.length > 2);
}

function estimateDifficulty(topic, rank = 1) {
  const t = String(topic || "").toLowerCase();
  if (/price|cost|compare|best/.test(t)) return "high";
  if (rank <= 3) return "high";
  if (/guide|how|tips|ideas/.test(t)) return "medium";
  return "low";
}

function buildRecommendedPage(topic, keywords, rank = 1) {
  const core = String(topic || "opportunity");
  const title = core
    .split(" ")
    .map((w) => (w ? `${w[0].toUpperCase()}${w.slice(1)}` : w))
    .join(" ");
  return {
    title: `${title} Guide`,
    searchIntent: /how|guide|tips/.test(core) ? "informational" : "commercial",
    targetKeywords: (keywords || []).slice(0, 8),
    suggestedH2Headings: [
      `What to Know About ${title}`,
      `Best Use Cases for ${title}`,
      `${title} Pricing and Options`,
      `How to Choose the Right ${title}`,
    ],
    estimatedDifficulty: estimateDifficulty(core, rank),
  };
}

async function runContentGapAgent(input = {}, options = {}) {
  const pages = Array.isArray(input.pages) ? input.pages : [];
  const siteVocabulary = new Set();
  for (const page of pages) {
    for (const token of tokenize(page.first1500Words || page.visibleText || page.title)) {
      siteVocabulary.add(token);
    }
  }

  const keywordRows = [];
  const opportunities = [];

  for (const page of pages) {
    const productEntity = String(page.productEntity || page.title || "").trim();
    if (!productEntity) continue;

    const intel = await runSerpIntel(
      {
        productEntity,
        pageType: page.pageType || "generic",
        url: page.url,
        headings: page.headings || [],
        first1500Words: page.first1500Words || "",
      },
      options
    );

    const keywordThemes = uniq(intel.keywordThemes || intel.semanticPhrases || intel.entityCoverage || []);
    const missing = keywordThemes.filter((k) => {
      const bits = tokenize(k);
      return bits.some((bit) => !siteVocabulary.has(bit));
    });

    keywordRows.push({
      url: page.url,
      productEntity,
      missingKeywords: missing.slice(0, 15),
      keywordThemes: keywordThemes.slice(0, 20),
      avgWordCount: intel.averageWordCount || 0,
      topUrls: intel.topUrls || [],
    });

    for (const [idx, topic] of missing.slice(0, 5).entries()) {
      opportunities.push(buildRecommendedPage(topic, missing, idx + 1));
    }
  }

  const dedupedRecommended = [];
  const seenTitles = new Set();
  for (const row of opportunities) {
    if (seenTitles.has(row.title)) continue;
    seenTitles.add(row.title);
    dedupedRecommended.push(row);
    if (dedupedRecommended.length >= 40) break;
  }

  const recommendedPages = dedupedRecommended;
  const keywordOpportunities = keywordRows;

  const lines = [];
  lines.push("# Content Gap Report");
  lines.push("");
  lines.push(`- Pages analyzed: ${pages.length}`);
  lines.push(`- Recommended pages: ${recommendedPages.length}`);
  lines.push("");
  lines.push("## Top Opportunities");
  for (const row of recommendedPages.slice(0, 15)) {
    lines.push(`- ${row.title} (${row.searchIntent}, ${row.estimatedDifficulty})`);
  }
  lines.push("");

  return {
    contentGapReportMd: lines.join("\n"),
    recommendedPages,
    keywordOpportunities,
  };
}

module.exports = runContentGapAgent;

