const analyzeSerp = require("../../serpAnalysisAgent");
const buildKeywordClusters = require("../../keywordClusterAgent");
const analyzeInternalLinks = require("../../internalLinkAgent");

async function runAnalyzeStage(input, context) {
  const scrapedData = input.scrapedData || {};
  const pageType = input.pageType || "generic";

  const budgets = context.sharedCache.budgets || {};
  const maxSerpCalls = Number(context.options?.maxSerpCalls || 0);
  if (maxSerpCalls > 0 && Number(budgets.serpCalls || 0) >= maxSerpCalls) {
    return {
      ...input,
      serpInsights: {},
      keywordClusters: buildKeywordClusters({
        productEntity: scrapedData.productEntity,
        serpKeywordThemes: [],
        headings: scrapedData.headings || [],
        url: input.url,
      }),
      internalLinksAnalysis: await analyzeInternalLinks({
        url: input.url,
        productEntity: scrapedData.productEntity || "",
        pageType,
        existingContent: scrapedData.first1500Words || scrapedData.visibleText || "",
        sitePages: context.services.sitePages || [],
      }),
    };
  }

  const serpInsights = await analyzeSerp({
    productEntity: scrapedData.productEntity || scrapedData.title || "",
    pageType,
    url: input.url,
    headings: scrapedData.headings || [],
    first1500Words: scrapedData.first1500Words || scrapedData.visibleText || "",
  });
  context.sharedCache.budgets = context.sharedCache.budgets || {};
  context.sharedCache.budgets.serpCalls = Number(context.sharedCache.budgets.serpCalls || 0) + 1;

  const keywordClusters = buildKeywordClusters({
    productEntity: scrapedData.productEntity,
    serpKeywordThemes: serpInsights.keywordThemes || [],
    headings: scrapedData.headings || [],
    url: input.url,
  });

  const internalLinksAnalysis = await analyzeInternalLinks({
    url: input.url,
    productEntity: scrapedData.productEntity || "",
    pageType,
    existingContent: scrapedData.first1500Words || scrapedData.visibleText || "",
    sitePages: context.services.sitePages || [],
  });

  return {
    ...input,
    serpInsights,
    keywordClusters,
    internalLinksAnalysis,
  };
}

module.exports = {
  runAnalyzeStage,
};

