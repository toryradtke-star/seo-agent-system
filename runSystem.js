const fs = require("fs");
const path = require("path");
const { runPipeline } = require("./pipelineRouter");

function parseUrlListFile(filePath) {
  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`URL list file not found: ${fullPath}`);
  }
  const raw = fs.readFileSync(fullPath, "utf-8");
  return Array.from(
    new Set(
      raw
        .split(/\r?\n/)
        .map((x) => x.trim())
        .filter((x) => x && /^https?:\/\//i.test(x))
    )
  );
}

function parseFlag(args, name, fallback = "") {
  const idx = args.indexOf(name);
  if (idx < 0) return fallback;
  return args[idx + 1] || fallback;
}

async function main() {
  const args = process.argv.slice(2);
  const baseUrl = args[0];
  const concurrencyArg = Number(args[1] || 8);
  const outputDir = args[2] && !String(args[2]).startsWith("--") ? args[2] : "output/site";
  const mode = parseFlag(args, "--mode", "full");
  const preScrapedDir = parseFlag(args, "--pre-scraped-dir", "");
  const urlListFile = parseFlag(args, "--url-list", "");
  const urlList = urlListFile ? parseUrlListFile(urlListFile) : [];
  const forcePdp = args.includes("--force-pdp");
  const sendDocs = args.includes("--send-docs");
  const changedOnly = args.includes("--changed-only");
  const pdpOnly = args.includes("--pdp-only");
  const categoryOnly = args.includes("--category-only");
  const blogOnly = args.includes("--blog-only");
  const homepageOnly = args.includes("--homepage-only");
  const genericOnly = args.includes("--generic-only");
  const maxPagesValue = parseFlag(args, "--max-pages", "");
  const maxPages = maxPagesValue ? Number(maxPagesValue) : undefined;
  const docsFolderPath = parseFlag(args, "--docs-folder", "");

  if (!baseUrl) {
    console.error(
      "Usage: node runSystem.js <base-url> [concurrency=8] [output-dir=output/site] [--mode audit|optimize|gaps|full] [--url-list <file>] [--pre-scraped-dir <dir>] [--force-pdp] [--send-docs] [--changed-only] [--pdp-only|--category-only|--blog-only|--homepage-only|--generic-only] [--max-pages N] [--docs-folder path]"
    );
    process.exit(1);
  }

  let pageTypeFilter;
  if (pdpOnly) pageTypeFilter = "pdp";
  if (categoryOnly) pageTypeFilter = "category";
  if (blogOnly) pageTypeFilter = "blog";
  if (homepageOnly) pageTypeFilter = "homepage";
  if (genericOnly) pageTypeFilter = "generic";

  const concurrency = Number.isFinite(concurrencyArg) && concurrencyArg > 0
    ? Math.floor(concurrencyArg)
    : 8;

  const result = await runPipeline(mode, {
    baseUrl,
    concurrency,
    outputDir,
    preScrapedDir: preScrapedDir || undefined,
    urlList: urlList.length > 0 ? urlList : undefined,
    forcePdp,
    sendDocs,
    docsFolderPath,
    changedOnly,
    pageTypeFilter,
    maxPages: Number.isFinite(maxPages) && maxPages > 0 ? Math.floor(maxPages) : undefined,
  });

  const resultPath = path.join(path.resolve(outputDir), `pipeline-${String(mode || "full").toLowerCase()}-result.json`);
  fs.mkdirSync(path.dirname(resultPath), { recursive: true });
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2), "utf-8");

  console.log("PIPELINE done");
  console.log(`Mode: ${mode}`);
  console.log(`Result: ${resultPath}`);
}

main().catch((err) => {
  console.error("PIPELINE error:", err?.message || err);
  process.exit(1);
});

