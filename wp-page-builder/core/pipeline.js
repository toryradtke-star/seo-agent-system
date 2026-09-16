import { analyzeReferences } from "../analysis/referenceAnalyzer.js";
import { exportGeneratedPage } from "../exporters/index.js";
import { generatePage } from "../generator/generatePage.js";
import { recordPattern } from "../learning/patternRecorder.js";

export async function runPagePipeline(input, options = {}) {
  const referenceSignals = options.referenceSignals ?? (await analyzeReferences(options.examples));

  const page = await generatePage(
    {
      topic: input.topic,
      location: input.location,
      brand: input.brand,
      colors: input.colors,
      pageType: input.pageType,
      theme: input.theme
    },
    {
      theme: options.theme || input.theme,
      referenceSignals,
      learnedPattern: options.learnedPattern,
      serpSignals: options.serpSignals
    }
  );

  if (options.recordPattern !== false) {
    await recordPattern({
      pageType: page.pageType,
      theme: options.theme || input.theme,
      blueprint: page.blueprint
    });
  }

  const exports = options.exportModes?.length
    ? await exportGeneratedPage(page, {
        modes: options.exportModes,
        outputDir: options.outputDir,
        exporters: options.exporters
      })
    : [];

  return {
    page,
    exports,
    referenceSignals
  };
}
