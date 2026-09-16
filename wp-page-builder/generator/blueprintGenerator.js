import { homepageTemplate } from "../templates/homepage.js";
import { servicePageTemplate } from "../templates/servicePage.js";
import { locationPageTemplate } from "../templates/locationPage.js";
import { selectVariants } from "../layout/layoutIntelligence.js";

const templateMap = {
  home: homepageTemplate,
  homepage: homepageTemplate,
  service: servicePageTemplate,
  location: locationPageTemplate,
  landing: servicePageTemplate,
  blog: homepageTemplate
};

export function generateBlueprint(contentProfile, options = {}) {
  const defaultOrder = templateMap[contentProfile.pageType] || servicePageTemplate;
  const sectionOrder = options.learnedPattern?.sectionOrder?.length
    ? options.learnedPattern.sectionOrder
    : enhanceSectionOrder(defaultOrder, contentProfile.pageType, options.serpSignals || contentProfile.serp || {});
  const variants = selectVariants(
    sectionOrder,
    contentProfile.intent,
    contentProfile.pageType,
    options.referenceSignals || {},
    options.learnedPattern || null,
    options.serpSignals || contentProfile.serp || {}
  );

  return {
    pageType: contentProfile.pageType,
    intent: contentProfile.intent,
    sections: assignSectionIds(sectionOrder).map((section) => ({
      component: section.component,
      id: section.id,
      variant: variants[section.component]
    }))
  };
}

function enhanceSectionOrder(sectionOrder, pageType, serpSignals) {
  const order = [...sectionOrder];
  const entities = (serpSignals?.entities || []).map((entity) => String(entity).toLowerCase());

  if (pageType !== "blog" && entities.includes("pricing") && !order.includes("pricing") && order.includes("cta")) {
    const faqIndex = order.indexOf("faq");
    const insertIndex = faqIndex >= 0 ? faqIndex : order.length - 1;
    order.splice(insertIndex, 0, "pricing");
  }

  return order;
}

function assignSectionIds(sectionOrder) {
  const counts = new Map();

  return sectionOrder.map((component) => {
    const nextCount = (counts.get(component) || 0) + 1;
    counts.set(component, nextCount);

    return {
      component,
      id: nextCount === 1 ? `${component}-primary` : `${component}-${nextCount}`
    };
  });
}
