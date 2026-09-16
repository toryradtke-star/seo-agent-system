import { escapeHtml } from "../../../core/html.js";
import { renderCardGrid, renderHeadingBlock, renderList, renderSectionShell } from "../../shared/renderUtils.js";

export function renderProcessSteps(data) {
  const steps = renderList(
    data.steps,
    (step, index) => `
      <div class="wpb-process-step">
        <div class="wpb-step-number">${index + 1}</div>
        <h3>${escapeHtml(step.title)}</h3>
        <p>${escapeHtml(step.description)}</p>
      </div>
    `
  );

  return renderSectionShell({
    sectionClass: "wpb-process wpb-process--steps",
    content: `
      ${renderHeadingBlock({ title: data.title, intro: data.intro })}
      ${renderCardGrid({ items: [steps] })}
    `
  });
}
