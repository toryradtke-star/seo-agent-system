const axios = require("axios");
const cheerio = require("cheerio");
const TurndownService = require("turndown");
const fs = require("fs");
const path = require("path");

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

/**
 * Target URLs are supplied at runtime, not baked into the source: a crawl list
 * belongs to whoever is being crawled, and hardcoding one makes the scraper
 * single-purpose. Point URL_LIST_PATH at a newline-delimited file of absolute
 * URLs (blank lines and `#` comments ignored). See urls.example.txt.
 */
const URL_LIST_PATH =
  process.env.URL_LIST_PATH || path.join(__dirname, "urls.txt");

function loadProductUrls(file) {
  if (!fs.existsSync(file)) {
    throw new Error(
      `No URL list at ${file}. Copy urls.example.txt to urls.txt, or set URL_LIST_PATH.`
    );
  }
  const urls = fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

  const bad = urls.filter((u) => !/^https?:\/\//i.test(u));
  if (bad.length) {
    throw new Error(`URL list contains non-http entries: ${bad.slice(0, 3).join(", ")}`);
  }
  if (!urls.length) throw new Error(`URL list at ${file} is empty.`);
  return urls;
}

const PRODUCT_URLS = loadProductUrls(URL_LIST_PATH);

const CONCURRENCY = 5;
const DELAY_MS = 500;
const OUTPUT_DIR =
  process.env.SCRAPE_OUTPUT_DIR || path.join(__dirname, "output", "scraped");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function urlToFilename(url) {
  const slug = new URL(url).pathname
    .replace(/^\//, "")
    .replace(/\/$/, "")
    .replace(/\//g, "--");
  return `${slug}.md`;
}

async function scrapePage(url) {
  const response = await axios.get(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    timeout: 30000,
  });

  const $ = cheerio.load(response.data);
  $("script,style,noscript,iframe,svg").remove();

  // Get page title
  const title = $("title").text().trim();

  // Get meta description
  const metaDesc =
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content") ||
    "";

  // Get main content area
  const mainContent =
    $("main").html() || $('[role="main"]').html() || $("body").html() || "";

  // Convert to markdown
  const markdown = turndown.turndown(mainContent);

  return { title, metaDesc, markdown, url };
}

async function processUrl(url, index, total) {
  const filename = urlToFilename(url);
  const filepath = path.join(OUTPUT_DIR, filename);

  // Skip if already scraped
  if (fs.existsSync(filepath)) {
    console.log(`[${index + 1}/${total}] SKIP (exists): ${filename}`);
    return { url, status: "skipped" };
  }

  try {
    const data = await scrapePage(url);
    const content = `# ${data.title}\n\n**URL:** ${data.url}\n\n**Meta Description:** ${data.metaDesc}\n\n---\n\n${data.markdown}`;
    fs.writeFileSync(filepath, content, "utf-8");
    console.log(`[${index + 1}/${total}] OK: ${filename}`);
    return { url, status: "ok" };
  } catch (err) {
    console.error(
      `[${index + 1}/${total}] FAIL: ${filename} - ${err.message}`
    );
    return { url, status: "error", error: err.message };
  }
}

async function main() {
  // Create output dir
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const total = PRODUCT_URLS.length;
  console.log(`Starting batch scrape of ${total} product pages...`);
  console.log(`Output directory: ${OUTPUT_DIR}\n`);

  const results = { ok: 0, skipped: 0, error: 0, errors: [] };

  // Process in batches with concurrency limit
  for (let i = 0; i < total; i += CONCURRENCY) {
    const batch = PRODUCT_URLS.slice(i, i + CONCURRENCY);
    const promises = batch.map((url, j) => processUrl(url, i + j, total));
    const batchResults = await Promise.all(promises);

    for (const r of batchResults) {
      results[r.status]++;
      if (r.status === "error") results.errors.push(r);
    }

    // Rate limiting delay between batches
    if (i + CONCURRENCY < total) await sleep(DELAY_MS);
  }

  console.log("\n--- SUMMARY ---");
  console.log(`Total URLs: ${total}`);
  console.log(`Saved: ${results.ok}`);
  console.log(`Skipped (already existed): ${results.skipped}`);
  console.log(`Errors: ${results.error}`);

  if (results.errors.length > 0) {
    console.log("\nFailed URLs:");
    for (const e of results.errors) {
      console.log(`  ${e.url} - ${e.error}`);
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
