const cheerio = require("cheerio");

const THIN_CONTENT_WORD_THRESHOLD = 300;

function normalizeWhitespace(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function analyzeContentQuality(html, scrapedHeadings = []) {
  const $ = cheerio.load(html || "");
  const bodyText = normalizeWhitespace($("body").text() || $.text());
  const words = bodyText ? bodyText.split(" ").filter(Boolean) : [];
  const wordCount = words.length;
  const paragraphCount = $("p").length;

  const headingStructure = Array.isArray(scrapedHeadings) && scrapedHeadings.length > 0
    ? scrapedHeadings
    : $("h1,h2,h3,h4,h5,h6")
        .map((_, el) => ({
          tag: (el.tagName || "").toLowerCase(),
          text: normalizeWhitespace($(el).text()),
        }))
        .get();

  return {
    wordCount,
    thinContent: wordCount < THIN_CONTENT_WORD_THRESHOLD,
    headingStructure,
    paragraphCount,
  };
}

module.exports = analyzeContentQuality;
