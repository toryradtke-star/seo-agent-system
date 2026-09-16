const cheerio = require("cheerio");
const axios = require("axios");
const { limitHTTP } = require("./utils/rateLimiter");

const USER_AGENT = "Mozilla/5.0";
const REQUEST_TIMEOUT_MS = 30000;

async function fetchHtml(url) {
  const response = await limitHTTP.run(() =>
    axios.get(url, {
      headers: { "User-Agent": USER_AGENT },
      timeout: REQUEST_TIMEOUT_MS,
      validateStatus: () => true,
    })
  );
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`HTTP ${response.status}`);
  }
  return String(response.data || "");
}

async function analyzeTechnicalSeo(urlOrHtml, maybeHtml) {
  let html = "";

  if (typeof maybeHtml === "string" && maybeHtml.trim()) {
    // Prefer already-provided HTML/text payload to avoid duplicate fetches.
    html = maybeHtml;
  } else if (typeof urlOrHtml === "string" && /^https?:\/\//i.test(urlOrHtml)) {
    html = await fetchHtml(urlOrHtml);
  } else {
    html = String(urlOrHtml || "");
  }

  const $ = cheerio.load(html);

  const title = ($("title").first().text() || "").trim();
  const metaDescription = (
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content") ||
    ""
  ).trim();
  const canonical = ($('link[rel="canonical"]').attr("href") || "").trim();
  const robots = ($('meta[name="robots"]').attr("content") || "").trim();

  let missingAltImages = 0;
  $("img").each((_, el) => {
    const alt = ($(el).attr("alt") || "").trim();
    if (!alt) missingAltImages += 1;
  });

  const multipleH1 = $("h1").length > 1;

  return {
    title,
    metaDescription,
    canonical,
    robots,
    missingAltImages,
    multipleH1,
  };
}

module.exports = analyzeTechnicalSeo;
