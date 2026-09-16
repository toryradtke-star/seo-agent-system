const axios = require("axios");
const cheerio = require("cheerio");
const { limitHTTP } = require("./utils/rateLimiter");
const { assertSafeUrl } = require("./core/urlSafety");

function detectProductEntity(title, headings, urlString) {
  const h1 = (headings || []).find((h) => h.tag === "h1")?.text || "";
  const slug = (() => {
    try {
      const p = new URL(urlString).pathname.replace(/^\/+|\/+$/g, "");
      const last = (p.split("/").filter(Boolean).pop() || "").replace(/[-_]+/g, " ");
      return last;
    } catch (_) {
      return "";
    }
  })();

  const source = `${h1} ${title} ${slug}`.trim();
  if (!source) return "";

  const cleaned = source
    .replace(/\b(custom|cheap|best|buy|shop|online|printing|print)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const tokens = cleaned.split(" ").filter(Boolean);
  return tokens.slice(0, 3).join(" ");
}

function unique(arr) {
  return Array.from(new Set(arr));
}

async function loadPage(url) {
  await assertSafeUrl(url, {
    enforceRobots: String(process.env.ENFORCE_ROBOTS || "").toLowerCase() === "true",
  });
  const response = await limitHTTP.run(() =>
    axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 30000,
    })
  );

  const html = String(response.data || "");
  const $ = cheerio.load(html);
  $("script,style,noscript,iframe").remove();

  const title = $("title").text().replace(/\s+/g, " ").trim();
  const metaDescription =
    $('meta[name="description"]').attr("content")?.replace(/\s+/g, " ").trim() || "";

  const headings = [];
  $("h1,h2,h3,h4").each((i, el) => {
    headings.push({
      tag: el.tagName.toLowerCase(),
      text: $(el).text().replace(/\s+/g, " ").trim(),
    });
  });

  const fullText = $("body").text().replace(/\s+/g, " ").trim();
  const words = fullText ? fullText.split(" ") : [];
  const first1500Words = words.slice(0, 1500).join(" ");
  const wordCount = words.length;

  const internalLinks = [];
  const host = new URL(url).hostname;
  $("a[href]").each((_, el) => {
    const href = ($(el).attr("href") || "").trim();
    if (!href || /^(mailto:|tel:|javascript:)/i.test(href)) return;
    try {
      const abs = new URL(href, url);
      abs.hash = "";
      if (abs.hostname === host) {
        internalLinks.push(abs.toString());
      }
    } catch (_) {
      // ignore bad href
    }
  });

  const productEntity = detectProductEntity(title, headings, url);

  return {
    url,
    html,
    title,
    metaDescription,
    headings,
    first1500Words,
    productEntity,
    internalLinks: unique(internalLinks),
    wordCount,
    visibleText: first1500Words,
  };
}

async function main() {
  const url = process.argv[2];

  if (!url) {
    console.error("Usage: node scraper.js <url>");
    process.exit(1);
  }

  const data = await loadPage(url);
  console.log(JSON.stringify(data));
}

module.exports = {
  loadPage,
};

if (require.main === module) {
  main().catch((err) => {
    console.error("Scraper error:", err?.message || err);
    process.exit(1);
  });
}
