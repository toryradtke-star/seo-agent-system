const runSchemaAgent = require("../../schemaAgent");
const { writeJson } = require("../pipelineUtils");
const { withArtifactMetadata } = require("../artifactMetadata");

async function runSchemaStage(input, context) {
  const schema = runSchemaAgent({
    url: input.url,
    pageType: input.productPage ? "pdp" : input.pageType,
    scrapedData: input.scrapedData,
    optimizedContent: input.optimizedContent || "",
  });

  const wrapped = withArtifactMetadata(
    { data: schema },
    {
      producer: "schemaAgent",
      runId: context.runId,
      promptVersion: context.options?.promptVersion,
      model: context.options?.model,
    }
  );

  await writeJson(input.paths.schemaPath, wrapped);
  return {
    ...input,
    schema,
  };
}

module.exports = {
  runSchemaStage,
};

