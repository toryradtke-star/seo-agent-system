const fs = require("fs");
const fsp = fs.promises;
const { execFile } = require("child_process");
const { promisify } = require("util");
const path = require("path");
const runCategoryAgent = require("../../categoryAgent");
const runBlogAgent = require("../../blogAgent");
const { runWithRetry, MAX_OPTIMIZATION_ATTEMPTS, buildRetryMeta } = require("../retryPolicy");

const execFileAsync = promisify(execFile);

function injectInternalLinks(content, links) {
  const text = String(content || "");
  if (!Array.isArray(links) || links.length === 0) return text;
  const picked = links.slice(0, 4).filter((x) => x && x.anchor && x.url);
  if (picked.length === 0) return text;
  const markdown = picked.map((x) => `[${x.anchor}](${x.url})`);
  if (!/<p[^>]*>/i.test(text)) {
    return `${text}\n\nRelated links:\n- ${markdown.join("\n- ")}`;
  }
  let i = 0;
  return text.replace(/<p[^>]*>([\s\S]*?)<\/p>/i, (_, body) => {
    const link = markdown[Math.min(i, markdown.length - 1)];
    i += 1;
    return `<p>${body} See also ${link}.</p>`;
  });
}

async function runPdpAgentOnce(url, scrapedData, paths, extraPrompt = "") {
  const pdpPath = path.join(process.cwd(), "pdpAgent.js");
  await fsp.writeFile(paths.tempScrapedPath, JSON.stringify(scrapedData, null, 2), "utf-8");
  const env = {
    ...process.env,
    SCRAPED_DATA_PATH: paths.tempScrapedPath,
  };
  if (extraPrompt) {
    env.EXTRA_PROMPT = extraPrompt;
  }
  const { stdout } = await execFileAsync("node", [pdpPath, url, paths.tempScrapedPath], {
    env,
    maxBuffer: 20 * 1024 * 1024,
  });
  const out = String(stdout || "").trim();
  if (!out) {
    throw new Error("pdpAgent returned empty output");
  }
  return out;
}

async function runOptimizeStage(input, context) {
  if (context.mode === "audit") {
    return {
      ...input,
      productPage: false,
      optimizedContent: "<p>Audit mode: optimization skipped.</p>",
      retryMetadata: buildRetryMeta(1, null),
    };
  }

  const pageType = input.pageType || "generic";
  const forcePdp = context.options?.forcePdp === true;
  const isPdp = forcePdp || pageType === "pdp";

  let optimizedContent = "";
  let retryMetadata = buildRetryMeta(1, null);
  const linkSuggestions = input.internalLinksAnalysis?.contextualLinks || [];

  if (isPdp) {
    const maxClaudeCalls = Number(context.options?.maxClaudeCalls || 0);
    const usedClaudeCalls = Number(context.sharedCache.budgets?.claudeCalls || 0);
    if (maxClaudeCalls > 0 && usedClaudeCalls >= maxClaudeCalls) {
      throw new Error("Claude request budget exceeded");
    }

    const retryPayload = await runWithRetry(
      (attempt) => runPdpAgentOnce(
        input.url,
        {
          ...(input.scrapedData || {}),
          serpInsights: input.serpInsights || {},
          keywordClusters: input.keywordClusters || {},
          internalLinkSuggestions: linkSuggestions,
        },
        {
          tempScrapedPath: input.paths.tempScrapedPath,
        },
        attempt > 1 ? `Retry reason: ${context.retryReason || "low_score"}` : ""
      ),
      {
        maxAttempts: MAX_OPTIMIZATION_ATTEMPTS,
        retryReason: context.retryReason || "low_score",
      }
    );
    optimizedContent = retryPayload.result;
    retryMetadata = retryPayload.retryMeta;
    context.sharedCache.budgets = context.sharedCache.budgets || {};
    context.sharedCache.budgets.claudeCalls = Number(context.sharedCache.budgets.claudeCalls || 0) + retryMetadata.attemptCount;
  } else if (pageType === "category") {
    const category = await runCategoryAgent({
      url: input.url,
      scrapedData: input.scrapedData || {},
      serpInsights: input.serpInsights || {},
      keywordCluster: input.keywordClusters || {},
      internalLinks: input.internalLinksAnalysis || {},
    });
    optimizedContent = category.optimizedHtml;
  } else if (pageType === "blog") {
    const blog = await runBlogAgent({
      url: input.url,
      scrapedData: input.scrapedData || {},
      serpInsights: input.serpInsights || {},
      keywordCluster: input.keywordClusters || {},
      internalLinks: input.internalLinksAnalysis || {},
    });
    optimizedContent = blog.optimizedHtml;
  } else {
    optimizedContent = `<p>No specialized optimization agent for page type: ${pageType}.</p>`;
  }

  optimizedContent = injectInternalLinks(optimizedContent, linkSuggestions);
  await fsp.writeFile(input.paths.optimizedPath, optimizedContent, "utf-8");

  return {
    ...input,
    productPage: isPdp,
    optimizedContent,
    retryMetadata,
  };
}

module.exports = {
  runOptimizeStage,
};
