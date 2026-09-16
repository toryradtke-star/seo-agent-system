import { escapeHtml } from "../../../core/html.js";
import { renderCardGrid, renderHeadingBlock, renderList, renderSectionShell } from "../../shared/renderUtils.js";

export function renderTestimonialsGrid(data) {
  const items = renderList(
    data.items,
    (item) => `
      <blockquote class="wpb-testimonial-card">
        <p>"${escapeHtml(item.quote)}"</p>
        <footer>${escapeHtml(item.name)}</footer>
      </blockquote>
    `
  );

  return renderSectionShell({
    sectionClass: "wpb-testimonials wpb-testimonials--grid",
    content: `
      ${renderHeadingBlock({ title: data.title })}
      ${renderCardGrid({ items: [items] })}
    `
  });
}
