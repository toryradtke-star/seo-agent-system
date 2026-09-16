import { renderButton, renderSectionShell } from "../../shared/renderUtils.js";
import { escapeHtml } from "../../../core/html.js";

export function renderCtaMinimal(data) {
  return renderSectionShell({
    sectionClass: "wpb-cta wpb-cta--minimal",
    attributes: { id: "contact" },
    content: `
      <h2>${escapeHtml(data.title)}</h2>
      <p>${escapeHtml(data.text)}</p>
      ${renderButton({ className: "wpb-text-link", href: data.ctaLink, text: data.ctaText })}
    `
  });
}
