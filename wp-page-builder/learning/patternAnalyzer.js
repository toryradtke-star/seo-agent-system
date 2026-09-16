export function analyzePatterns(patterns = [], filters = {}) {
  const filtered = patterns.filter((pattern) => matchesFilters(pattern, filters));
  const ranked = filtered
    .map((pattern) => ({
      ...pattern,
      confidence: determineConfidence(pattern.usageCount || 0)
    }))
    .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));

  return {
    totalPatterns: ranked.length,
    topPatterns: ranked,
    mostCommon: ranked[0] || null
  };
}

export function determineConfidence(usageCount) {
  if (usageCount > 5) {
    return "high";
  }
  if (usageCount > 2) {
    return "medium";
  }
  return "low";
}

function matchesFilters(pattern, filters) {
  if (filters.pageType && pattern.pageType !== filters.pageType) {
    return false;
  }
  if (filters.theme && pattern.theme !== filters.theme) {
    return false;
  }
  return true;
}
