import { getComponent } from "../components/componentRegistry.js";
import { partitionCss } from "../design/cssPartitioner.js";

export function renderSection(section, sectionData, globalCss = "") {
  const component = getComponent(section.component);
  if (!component) {
    throw new Error(`Unknown component: ${section.component}`);
  }

  const html = component.render({
    variant: section.variant,
    data: sectionData
  });
  const css = partitionCss(html, globalCss);

  return {
    component: section.component,
    id: section.id,
    variant: section.variant,
    html,
    css
  };
}
