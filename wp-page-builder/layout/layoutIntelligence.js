const variantCatalog = {
  hero: ["split", "centered", "minimal"],
  content: ["editorial", "stacked"],
  benefits: ["icons", "cards", "columns"],
  process: ["steps", "timeline"],
  pricing: ["cards"],
  testimonials: ["carousel", "grid"],
  faq: ["accordion", "simple"],
  cta: ["banner", "minimal"]
};

const conversionPreferences = {
  hero: "split",
  content: "stacked",
  benefits: "columns",
  process: "timeline",
  pricing: "cards",
  testimonials: "carousel",
  faq: "simple",
  cta: "banner"
};

const informationalPreferences = {
  hero: "centered",
  content: "editorial",
  benefits: "icons",
  process: "steps",
  pricing: "cards",
  testimonials: "grid",
  faq: "accordion",
  cta: "minimal"
};

const pageTypeOverrides = {
  home: {
    hero: "centered",
    cta: "banner"
  },
  blog: {
    hero: "minimal",
    content: "editorial",
    testimonials: "grid",
    cta: "minimal"
  },
  location: {
    hero: "split",
    benefits: "icons"
  }
};

const sectionStages = {
  hero: "opening",
  content: "education",
  benefits: "proof",
  pricing: "objection",
  process: "education",
  testimonials: "proof",
  faq: "objection",
  cta: "conversion"
};

// Layout intelligence now applies page-intent defaults, page-type overrides,
// and adjacency rules to keep nearby sections visually distinct.
export function selectVariants(
  sectionOrder,
  pageIntent = "conversion",
  pageType = "service",
  referenceSignals = {},
  learnedPattern = null,
  serpSignals = {}
) {
  return sectionOrder.reduce((selected, componentName, index) => {
    const options = variantCatalog[componentName] || ["default"];
    const previousSection = sectionOrder[index - 1];
    const previousVariant = previousSection ? selected[previousSection] : null;
    const stage = sectionStages[componentName];

    const preferred = resolvePreferredVariant({
      componentName,
      pageIntent,
      pageType,
      stage,
      previousVariant,
      referenceSignals,
      learnedPattern,
      serpSignals
    });

    selected[componentName] = chooseVariant({
      options,
      preferred,
      previousVariant
    });

    return selected;
  }, {});
}

function resolvePreferredVariant({
  componentName,
  pageIntent,
  pageType,
  stage,
  previousVariant,
  referenceSignals,
  learnedPattern,
  serpSignals
}) {
  const intentPreferences = pageIntent === "informational" || pageIntent === "navigational"
    ? informationalPreferences
    : conversionPreferences;

  const pageOverride = pageTypeOverrides[pageType]?.[componentName];
  if (pageOverride) {
    return pageOverride;
  }

  const learnedVariant = learnedPattern?.sectionVariants?.find((item) => item.component === componentName)?.variant;
  if (learnedVariant) {
    return learnedVariant;
  }

  if (componentName === "pricing" && (serpSignals.entities || []).some((entity) => String(entity).toLowerCase() === "pricing")) {
    return "cards";
  }

  if (referenceSignals.dominantSections?.includes(componentName)) {
    if (componentName === "hero" && referenceSignals.layoutPreference === "visual") {
      return "split";
    }
    if (componentName === "content" && referenceSignals.sectionDensity === "high") {
      return "editorial";
    }
    if (componentName === "benefits" && referenceSignals.layoutPreference === "visual") {
      return "columns";
    }
    if (componentName === "faq" && referenceSignals.ctaFrequency === "low") {
      return "accordion";
    }
  }

  if (stage === "proof" && previousVariant === "stacked") {
    return componentName === "benefits" ? "columns" : "carousel";
  }

  if (stage === "conversion" && pageIntent === "conversion") {
    if (referenceSignals.ctaFrequency === "low") {
      return "banner";
    }
    return "banner";
  }

  if (componentName === "testimonials" && referenceSignals.layoutPreference === "editorial") {
    return "grid";
  }

  return intentPreferences[componentName];
}

function chooseVariant({ options, preferred, previousVariant }) {
  if (preferred && options.includes(preferred) && preferred !== previousVariant) {
    return preferred;
  }

  const alternative = options.find((option) => option !== previousVariant);
  return alternative || options[0];
}
