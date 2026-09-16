const Anthropic = require("@anthropic-ai/sdk");
const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const { createLogger } = require("./logger");
const { limitClaude } = require("./utils/rateLimiter");
const { sanitizePageContent } = require("./core/promptSanitizer");
const { buildSafePrompt } = require("./core/buildSafePrompt");

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
function readPromptMetadata() {
  try {
    const raw = fs.readFileSync(path.join(__dirname, "prompts", "metadata.json"), "utf-8");
    const parsed = JSON.parse(raw);
    return {
      promptVersion: parsed.promptVersion || "unknown",
      templateVersion: parsed.templateVersion || "unknown",
      model: parsed.model || "",
    };
  } catch (_) {
    return {
      promptVersion: "unknown",
      templateVersion: "unknown",
      model: "",
    };
  }
}
const PROMPT_METADATA = readPromptMetadata();
const PROMPT_VERSION = PROMPT_METADATA.promptVersion;

const MODEL_CANDIDATES = [
  process.env.CLAUDE_MODEL,
  "claude-3-5-haiku-latest",
  "claude-3-5-haiku-20241022",
  "claude-sonnet-4-20250514",
].filter(Boolean);

const logger = createLogger();

const PROMPT_FILES = {
  heading: path.join(__dirname, "prompts", "headingOptimizerPrompt.md"),
  content: path.join(__dirname, "prompts", "pdpContentPrompt.md"),
  faq: path.join(__dirname, "prompts", "faqPrompt.md"),
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function readPrompt(filePath) {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch (_) {
    return "";
  }
}

function keywordExpansion(productEntity) {
  const lower = String(productEntity || "").toLowerCase();
  const base = lower || "custom product";

  if (base.includes("mesh banner")) {
    return [
      "wind resistant banner",
      "mesh fence banner",
      "construction fence banner",
      "outdoor mesh banner",
      "perforated banner",
    ];
  }

  return [
    `${base} printing`,
    `custom ${base}`,
    `${base} design`,
    `${base} sizes`,
    `${base} for business`,
  ];
}

async function loadPage(url) {
  const response = await axios.get(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    timeout: 30000,
  });

  const $ = cheerio.load(response.data);
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

  return {
    title,
    metaDescription,
    headings,
    first1500Words: words.slice(0, 1500).join(" "),
    visibleText: words.slice(0, 1500).join(" "),
    wordCount: words.length,
    productEntity: (headings.find((h) => h.tag === "h1")?.text || title || "").split(" ").slice(0, 3).join(" "),
    serpInsights: null,
    keywordClusters: null,
    internalLinkSuggestions: [],
  };
}

function normalizeScrapedInput(input) {
  const data = input || {};
  const headings = Array.isArray(data.headings) ? data.headings : [];

  const title = typeof data.title === "string" ? data.title : "";
  const metaDescription = typeof data.metaDescription === "string" ? data.metaDescription : "";
  const html = typeof data.html === "string" ? data.html : "";
  const first1500Words =
    typeof data.first1500Words === "string"
      ? data.first1500Words
      : typeof data.visibleText === "string"
        ? data.visibleText
        : "";

  return {
    title: sanitizePageContent(title, { maxChars: 500 }),
    metaDescription: sanitizePageContent(metaDescription, { maxChars: 800 }),
    html: sanitizePageContent(html, { maxChars: 20000 }),
    headings,
    first1500Words: sanitizePageContent(first1500Words, { maxChars: 12000 }),
    visibleText: sanitizePageContent(first1500Words, { maxChars: 12000 }),
    wordCount: Number(data.wordCount || first1500Words.split(/\s+/).filter(Boolean).length || 0),
    productEntity: sanitizePageContent(String(data.productEntity || "").trim(), { maxChars: 200 }),
    serpInsights: data.serpInsights && typeof data.serpInsights === "object" ? data.serpInsights : null,
    keywordClusters: data.keywordClusters && typeof data.keywordClusters === "object" ? data.keywordClusters : null,
    internalLinkSuggestions: Array.isArray(data.internalLinkSuggestions) ? data.internalLinkSuggestions : [],
  };
}

function readScrapedDataFromInputs() {
  const scrapedPathArg = process.argv[3];
  const scrapedPathEnv = process.env.SCRAPED_DATA_PATH;
  const scrapedJsonEnv = process.env.SCRAPED_DATA_JSON;

  if (scrapedJsonEnv) {
    try {
      const parsed = JSON.parse(scrapedJsonEnv);
      if (parsed && typeof parsed === "object") return parsed;
    } catch (_) {
      // ignore
    }
  }

  const candidatePath = scrapedPathArg || scrapedPathEnv;
  if (!candidatePath) return null;

  try {
    const raw = fs.readFileSync(candidatePath, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed;
  } catch (_) {
    // ignore and fallback
  }

  return null;
}

function buildPrompt(pageData, targetUrl) {
  const headingPrompt = readPrompt(PROMPT_FILES.heading);
  const contentPrompt = readPrompt(PROMPT_FILES.content);
  const faqPrompt = readPrompt(PROMPT_FILES.faq);

  const expandedKeywords = keywordExpansion(pageData.productEntity || pageData.title);
  const serpThemes = pageData.serpInsights?.keywordThemes || [];
  const serpHeadings =
    pageData.serpInsights?.headingPatterns ||
    pageData.serpInsights?.commonHeadings ||
    [];
  const serpFaq = pageData.serpInsights?.faqPatterns || [];
  const serpEntities =
    pageData.serpInsights?.entityCoverage ||
    pageData.serpInsights?.relatedEntities ||
    [];
  const clusterPayload = pageData.keywordClusters || { coreKeyword: "", clusters: [] };
  const linkSuggestions = pageData.internalLinkSuggestions || [];
  const extraPrompt = String(process.env.EXTRA_PROMPT || "").trim();
  const taskInstructions = `
${headingPrompt}

${contentPrompt}

${faqPrompt}

Additional optimization requirements:
- Insert 2-4 contextual internal links in paragraph text only, never in headings.
- Use SERP insights and keyword clusters to enrich semantic coverage naturally.
- Incorporate missing SERP entities where they fit naturally.
- Keep all section length guardrails inside required ranges.

PROMPT VERSION: ${PROMPT_VERSION}
TEMPLATE VERSION: ${PROMPT_METADATA.templateVersion}
${extraPrompt ? `\nEXTRA INSTRUCTION:\n${extraPrompt}\n` : ""}
`;

  const trustedContext = [
    `Context:
- URL: ${targetUrl}
- Product Entity: ${pageData.productEntity || "Unknown"}
- Related Keywords: ${expandedKeywords.join(", ")}
- Word Count: ${pageData.wordCount}`,
    `Output format sections:
1) BEFORE HEADING STRUCTURE
2) AFTER OPTIMIZED STRUCTURE
3) PRODUCT HEADER
4) CONFIGURATOR LABELS
5) PRODUCT OVERVIEW TAB
6) ORDER PROCESS TAB
7) PRODUCTION TIMES TAB
8) CUT OPTIONS TAB
9) ARTWORK TAB
10) SHIPPING TAB
11) INSTALLATION TAB
12) POST-TAB CONTENT
13) FAQ
14) SEO ANALYSIS & OPTIMIZATION SUMMARY (plain language text only, no HTML tags, no code fences)`,
    "Do not wrap any section in code fences.",
  ];

  const untrustedSections = [
    {
      title: "UNTRUSTED_SCRAPED_HTML",
      content: pageData.html || "",
    },
    {
      title: "UNTRUSTED_VISIBLE_TEXT",
      content: pageData.visibleText || "",
    },
    {
      title: "UNTRUSTED_FIRST1500WORDS",
      content: pageData.first1500Words || "",
    },
    {
      title: "UNTRUSTED_HEADINGS",
      content: JSON.stringify(pageData.headings || []),
    },
    {
      title: "UNTRUSTED_META_DESCRIPTION",
      content: pageData.metaDescription || "",
    },
    {
      title: "UNTRUSTED_TITLE",
      content: pageData.title || "",
    },
    {
      title: "UNTRUSTED_SERP_AND_CLUSTER_SIGNALS",
      content: JSON.stringify({
        serpThemes,
        serpHeadingPatterns: serpHeadings,
        serpEntities,
        serpFaq,
        keywordClusters: clusterPayload,
        internalLinkSuggestions: linkSuggestions,
      }),
    },
    {
      title: "UNTRUSTED_PROMPT_PAYLOAD",
      content: JSON.stringify({
        productEntity: pageData.productEntity || "",
        headings: pageData.headings || [],
        serpThemes,
        serpHeadingPatterns: serpHeadings,
        serpEntities,
        serpFaq,
        keywordClusters: clusterPayload,
        internalLinkSuggestions: linkSuggestions,
      }),
    },
  ];

  return buildSafePrompt({
    taskDescription: taskInstructions,
    trustedSections: trustedContext,
    untrustedSections,
    maxCharsPerSection: 20000,
  });
}

function sanitizeGeneratedPdpOutput(text) {
  let out = String(text || "");
  if (!out) return out;

  // Remove fenced code blocks if model still emits them.
  out = out.replace(/```[\s\S]*?```/g, "").trim();

  // Remove instructional residue that should never be in final PDP output.
  out = out.replace(/^\s*PASTE INTO:\s*$/gim, "");
  out = out.replace(/^\s*Bottom of PDP \(after FAQ\)\s*$/gim, "");

  // Remove trailing divider noise at end of document.
  out = out.replace(/\n\s*-{10,}\s*$/g, "");

  // Normalize excessive blank lines created by removals.
  out = out.replace(/\n{3,}/g, "\n\n").trim();
  return out;
}

async function runAgent() {
  const start = Date.now();
  const targetUrl = process.argv[2];
  if (!targetUrl) {
    console.log("\nUsage:\nnode pdpAgent.js <url> [scraped-json-path]\n");
    process.exit(1);
  }

  const scrapedInput = readScrapedDataFromInputs();
  const pageData = normalizeScrapedInput(scrapedInput || (await loadPage(targetUrl)));
  const prompt = buildPrompt(pageData, targetUrl);

  try {
    let response = null;
    let modelUsed = null;
    let modelError = null;

    for (const model of MODEL_CANDIDATES) {
      try {
        response = await limitClaude.run(() =>
          anthropic.messages.create({
            model,
            max_tokens: 5000,
            messages: [{ role: "user", content: prompt }],
          })
        );
        modelUsed = model;
        break;
      } catch (err) {
        modelError = err;
        const msg = String(err?.message || "");
        if (err?.status === 404 || /model:|not[_ ]found/i.test(msg)) {
          continue;
        }
        throw err;
      }
    }

    if (!response) {
      throw modelError || new Error("No Claude model available.");
    }

    const outputRaw = response?.content?.[0]?.text || "";
    const output = sanitizeGeneratedPdpOutput(outputRaw);
    const usage = response?.usage || {};

    logger.metric("pdpAgent", {
      url: targetUrl,
      model: modelUsed,
      tokensIn: usage.input_tokens || null,
      tokensOut: usage.output_tokens || null,
      promptVersion: PROMPT_VERSION,
      templateVersion: PROMPT_METADATA.templateVersion,
      durationMs: Date.now() - start,
    });

    const metricsPath = process.env.PDP_METRICS_PATH;
    if (metricsPath) {
      try {
        fs.writeFileSync(
          metricsPath,
          JSON.stringify(
            {
              url: targetUrl,
              model: modelUsed,
              promptVersion: PROMPT_VERSION,
              templateVersion: PROMPT_METADATA.templateVersion,
              usage: {
                input_tokens: usage.input_tokens || 0,
                output_tokens: usage.output_tokens || 0,
              },
              durationMs: Date.now() - start,
            },
            null,
            2
          ),
          "utf-8"
        );
      } catch (_) {
        // Metrics write failures should not fail content generation.
      }
    }

    console.log(output);
  } catch (error) {
    logger.error("pdpAgent.error", {
      url: targetUrl,
      message: error?.message || String(error),
      durationMs: Date.now() - start,
    });
    console.error("Claude error:", error?.message || error);
    process.exit(1);
  }
}

runAgent();
