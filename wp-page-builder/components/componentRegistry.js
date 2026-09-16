import { heroDefinition } from "../sections/hero/definition.js";
import { benefitsDefinition } from "../sections/benefits/definition.js";
import { contentDefinition } from "../sections/content/definition.js";
import { processDefinition } from "../sections/process/definition.js";
import { testimonialsDefinition } from "../sections/testimonials/definition.js";
import { faqDefinition } from "../sections/faq/definition.js";
import { ctaDefinition } from "../sections/cta/definition.js";
import { pricingDefinition } from "../sections/pricing/definition.js";

// Central registry for all renderable sections. New components only need schema,
// variants, and a renderer to become available to the blueprint + renderer layers.
export const componentRegistry = {
  hero: heroDefinition,
  benefits: benefitsDefinition,
  content: contentDefinition,
  process: processDefinition,
  pricing: pricingDefinition,
  testimonials: testimonialsDefinition,
  faq: faqDefinition,
  cta: ctaDefinition
};

export function getComponent(name) {
  return componentRegistry[name];
}
