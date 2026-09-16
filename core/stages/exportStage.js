const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const sendToGoogleDoc = require("../../docsAgent");
const { writeJson } = require("../pipelineUtils");
const { withArtifactMetadata } = require("../artifactMetadata");

const SEO_AUDIT_SECTION_TEXT = `
==================================================
SEO ANALYSIS & OPTIMIZATION SUMMARY
==================================================

This product page was analyzed and optimized through an automated SEO audit process focused on technical and structural quality improvements.

Technical SEO analysis reviewed meta title structure, meta description quality, canonical signals, heading hierarchy (H1-H4), alt text opportunities, and overall page structure.

Content Quality analysis covered thin-content risks, word count expansion opportunities, content depth, section clarity, and heading structure consistency.

Internal Linking analysis evaluated contextual internal link placement to better connect supporting product and category pages and strengthen site architecture signals.

Keyword Clustering analysis applied semantic keyword groupings to improve topical relevance and align page coverage with transactional search intent.
`.trim();

function appendAuditSectionIfNeeded(html, shouldAppend) {
  const content = String(html || "");
  if (!shouldAppend) return content;
  if (/SEO ANALYSIS & OPTIMIZATION SUMMARY/i.test(content)) return content;
  if (!content.trim()) return SEO_AUDIT_SECTION_TEXT;
  return `${content}\n\n${SEO_AUDIT_SECTION_TEXT}`;
}

function formatAuditMarkdown(row) {
  return [
    "# Page Audit",
    "",
    `- URL: ${row.url}`,
    `- Page Type: ${row.pageType}`,
    `- Product Page: ${row.productPage}`,
    `- Score: ${row.evaluation?.score ?? "n/a"}`,
    "",
    "## Recommendations",
    row.seoRecommendations || "",
    "",
  ].join("\n");
}

async function runExportStage(input, context) {
  const shouldAppendAuditSection = input.productPage || input.pageType === "pdp";
  const optimizedWithAuditSection = appendAuditSectionIfNeeded(
    input.optimizedContent || "",
    shouldAppendAuditSection
  );

  if (optimizedWithAuditSection !== String(input.optimizedContent || "")) {
    await fsp.writeFile(input.paths.optimizedPath, optimizedWithAuditSection, "utf-8");
  } else if (fs.existsSync(input.paths.optimizedPath) && shouldAppendAuditSection) {
    const existing = await fsp.readFile(input.paths.optimizedPath, "utf-8");
    const patched = appendAuditSectionIfNeeded(existing, shouldAppendAuditSection);
    if (patched !== existing) {
      await fsp.writeFile(input.paths.optimizedPath, patched, "utf-8");
    }
  }

  const pageAudit = {
    url: input.url,
    pageType: input.pageType,
    productPage: input.productPage,
    headings: input.scrapedData?.headings || [],
    serpInsights: input.serpInsights || {},
    keywordClusters: input.keywordClusters || {},
    internalLinks: input.internalLinksAnalysis || {},
    technicalSEO: input.technicalSEO || {},
    contentQuality: input.contentQuality || {},
    evaluation: input.evaluation || null,
    contentScore: input.contentScore || null,
    retryMetadata: input.retryMetadata || null,
    seoRecommendations: optimizedWithAuditSection,
  };

  const versionedAudit = withArtifactMetadata(
    { data: pageAudit },
    {
      producer: "runPagePipeline",
      runId: context.runId,
      promptVersion: context.options?.promptVersion,
      model: context.options?.model,
    }
  );

  await writeJson(input.paths.auditJsonPath, versionedAudit);
  await fsp.writeFile(input.paths.auditPath, formatAuditMarkdown(pageAudit), "utf-8");
  await writeJson(
    input.paths.datasetPath,
    withArtifactMetadata(
      {
        data: {
          ...(input.scrapedData || {}),
          pageType: input.pageType,
          serpInsights: input.serpInsights || {},
          keywordClusters: input.keywordClusters || {},
          internalLinkSuggestions: input.internalLinksAnalysis?.contextualLinks || [],
        },
      },
      {
        producer: "scrapeStage",
        runId: context.runId,
        promptVersion: context.options?.promptVersion,
        model: context.options?.model,
      }
    )
  );

  if (context.options?.sendDocs && input.productPage) {
    const docTitle = `PDP Optimization - ${new URL(input.url).hostname} - ${input.slug}`;
    const docsResult = await sendToGoogleDoc(optimizedWithAuditSection, docTitle, {
      folderPath: context.options?.docsFolderPath || "",
    });
    return {
      ...input,
      optimizedContent: optimizedWithAuditSection,
      pageAudit,
      docsResult,
    };
  }

  if (fs.existsSync(input.paths.optimizedPath)) {
    // keep explicit artifact on disk as final step check
    await fsp.access(input.paths.optimizedPath);
  }

  return {
    ...input,
    optimizedContent: optimizedWithAuditSection,
    pageAudit,
  };
}

module.exports = {
  appendAuditSectionIfNeeded,
  SEO_AUDIT_SECTION_TEXT,
  runExportStage,
};
