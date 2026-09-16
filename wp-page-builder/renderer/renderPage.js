import { componentRegistry } from "../components/componentRegistry.js";
import { validateBlueprint } from "../core/contracts.js";
import { resolveThemeTokens } from "../design/themes.js";
import { generateBaseCss, generateResponsiveCss } from "../design/cssGenerator.js";
import { buildResponsiveLayout } from "../layout/responsiveLayout.js";
import { renderSection } from "./renderSection.js";

export function renderPage({ blueprint, sectionContent, theme = "clinic", themeColors, seo }) {
  validateBlueprint(blueprint, componentRegistry);
  const tokens = resolveThemeTokens(theme, themeColors);
  const globalCSS = `${generateBaseCss(tokens)}\n${generateResponsiveCss()}`;
  const responsiveLayout = buildResponsiveLayout(blueprint, componentRegistry);
  const sections = blueprint.sections.map((section, index) =>
    renderSection(section, sectionContent[resolveSectionKey(section, index)], globalCSS)
  );
  const { html, fullPageHtml } = finalizeRenderedPage({
    pageType: blueprint.pageType,
    sections,
    globalCSS
  });

  return {
    sections,
    globalCSS,
    html,
    css: globalCSS,
    responsiveLayout,
    seo,
    fullPageHtml
  };
}

export function finalizeRenderedPage({ pageType, sections, globalCSS }) {
  const sectionsHtml = sections.map((section) => section.html).join("\n");

  const html = `
<div class="wpb-page" data-page-type="${pageType}">
  <main>
    ${sectionsHtml}
  </main>
</div>
  `.trim();

  const fullPageHtml = `
<style>
${globalCSS}
</style>
${html}
  `.trim();

  return {
    html,
    fullPageHtml
  };
}

function resolveSectionKey(section, index) {
  return section.id || `${section.component}-${index + 1}` || section.component;
}
