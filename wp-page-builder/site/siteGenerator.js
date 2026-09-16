import { exportGeneratedPage } from "../exporters/index.js";
import { generatePage } from "../generator/generatePage.js";
import { buildNavigation } from "./navigationBuilder.js";
import { buildSiteArchitecture } from "./siteArchitecture.js";
import { applyInternalLinks } from "./internalLinkEngine.js";

export async function generateSite(input, options = {}) {
  const siteBlueprint = options.siteBlueprint || buildSiteArchitecture(input);
  const navigation = buildNavigation(siteBlueprint);
  const pageResults = [];

  for (const page of siteBlueprint.pages) {
    const result = await generatePage(
      {
        topic: page.topic,
        location: page.location,
        brand: input.brand,
        colors: input.colors,
        pageType: page.type,
        theme: page.theme || input.theme
      },
      {
        theme: page.theme || input.theme,
        referenceSignals: options.referenceSignals,
        serpSignals: options.serpSignals
      }
    );

    pageResults.push({
      ...result,
      sitePath: page.type === "home" ? "/" : `/${page.type}/${slugify(page.topic)}`
    });
  }

  const linkedPages = applyInternalLinks(pageResults, siteBlueprint, navigation);

  if (options.exportModes?.length) {
    for (const page of linkedPages) {
      await exportGeneratedPage(page, {
        modes: options.exportModes,
        outputDir: options.outputDir
      });
    }
  }

  return {
    siteBlueprint,
    navigation,
    pages: linkedPages
  };
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
