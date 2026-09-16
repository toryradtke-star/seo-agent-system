const axios = require("axios");
const cheerio = require("cheerio");
const { limitHTTP } = require("./utils/rateLimiter");
const { productTermPattern } = require("./config/vertical");

const PRODUCT_TERM = productTermPattern();

const USER_AGENT = "Mozilla/5.0";
const REQUEST_TIMEOUT_MS = 15000;
const MAX_BROKEN_LINK_CHECKS = 20;

function unique(arr) {
  return Array.from(new Set(arr));
}

function normalizeUrl(url) {
  const u = new URL(url);
  u.hash = "";
  return u.toString();
}

function tokenize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function slugToAnchor(urlString) {
  try {
    const p = new URL(urlString).pathname.replace(/^\/+|\/+$/g, "");
    const segment = p.split("/").filter(Boolean).pop() || "home";
    return segment.replace(/[-_]+/g, " ").trim();
  } catch (_) {
    return "related page";
  }
}

function extractInternalLinks(pageUrl, html) {
  const root = new URL(pageUrl);
  const $ = cheerio.load(html || "");
  const internalLinks = [];
  let relativeCount = 0;
  let absoluteCount = 0;

  $("a[href]").each((_, el) => {
    const href = ($(el).attr("href") || "").trim();
    if (!href) return;
    if (/^(mailto:|tel:|javascript:)/i.test(href)) return;

    try {
      if (/^(\/|\.\/|\.\.\/)/.test(href)) relativeCount += 1;
      if (/^https?:\/\//i.test(href)) absoluteCount += 1;

      const normalized = normalizeUrl(new URL(href, pageUrl).toString());
      const u = new URL(normalized);
      if (u.hostname !== root.hostname) return;
      internalLinks.push(normalized);
    } catch (_) {
      // ignore invalid urls
    }
  });

  return {
    internalLinks: unique(internalLinks),
    relativeCount,
    absoluteCount,
  };
}

async function checkBrokenInternalLinks(internalLinks) {
  const toCheck = internalLinks.slice(0, MAX_BROKEN_LINK_CHECKS);
  const broken = [];

  for (const url of toCheck) {
    try {
      const res = await limitHTTP.run(() => axios.get(url, {
        headers: { "User-Agent": USER_AGENT },
        timeout: REQUEST_TIMEOUT_MS,
        validateStatus: () => true,
      }));
      if (res.status >= 400) broken.push(url);
    } catch (_) {
      broken.push(url);
    }
  }

  return broken;
}

function suggestInternalLinks(input = {}) {
  const pageUrl = String(input.url || "");
  const productEntity = String(input.productEntity || "");
  const existingContent = String(input.existingContent || "");
  const sitePages = Array.isArray(input.sitePages) ? input.sitePages : [];

  const contentTokens = new Set([...tokenize(existingContent), ...tokenize(productEntity)]);
  const scored = [];

  for (const candidate of sitePages) {
    if (!candidate || candidate === pageUrl) continue;
    const anchor = slugToAnchor(candidate);
    const tokens = tokenize(anchor);
    let score = 0;
    for (const token of tokens) {
      if (contentTokens.has(token)) score += 2;
      if (PRODUCT_TERM.test(token)) score += 1;
    }
    if (input.pageType === "pdp" && /\/(category|categories)\//.test(candidate)) score += 1;
    scored.push({ candidate, anchor, score });
  }

  const usedAnchors = new Set();
  const picks = [];
  for (const row of scored.sort((a, b) => b.score - a.score)) {
    if (row.score <= 0) continue;
    if (usedAnchors.has(row.anchor)) continue;
    usedAnchors.add(row.anchor);
    picks.push({
      anchor: row.anchor,
      url: row.candidate,
    });
    if (picks.length >= 6) break;
  }

  if (picks.length < 3) {
    for (const candidate of sitePages) {
      if (candidate === pageUrl) continue;
      const anchor = slugToAnchor(candidate);
      if (usedAnchors.has(anchor)) continue;
      usedAnchors.add(anchor);
      picks.push({ anchor, url: candidate });
      if (picks.length >= 3) break;
    }
  }

  return picks.slice(0, 6);
}

async function analyzeInternalLinks(inputOrUrl, html, options = {}) {
  if (inputOrUrl && typeof inputOrUrl === "object" && !Array.isArray(inputOrUrl)) {
    const input = inputOrUrl;
    const existingContent = String(input.existingContent || "");
    const extracted = extractInternalLinks(input.url, existingContent);
    const brokenInternalLinks = await checkBrokenInternalLinks(extracted.internalLinks);
    const links = suggestInternalLinks(input);

    return {
      internalLinkCount: extracted.internalLinks.length,
      internalLinks: extracted.internalLinks,
      orphanPageRisk: extracted.internalLinks.length < 2,
      relativeLinkCount: extracted.relativeCount,
      absoluteLinkCount: extracted.absoluteCount,
      brokenInternalLinks,
      contextualLinks: links,
    };
  }

  const pageUrl = inputOrUrl;
  const extracted = extractInternalLinks(pageUrl, html);
  const knownUrls = new Set((options.knownUrls || []).map((u) => {
    try {
      return normalizeUrl(u);
    } catch (_) {
      return null;
    }
  }).filter(Boolean));

  const internalLinks = extracted.internalLinks;
  const knownLinkHits = internalLinks.filter((u) => knownUrls.has(u)).length;
  const orphanPageRisk = internalLinks.length < 2 || knownLinkHits === 0;
  const brokenInternalLinks = await checkBrokenInternalLinks(internalLinks);

  return {
    internalLinkCount: internalLinks.length,
    internalLinks,
    orphanPageRisk,
    relativeLinkCount: extracted.relativeCount,
    absoluteLinkCount: extracted.absoluteCount,
    brokenInternalLinks,
    contextualLinks: suggestInternalLinks({
      url: pageUrl,
      productEntity: "",
      pageType: "generic",
      existingContent: String(html || ""),
      sitePages: options.knownUrls || [],
    }),
  };
}

module.exports = analyzeInternalLinks;
module.exports.suggestInternalLinks = suggestInternalLinks;


