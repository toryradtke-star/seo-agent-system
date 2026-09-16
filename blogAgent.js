async function runBlogAgent(context = {}) {
  const title = context.scrapedData?.title || "";
  const suggestions = [
    "Strengthen topical depth with structured H2 sections.",
    "Add contextual links to related PDPs and categories.",
    "Add a clear conversion bridge near conclusion.",
  ];

  return {
    pageType: "blog",
    title,
    suggestions,
    optimizedHtml: `<h1>${title}</h1><p>${suggestions.join(" ")}</p>`,
  };
}

module.exports = runBlogAgent;
