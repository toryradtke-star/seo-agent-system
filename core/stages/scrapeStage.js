const path = require("path");
const fs = require("fs");
const { loadPage } = require("../../scraper");
const { normalizeUrlKey, readJsonSafe, writeJson } = require("../pipelineUtils");

async function runScrapeStage(input, context) {
  const { url, paths } = input;
  const options = context.options || {};
  const key = normalizeUrlKey(url);
  context.sharedCache.scrapedByUrl = context.sharedCache.scrapedByUrl || {};

  if (context.sharedCache.scrapedByUrl[key]) {
    return {
      ...input,
      scrapedData: context.sharedCache.scrapedByUrl[key],
      metrics: { ...(input.metrics || {}), scrapedFromCache: true },
    };
  }

  if (options.preScrapedDir) {
    const slug = input.slug;
    const candidate = path.resolve(options.preScrapedDir, `${slug}.scraped.json`);
    if (fs.existsSync(candidate)) {
      const preScraped = await readJsonSafe(candidate, null);
      if (preScraped) {
        context.sharedCache.scrapedByUrl[key] = preScraped;
        await writeJson(paths.datasetPath, preScraped);
        return {
          ...input,
          scrapedData: preScraped,
          metrics: { ...(input.metrics || {}), scrapedFromPreScraped: true },
        };
      }
    }
  }

  const scrapedData = await loadPage(url);
  context.sharedCache.scrapedByUrl[key] = scrapedData;
  await writeJson(paths.datasetPath, scrapedData);

  return {
    ...input,
    scrapedData,
  };
}

module.exports = {
  runScrapeStage,
};

