import { escapeHtml } from "../../../core/html.js";
import { renderCardGrid, renderHeadingBlock, renderList, renderSectionShell } from "../../shared/renderUtils.js";

export function renderBenefitsColumns(data) {
  const items = renderList(
    data.items,
    (item) => `
      <div class="wpb-benefit-column">
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.description)}</p>
      </div>
    `
  );

  return renderSectionShell({
    sectionClass: "wpb-benefits wpb-benefits--columns",
    content: `
      ${renderHeadingBlock({ title: data.title, intro: data.intro })}
      ${renderCardGrid({ items: [items] })}
    `
  });
}
