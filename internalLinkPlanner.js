const { createLogger } = require("./logger");

const logger = createLogger();

function normalizeUrlPath(urlString) {
  try {
    return new URL(urlString).pathname || "/";
  } catch (_) {
    return "/";
  }
}

function slugToAnchor(urlString) {
  const p = normalizeUrlPath(urlString).replace(/^\/+|\/+$/g, "");
  const part = p.split("/").filter(Boolean).pop() || "home";
  return part.replace(/[-_]+/g, " ").toLowerCase();
}

function sectionRoot(urlString) {
  const parts = normalizeUrlPath(urlString).split("/").filter(Boolean);
  return parts[0] || "root";
}

function sameSection(a, b) {
  return sectionRoot(a) === sectionRoot(b);
}

function buildInternalLinkPlan(input = {}) {
  const started = Date.now();
  const allPages = Array.isArray(input.allPages) ? input.allPages : [];
  const pageTypes = input.pageTypes || {};

  const linkMap = [];
  const usedAnchorBySource = new Map();

  for (const sourcePage of allPages) {
    const sourceType = pageTypes[sourcePage] || "generic";
    const usedAnchors = usedAnchorBySource.get(sourcePage) || new Set();
    const candidates = [];

    for (const targetPage of allPages) {
      if (targetPage === sourcePage) continue;
      const targetType = pageTypes[targetPage] || "generic";

      let score = 0;
      if (sourceType === "pdp" && targetType === "category") score += 3;
      if (sourceType === "pdp" && targetType === "pdp" && sameSection(sourcePage, targetPage)) score += 2;
      if (sourceType === "category" && targetType === "pdp") score += 2;
      if (sameSection(sourcePage, targetPage)) score += 1;

      if (score > 0) {
        candidates.push({ targetPage, score });
      }
    }

    const picks = [];
    for (const c of candidates.sort((a, b) => b.score - a.score)) {
      const anchor = slugToAnchor(c.targetPage);
      if (!anchor || usedAnchors.has(anchor)) continue;
      usedAnchors.add(anchor);
      picks.push({
        sourcePage,
        anchor,
        targetPage: c.targetPage,
      });
      if (picks.length >= 5) break;
    }

    const limited = picks.slice(0, 5);
    if (limited.length > 0) linkMap.push(...limited);
    usedAnchorBySource.set(sourcePage, usedAnchors);
  }

  logger.metric("internalLinkPlanner", {
    pages: allPages.length,
    recommendations: linkMap.length,
    durationMs: Date.now() - started,
  });

  return { linkMap };
}

module.exports = buildInternalLinkPlan;
