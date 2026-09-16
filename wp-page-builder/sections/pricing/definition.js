import { createComponentDefinition } from "../../core/componentDefinition.js";
import { schema, responsiveRules } from "./schema.js";
import { pricingVariants } from "./variants/index.js";
import { buildPricingContent } from "./content.js";

export const pricingDefinition = createComponentDefinition({
  name: "pricing",
  schema,
  variants: pricingVariants,
  defaultVariant: "cards",
  responsiveRules,
  buildDefaultContent: buildPricingContent
});
