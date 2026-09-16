import { createComponentDefinition } from "../../core/componentDefinition.js";
import { schema, responsiveRules } from "./schema.js";
import { benefitsVariants } from "./variants/index.js";
import { buildBenefitsContent } from "./content.js";

export const benefitsDefinition = createComponentDefinition({
  name: "benefits",
  schema,
  variants: benefitsVariants,
  defaultVariant: "icons",
  responsiveRules,
  buildDefaultContent: buildBenefitsContent
});
