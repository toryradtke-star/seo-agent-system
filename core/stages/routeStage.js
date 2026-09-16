const routePage = require("../../pageRouterAgent");

async function runRouteStage(input, context) {
  const route = routePage({
    url: input.url,
    title: input.scrapedData?.title,
    headings: input.scrapedData?.headings,
    visibleText: input.scrapedData?.first1500Words || input.scrapedData?.visibleText || "",
  });
  const pageType = route.pageType || "generic";

  const pageTypeFilter = context.options?.pageTypeFilter;
  if (pageTypeFilter && pageType !== pageTypeFilter) {
    return {
      ...input,
      pageType,
      status: "skipped",
      skipReason: `filtered_${pageType}`,
    };
  }

  return {
    ...input,
    pageType,
    route,
  };
}

module.exports = {
  runRouteStage,
};

