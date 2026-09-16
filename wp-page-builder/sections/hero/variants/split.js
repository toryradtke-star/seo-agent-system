import { escapeAttribute, escapeHtml, sanitizeUrl } from "../../../core/html.js";
import { renderSectionShell } from "../../shared/renderUtils.js";

export function renderHeroSplit(data) {
  return renderSectionShell({
    sectionClass: "wpb-hero wpb-hero--split",
    innerClass: "wpb-shell wpb-grid wpb-grid--2",
    content: `
      <div class="wpb-hero__content">
        <p class="wpb-eyebrow">Conversion-focused service page</p>
        <h1>${escapeHtml(data.headline)}</h1>
        <p class="wpb-lead">${escapeHtml(data.subtext)}</p>
        <a class="wpb-button" href="${sanitizeUrl(data.ctaLink)}">${escapeHtml(data.ctaText)}</a>
      </div>
      <div class="wpb-hero__media">
        <img src="${sanitizeUrl(data.image)}" alt="${escapeAttribute(data.headline)}" />
      </div>
    `
  });
}
