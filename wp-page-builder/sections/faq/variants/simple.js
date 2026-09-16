import { escapeHtml } from "../../../core/html.js";
import { renderHeadingBlock, renderList, renderSectionShell } from "../../shared/renderUtils.js";

export function renderFaqSimple(data) {
  const items = renderList(
    data.items,
    (item) => `
      <div class="wpb-faq-row">
        <h3>${escapeHtml(item.question)}</h3>
        <p>${escapeHtml(item.answer)}</p>
      </div>
    `
  );

  return renderSectionShell({
    sectionClass: "wpb-faq wpb-faq--simple",
    content: `
      ${renderHeadingBlock({ title: data.title })}
      ${items}
    `
  });
}
