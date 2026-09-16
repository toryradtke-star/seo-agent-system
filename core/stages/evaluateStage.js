const analyzeTechnicalSeo = require("../../technicalSeoAgent");
const analyzeContentQuality = require("../../contentQualityAgent");
const evaluatePdpOutput = require("../../evals/evaluatePdpOutput");
const scoreContent = require("../../evals/contentScorer");
const { writeJson } = require("../pipelineUtils");
const { withArtifactMetadata } = require("../artifactMetadata");

async function runEvaluateStage(input, context) {
  let evaluation = null;
  let contentScore = null;

  if (input.productPage) {
    evaluation = evaluatePdpOutput({
      optimizedContent: input.optimizedContent,
      schema: input.schema,
      productEntity: input.scrapedData?.productEntity || "",
    });
    contentScore = scoreContent({
      url: input.url,
      optimizedContent: input.optimizedContent,
      serpIntel: input.serpInsights || {},
      schemaPresent: !!input.schema,
    });
  }

  const technicalSEO = await analyzeTechnicalSeo(
    input.url,
    input.scrapedData?.first1500Words || input.scrapedData?.visibleText || ""
  );
  const contentQuality = analyzeContentQuality(
    input.scrapedData?.first1500Words || input.scrapedData?.visibleText || "",
    input.scrapedData?.headings || []
  );

  if (evaluation) {
    await writeJson(
      input.paths.evalPath,
      withArtifactMetadata(
        { data: evaluation },
        {
          producer: "evaluatePdpOutput",
          runId: context.runId,
          promptVersion: context.options?.promptVersion,
          model: context.options?.model,
        }
      )
    );
  }
  if (contentScore) {
    await writeJson(
      input.paths.scorePath,
      withArtifactMetadata(
        { data: contentScore },
        {
          producer: "contentScorer",
          runId: context.runId,
          promptVersion: context.options?.promptVersion,
          model: context.options?.model,
        }
      )
    );
  }

  return {
    ...input,
    evaluation,
    contentScore,
    technicalSEO,
    contentQuality,
  };
}

module.exports = {
  runEvaluateStage,
};

