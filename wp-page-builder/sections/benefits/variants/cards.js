import { escapeHtml } from "../../../core/html.js";
import { renderCardGrid, renderHeadingBlock, renderList, renderSectionShell } from "../../shared/renderUtils.js";

export function renderBenefitsCards(data) {
  const items = renderList(
    data.items,
    (item) => `
      <article class="wpb-benefit-panel">
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.description)}</p>
      </article>
    `
  );

  return renderSectionShell({
    sectionClass: "wpb-benefits wpb-benefits--cards",
    content: `
      ${renderHeadingBlock({ title: data.title })}
      ${renderCardGrid({ items: [items] })}
    `
  });
}
