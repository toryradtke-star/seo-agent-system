import { createComponentDefinition } from "../../core/componentDefinition.js";
import { schema, responsiveRules } from "./schema.js";
import { contentVariants } from "./variants/index.js";
import { buildContentSectionContent } from "./content.js";

export const contentDefinition = createComponentDefinition({
  name: "content",
  schema,
  variants: contentVariants,
  defaultVariant: "editorial",
  responsiveRules,
  buildDefaultContent: buildContentSectionContent
});
