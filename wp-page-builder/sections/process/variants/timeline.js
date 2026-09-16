import { escapeHtml } from "../../../core/html.js";
import { renderHeadingBlock, renderList, renderSectionShell } from "../../shared/renderUtils.js";

export function renderProcessTimeline(data) {
  const steps = renderList(
    data.steps,
    (step, index) => `
      <div class="wpb-timeline-item">
        <div class="wpb-step-number">${index + 1}</div>
        <div>
          <h3>${escapeHtml(step.title)}</h3>
          <p>${escapeHtml(step.description)}</p>
        </div>
      </div>
    `
  );

  return renderSectionShell({
    sectionClass: "wpb-process wpb-process--timeline",
    content: `
      ${renderHeadingBlock({ title: data.title })}
      <div class="wpb-timeline">${steps}</div>
    `
  });
}
