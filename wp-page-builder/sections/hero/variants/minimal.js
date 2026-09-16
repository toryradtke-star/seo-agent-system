import { escapeHtml, sanitizeUrl } from "../../../core/html.js";
import { renderSectionShell } from "../../shared/renderUtils.js";

export function renderHeroMinimal(data) {
  return renderSectionShell({
    sectionClass: "wpb-hero wpb-hero--minimal",
    content: `
      <h1>${escapeHtml(data.headline)}</h1>
      <p class="wpb-lead">${escapeHtml(data.subtext)}</p>
      <a class="wpb-text-link" href="${sanitizeUrl(data.ctaLink)}">${escapeHtml(data.ctaText)}</a>
    `
  });
}
