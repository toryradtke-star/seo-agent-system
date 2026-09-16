import { createComponentDefinition } from "../../core/componentDefinition.js";
import { schema, responsiveRules } from "./schema.js";
import { heroVariants } from "./variants/index.js";
import { buildHeroContent } from "./content.js";

export const heroDefinition = createComponentDefinition({
  name: "hero",
  schema,
  variants: heroVariants,
  defaultVariant: "centered",
  responsiveRules,
  buildDefaultContent: buildHeroContent
});
