import { componentRegistry } from "../components/componentRegistry.js";

export function buildSectionContent(contentProfile, blueprint) {
  const sections = blueprint?.sections || [];

  return sections.reduce((contentMap, section) => {
    const component = componentRegistry[section.component];
    if (!component?.buildDefaultContent) {
      return contentMap;
    }

    contentMap[section.id || section.component] = component.buildDefaultContent(contentProfile, {
      section,
      blueprint
    });

    return contentMap;
  }, {});
}
