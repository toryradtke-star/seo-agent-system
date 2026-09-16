const path = require("path");
const runSerpIntel = require("./agents/serpIntelAgent");

async function analyzeSerp(input = {}) {
  const query = String(input.productEntity || input.query || input.url || "").trim();
  const intel = await runSerpIntel(
    {
      query,
      productEntity: input.productEntity || query,
      pageType: input.pageType || "generic",
      url: input.url,
      headings: input.headings || [],
      first1500Words: input.first1500Words || "",
    },
    {
      cacheDir: path.join(process.cwd(), "output", "site", "cache", "serp"),
      datasetDir: path.join(process.cwd(), "output", "site", "dataset", "serp"),
    }
  );

  return {
    query: intel.query,
    keywordThemes: (intel.semanticPhrases || []).slice(0, 20),
    commonHeadings: intel.headingPatterns || [],
    avgWordCount: intel.averageWordCount || 0,
    faqPatterns: intel.faqPatterns || [],
    relatedEntities: intel.entityCoverage || [],
    structuredDataPresence: (intel.schemaTypes || []).length > 0 ? "yes" : "unknown",
    schemaTypes: intel.schemaTypes || [],
    topUrls: intel.topUrls || [],
  };
}

module.exports = analyzeSerp;
