import { createComponentDefinition } from "../../core/componentDefinition.js";
import { schema, responsiveRules } from "./schema.js";
import { faqVariants } from "./variants/index.js";
import { buildFaqContent } from "./content.js";

export const faqDefinition = createComponentDefinition({
  name: "faq",
  schema,
  variants: faqVariants,
  defaultVariant: "accordion",
  responsiveRules,
  buildDefaultContent: buildFaqContent
});
