import { escapeHtml } from "../../../core/html.js";
import { renderCardGrid, renderHeadingBlock, renderList, renderSectionShell } from "../../shared/renderUtils.js";

export function renderPricingCards(data) {
  const cards = renderList(
    data.items,
    (item) => `
      <div class="wpb-pricing-card">
        <p class="wpb-eyebrow">${escapeHtml(item.label)}</p>
        <h3>${escapeHtml(item.price)}</h3>
        <p>${escapeHtml(item.description)}</p>
        ${item.note ? `<p class="wpb-pricing-note">${escapeHtml(item.note)}</p>` : ""}
      </div>
    `
  );

  return renderSectionShell({
    sectionClass: "wpb-pricing wpb-pricing--cards",
    content: `
      ${renderHeadingBlock({ title: data.title, intro: data.intro })}
      ${renderCardGrid({ items: [cards] })}
    `
  });
}
