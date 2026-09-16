import { createComponentDefinition } from "../../core/componentDefinition.js";
import { schema, responsiveRules } from "./schema.js";
import { ctaVariants } from "./variants/index.js";
import { buildCtaContent } from "./content.js";

export const ctaDefinition = createComponentDefinition({
  name: "cta",
  schema,
  variants: ctaVariants,
  defaultVariant: "banner",
  responsiveRules,
  buildDefaultContent: buildCtaContent
});
