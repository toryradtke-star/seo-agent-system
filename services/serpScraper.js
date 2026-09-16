const axios = require("axios");
const cheerio = require("cheerio");
const { limitHTTP } = require("../utils/rateLimiter");

function unique(arr) {
  return Array.from(new Set(arr));
}

function extractSchemaTypes($) {
  const types = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).html() || "";
    if (!raw.trim()) return;
    try {
      const parsed = JSON.parse(raw);
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      for (const node of nodes) {
        if (node && node["@type"]) {
          if (Array.isArray(node["@type"])) {
            for (const t of node["@type"]) types.push(String(t));
          } else {
            types.push(String(node["@type"]));
          }
        }
      }
    } catch (_) {
      // ignore malformed json-ld
    }
  });
  return unique(types);
}

function extractFaqQuestions($) {
  const out = [];
  $("h2,h3,h4,p,li").each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (text.length < 12 || text.length > 180) return;
    if (/\?$/.test(text) || /^(q:|question:)/i.test(text)) out.push(text.replace(/^(q:|question:)/i, "").trim());
  });
  return unique(out).slice(0, 20);
}

async function scrapeSerpPage(url, timeoutMs = 12000) {
  const res = await limitHTTP.run(() =>
    axios.get(url, {
      timeout: timeoutMs,
      headers: { "User-Agent": "Mozilla/5.0" },
      validateStatus: () => true,
    })
  );

  if (res.status < 200 || res.status >= 300) {
    throw new Error(`SERP page HTTP ${res.status}`);
  }

  const html = String(res.data || "");
  const $ = cheerio.load(html);
  $("script:not([type='application/ld+json']),style,noscript,iframe").remove();

  const headings = [];
  $("h1,h2,h3").each((_, el) => {
    const tag = el.tagName.toLowerCase();
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (text) headings.push({ tag, text });
  });

  const text = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const schemaTypes = extractSchemaTypes($);
  const faqQuestions = extractFaqQuestions($);

  return {
    url,
    html,
    headings,
    paragraphText: text.slice(0, 12000),
    wordCount,
    schemaTypes,
    faqQuestions,
  };
}

module.exports = {
  scrapeSerpPage,
};
