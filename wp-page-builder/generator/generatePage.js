import { validateBlueprint, validateContentProfile } from "../core/contracts.js";
import { componentRegistry } from "../components/componentRegistry.js";
import { analyzeContent } from "../content/contentIntelligence.js";
import { buildSectionContent } from "./contentGenerator.js";
import { generateBlueprint } from "./blueprintGenerator.js";
import { selectPreferredPattern } from "../learning/patternSelector.js";
import { renderPage } from "../renderer/renderPage.js";
import { analyzeSerp } from "../seo/serpAnalyzer.js";

export async function generatePage(input, options = {}) {
  const serp = options.serpSignals || (await analyzeSerp(input.topic, input.location));
  const contentProfile = analyzeContent({
    ...input,
    serp
  });
  validateContentProfile(contentProfile);

  const learnedPattern =
    options.learnedPattern ||
    (await selectPreferredPattern({
      pageType: contentProfile.pageType,
      theme: options.theme || input.theme || "clinic"
    }));

  const blueprint = generateBlueprint(contentProfile, {
    referenceSignals: options.referenceSignals,
    learnedPattern,
    serpSignals: serp
  });
  validateBlueprint(blueprint, componentRegistry);

  const sectionContent = buildSectionContent(contentProfile, blueprint);
  const renderedPage = renderPage({
    blueprint,
    sectionContent,
    theme: options.theme || input.theme || "clinic",
    themeColors: input.colors,
    seo: contentProfile.seo
  });

  return {
    ...renderedPage,
    pageType: blueprint.pageType,
    topic: [contentProfile.topic, contentProfile.location].filter(Boolean).join(" ").trim(),
    brand: contentProfile.brand,
    learnedPattern,
    blueprint,
    contentProfile
  };
}
