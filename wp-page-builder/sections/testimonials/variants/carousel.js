import { escapeHtml } from "../../../core/html.js";
import { renderHeadingBlock, renderList, renderSectionShell } from "../../shared/renderUtils.js";

export function renderTestimonialsCarousel(data) {
  const items = renderList(
    data.items,
    (item) => `
      <div class="wpb-testimonial-slide">
        <blockquote>
          <p>"${escapeHtml(item.quote)}"</p>
          <footer>${escapeHtml(item.name)}</footer>
        </blockquote>
      </div>
    `
  );

  return renderSectionShell({
    sectionClass: "wpb-testimonials wpb-testimonials--carousel",
    content: `
      ${renderHeadingBlock({ title: data.title })}
      <div class="wpb-carousel-track">${items}</div>
    `
  });
}
