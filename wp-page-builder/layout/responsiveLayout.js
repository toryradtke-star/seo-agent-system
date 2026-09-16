export const breakpoints = {
  desktop: 1200,
  tablet: 768,
  mobile: 0
};

export function buildResponsiveLayout(blueprint, registry) {
  const sectionRules = blueprint.sections.map((section) => ({
    component: section.component,
    variant: section.variant,
    rules: registry[section.component]?.responsiveRules || {}
  }));

  return {
    breakpoints,
    sections: sectionRules
  };
}
