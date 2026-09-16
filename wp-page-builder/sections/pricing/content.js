import { generatePricing } from "../../content/semanticGenerator.js";

export function buildPricingContent(contentProfile) {
  return generatePricing(contentProfile);
}
