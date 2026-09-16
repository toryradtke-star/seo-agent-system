import { escapeHtml } from "../../../core/html.js";
import { renderCardGrid, renderHeadingBlock, renderList, renderSectionShell } from "../../shared/renderUtils.js";

export function renderBenefitsIcons(data) {
  const items = renderList(
    data.items,
    (item) => `
      <div class="wpb-benefit-card">
        <div class="wpb-benefit-card__icon">${escapeHtml(item.icon || "*")}</div>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.description)}</p>
      </div>
    `
  );

  return renderSectionShell({
    sectionClass: "wpb-benefits wpb-benefits--icons",
    content: `
      ${renderHeadingBlock({ title: data.title, intro: data.intro })}
      ${renderCardGrid({ items: [items] })}
    `
  });
}
