import { escapeHtml } from "../../../core/html.js";
import { renderHeadingBlock, renderList, renderParagraphs, renderSectionShell } from "../../shared/renderUtils.js";

export function renderContentEditorial(data) {
  const highlights = renderList(data.highlights, (item) => `<li>${escapeHtml(item)}</li>`);

  return renderSectionShell({
    sectionClass: "wpb-content wpb-content--editorial",
    innerClass: "wpb-shell wpb-grid wpb-grid--2",
    content: `
      <div>
        ${renderHeadingBlock({ title: data.title })}
        ${renderParagraphs(data.paragraphs)}
      </div>
      <aside class="wpb-content-sidebar">
        <h3>Key Points</h3>
        <ul class="wpb-list">${highlights}</ul>
      </aside>
    `
  });
}
