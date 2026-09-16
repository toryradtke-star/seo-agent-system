async function runCategoryAgent(context = {}) {
  const title = context.scrapedData?.title || "";
  const headings = context.scrapedData?.headings || [];
  const suggestions = [
    "Expand category intro copy with primary commercial keyword and buying intent.",
    "Add links to top subcategories and best-selling products.",
    "Include comparison snippets to improve category-level relevance.",
  ];

  return {
    pageType: "category",
    title,
    headings,
    suggestions,
    optimizedHtml: `<h1>${title}</h1><p>${suggestions.join(" ")}</p>`,
  };
}

module.exports = runCategoryAgent;
