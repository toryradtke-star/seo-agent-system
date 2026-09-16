import { escapeHtml } from "../../../core/html.js";
import { renderHeadingBlock, renderList, renderSectionShell } from "../../shared/renderUtils.js";

export function renderFaqAccordion(data) {
  const items = renderList(
    data.items,
    (item, index) => `
      <details class="wpb-faq-item" ${index === 0 ? "open" : ""}>
        <summary>${escapeHtml(item.question)}</summary>
        <p>${escapeHtml(item.answer)}</p>
      </details>
    `
  );

  return renderSectionShell({
    sectionClass: "wpb-faq wpb-faq--accordion",
    content: `
      ${renderHeadingBlock({ title: data.title })}
      <div class="wpb-faq-list">${items}</div>
    `
  });
}
