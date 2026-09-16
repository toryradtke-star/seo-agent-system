const fs = require("fs");
const path = require("path");
const { runFullSiteAudit } = require("./masterAgent");

const OUTPUT_DIR = path.join(__dirname, "output", "site-audits");

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

async function main() {
  const args = process.argv.slice(2);
  const baseUrl = args[0];
  const concurrencyArg = Number(args[1] || 8);
  const outputDir = args[2] || "output/site";
  const preScrapedDir = args[3] && !String(args[3]).startsWith("--") ? args[3] : "";
  const urlListFlagIndex = args.indexOf("--url-list");
  const urlListFile = urlListFlagIndex >= 0 ? args[urlListFlagIndex + 1] : "";
  const forcePdp = args.includes("--force-pdp");
  const changedOnly = args.includes("--changed-only");
  const pdpOnly = args.includes("--pdp-only");
  const categoryOnly = args.includes("--category-only");
  const blogOnly = args.includes("--blog-only");
  const homepageOnly = args.includes("--homepage-only");
  const genericOnly = args.includes("--generic-only");
  const useQueue = args.includes("--use-queue");
  const maxPagesFlagIndex = args.indexOf("--max-pages");
  const maxClaudeCallsFlagIndex = args.indexOf("--max-claude-calls");
  const maxSerpCallsFlagIndex = args.indexOf("--max-serp-calls");
  const maxPages =
    maxPagesFlagIndex >= 0 && args[maxPagesFlagIndex + 1]
      ? Number(args[maxPagesFlagIndex + 1])
      : undefined;
  const maxClaudeCalls =
    maxClaudeCallsFlagIndex >= 0 && args[maxClaudeCallsFlagIndex + 1]
      ? Number(args[maxClaudeCallsFlagIndex + 1])
      : undefined;
  const maxSerpCalls =
    maxSerpCallsFlagIndex >= 0 && args[maxSerpCallsFlagIndex + 1]
      ? Number(args[maxSerpCallsFlagIndex + 1])
      : undefined;
  const concurrency = Number.isFinite(concurrencyArg) && concurrencyArg > 0
    ? Math.floor(concurrencyArg)
    : 8;

  if (!baseUrl) {
    console.error(
      "Usage: node runFullAudit.js <base-url> [concurrency=8] [output-dir=output/site] [pre-scraped-dir] [--url-list <file>] [--force-pdp] [--changed-only] [--pdp-only|--category-only|--blog-only|--homepage-only|--generic-only] [--max-pages N] [--max-claude-calls N] [--max-serp-calls N] [--use-queue]"
    );
    process.exit(1);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(path.resolve(outputDir), { recursive: true });

  const urlList = urlListFile ? parseUrlListFile(urlListFile) : [];

  console.log("FULL AUDIT starting");
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Concurrency: ${concurrency} workers`);
  console.log(`Output Dir: ${path.resolve(outputDir)}`);
  if (preScrapedDir) {
    console.log(`FULL AUDIT: using pre-scraped directory ${preScrapedDir}`);
  }
  if (urlList.length > 0) {
    console.log(`FULL AUDIT: using explicit URL list (${urlList.length} URLs) from ${urlListFile}`);
  }
  if (forcePdp) {
    console.log("FULL AUDIT: forcing PDP optimization for all processed URLs");
  }
  if (changedOnly) {
    console.log("FULL AUDIT: processing only pages with changed content hash");
  }
  let pageTypeFilter;
  if (pdpOnly) pageTypeFilter = "pdp";
  if (categoryOnly) pageTypeFilter = "category";
  if (blogOnly) pageTypeFilter = "blog";
  if (homepageOnly) pageTypeFilter = "homepage";
  if (genericOnly) pageTypeFilter = "generic";
  if (pageTypeFilter) {
    console.log(`FULL AUDIT: filtering page type -> ${pageTypeFilter}`);
  }
  if (Number.isFinite(maxPages) && maxPages > 0) {
    console.log(`FULL AUDIT: limiting to max ${Math.floor(maxPages)} pages`);
  }
  if (Number.isFinite(maxClaudeCalls) && maxClaudeCalls > 0) {
    console.log(`FULL AUDIT: max Claude calls ${Math.floor(maxClaudeCalls)}`);
  }
  if (Number.isFinite(maxSerpCalls) && maxSerpCalls > 0) {
    console.log(`FULL AUDIT: max SERP calls ${Math.floor(maxSerpCalls)}`);
  }

  if (useQueue) {
    const { createPipelineQueue } = require("./queue/queue");
    const q = createPipelineQueue("seo-platform");
    await q.add("crawl_site", {
      baseUrl,
      concurrency,
      outputDir,
      options: {
        forcePdp,
        changedOnly,
        pageTypeFilter,
        maxPages: Number.isFinite(maxPages) && maxPages > 0 ? Math.floor(maxPages) : undefined,
        maxClaudeCalls: Number.isFinite(maxClaudeCalls) && maxClaudeCalls > 0 ? Math.floor(maxClaudeCalls) : undefined,
        maxSerpCalls: Number.isFinite(maxSerpCalls) && maxSerpCalls > 0 ? Math.floor(maxSerpCalls) : undefined,
      },
    });
    console.log("FULL AUDIT: queued crawl_site job to BullMQ queue seo-platform");
    await q.close();
    return;
  }

  const report = await runFullSiteAudit(baseUrl, {
    concurrency,
    outputDir,
    preScrapedDir: preScrapedDir || undefined,
    urlList: urlList.length > 0 ? urlList : undefined,
    forcePdp,
    changedOnly,
    pageTypeFilter,
    maxPages: Number.isFinite(maxPages) && maxPages > 0 ? Math.floor(maxPages) : undefined,
    maxClaudeCalls: Number.isFinite(maxClaudeCalls) && maxClaudeCalls > 0 ? Math.floor(maxClaudeCalls) : undefined,
    maxSerpCalls: Number.isFinite(maxSerpCalls) && maxSerpCalls > 0 ? Math.floor(maxSerpCalls) : undefined,
  });

  const reportPath = path.join(report.runDir, "runFullAudit-result.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");

  console.log("FULL AUDIT: done");
  console.log(`FULL AUDIT: discovered=${report.totalUrlsDiscovered}`);
  console.log(`FULL AUDIT: audited=${report.pagesAudited}`);
  console.log(`FULL AUDIT: skipped=${report.pagesSkipped}`);
  console.log(`FULL AUDIT: errors=${report.errors.length}`);
  console.log(`FULL AUDIT: est_cost_usd=${report.costReport?.totals?.estimatedCostUsd || 0}`);
  console.log(`FULL AUDIT: output=${report.runDir}`);
}

main().catch((err) => {
  console.error("FULL AUDIT error:", err?.message || err);
  process.exit(1);
});
