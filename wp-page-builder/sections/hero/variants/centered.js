import { escapeHtml, sanitizeUrl } from "../../../core/html.js";
import { renderSectionShell } from "../../shared/renderUtils.js";

export function renderHeroCentered(data) {
  return renderSectionShell({
    sectionClass: "wpb-hero wpb-hero--centered",
    content: `
      <div class="wpb-hero__content">
        <p class="wpb-eyebrow">Targeted care</p>
        <h1>${escapeHtml(data.headline)}</h1>
        <p class="wpb-lead">${escapeHtml(data.subtext)}</p>
        <a class="wpb-button" href="${sanitizeUrl(data.ctaLink)}">${escapeHtml(data.ctaText)}</a>
      </div>
    `
  });
}
