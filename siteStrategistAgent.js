function top(list, count) {
  return (list || []).slice(0, count);
}

function flattenKeywordClusters(clusterMap = {}) {
  const rows = [];
  for (const [url, data] of Object.entries(clusterMap)) {
    const clusters = Array.isArray(data?.clusters) ? data.clusters : [];
    for (const cluster of clusters) {
      rows.push({
        url,
        topic: cluster.topic,
        keywords: cluster.keywords || [],
      });
    }
  }
  return rows;
}

function keywordGapAnalysis(clusterRows = [], audits = []) {
  const gaps = [];

  for (const row of clusterRows) {
    const audit = audits.find((a) => a.url === row.url);
    const content = String(audit?.seoRecommendations || "").toLowerCase();

    const missing = (row.keywords || []).filter((k) => !content.includes(String(k).toLowerCase()));
    if (missing.length > 0) {
      gaps.push({
        url: row.url,
        topic: row.topic,
        missingKeywords: missing.slice(0, 5),
      });
    }
  }

  return gaps.slice(0, 20);
}

function recommendedBlogTopics(serpMap = {}, keywordClusterMap = {}) {
  const topics = [];
  for (const [url, serp] of Object.entries(serpMap)) {
    const entity = keywordClusterMap[url]?.coreKeyword || "product";
    const faqPatterns = serp?.faqPatterns || [];
    for (const pattern of faqPatterns) {
      if (pattern === "how-to") topics.push(`How to choose the right ${entity} for your use case`);
      if (pattern === "shipping") topics.push(`${entity} shipping and turnaround timelines explained`);
      if (pattern === "pricing") topics.push(`${entity} pricing guide: size, material, and finishing factors`);
      if (pattern === "sizing") topics.push(`${entity} sizing guide for first-time buyers`);
    }
  }
  return Array.from(new Set(topics)).slice(0, 12);
}

function buildSiteStrategy(input = {}) {
  const audits = Array.isArray(input.pageAudits) ? input.pageAudits : [];
  const serpPatterns = input.serpPatterns || {};
  const keywordClusters = input.keywordClusters || {};
  const internalLinkGraph = input.internalLinkGraph || { linkMap: [] };

  const byType = audits.reduce((acc, row) => {
    const t = row.pageType || "generic";
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});

  const thin = audits.filter((a) => a.contentQuality?.thinContent);
  const weakInternal = audits.filter((a) => a.internalLinks?.orphanPageRisk);
  const missingMeta = audits.filter((a) => !a.technicalSEO?.metaDescription);

  const contentGaps = top(thin.map((a) => a.url), 10);
  const internalLinkOpportunities = top(weakInternal.map((a) => a.url), 10);

  const pillarPageRecommendations = [
    "Create pillar pages for each high-volume product family and link child PDPs.",
    "Build comparison hubs between adjacent product types to support cross-linking.",
    "Standardize template-level FAQ + specification blocks on top revenue PDPs.",
  ];

  const missingCategoryPages = [
    "Long-tail category pages by use-case intent (event, construction, retail).",
    "Material-specific category collections for high-value terms.",
    "Shipping/turnaround-focused category hubs for urgent-order intent.",
  ];

  const clusterRows = flattenKeywordClusters(keywordClusters);
  const keywordGaps = keywordGapAnalysis(clusterRows, audits);

  const internalLinkImprovements = top(
    (internalLinkGraph.linkMap || []).map((x) => `${x.sourcePage} -> (${x.anchor}) -> ${x.targetPage}`),
    30
  );

  const blogTopics = recommendedBlogTopics(serpPatterns, keywordClusters);

  return {
    summary: {
      totalPages: audits.length,
      pageTypes: byType,
      thinPages: thin.length,
      weakInternalLinkPages: weakInternal.length,
      missingMetaPages: missingMeta.length,
      serpAnalyzedPages: Object.keys(serpPatterns).length,
      keywordClusteredPages: Object.keys(keywordClusters).length,
      internalLinkRecommendations: (internalLinkGraph.linkMap || []).length,
    },
    contentGaps,
    internalLinkOpportunities,
    pillarPageRecommendations,
    missingCategoryPages,
    keywordGaps,
    internalLinkImprovements,
    recommendedBlogTopics: blogTopics,
  };
}

module.exports = buildSiteStrategy;
