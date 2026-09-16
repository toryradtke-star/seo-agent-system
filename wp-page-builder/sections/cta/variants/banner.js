import { renderButton, renderSectionShell } from "../../shared/renderUtils.js";
import { escapeHtml } from "../../../core/html.js";

export function renderCtaBanner(data) {
  return renderSectionShell({
    sectionClass: "wpb-cta wpb-cta--banner",
    attributes: { id: "contact" },
    content: `
      <div class="wpb-cta-panel">
        <div>
          <h2>${escapeHtml(data.title)}</h2>
          <p>${escapeHtml(data.text)}</p>
        </div>
        ${renderButton({ href: data.ctaLink, text: data.ctaText })}
      </div>
    `
  });
}
