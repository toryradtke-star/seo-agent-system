import { escapeHtml } from "../../../core/html.js";
import { renderHeadingBlock, renderList, renderParagraphs, renderSectionShell } from "../../shared/renderUtils.js";

export function renderContentStacked(data) {
  const highlights = renderList(
    data.highlights,
    (item) => `<div class="wpb-inline-note">${escapeHtml(item)}</div>`
  );

  return renderSectionShell({
    sectionClass: "wpb-content wpb-content--stacked",
    content: `
      ${renderHeadingBlock({ title: data.title })}
      ${renderParagraphs(data.paragraphs)}
      <div class="wpb-inline-note-list">${highlights}</div>
    `
  });
}
