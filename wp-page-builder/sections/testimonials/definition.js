import { createComponentDefinition } from "../../core/componentDefinition.js";
import { schema, responsiveRules } from "./schema.js";
import { testimonialsVariants } from "./variants/index.js";
import { buildTestimonialsContent } from "./content.js";

export const testimonialsDefinition = createComponentDefinition({
  name: "testimonials",
  schema,
  variants: testimonialsVariants,
  defaultVariant: "grid",
  responsiveRules,
  buildDefaultContent: buildTestimonialsContent
});
