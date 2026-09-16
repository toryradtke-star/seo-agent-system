import { createComponentDefinition } from "../../core/componentDefinition.js";
import { schema, responsiveRules } from "./schema.js";
import { processVariants } from "./variants/index.js";
import { buildProcessContent } from "./content.js";

export const processDefinition = createComponentDefinition({
  name: "process",
  schema,
  variants: processVariants,
  defaultVariant: "steps",
  responsiveRules,
  buildDefaultContent: buildProcessContent
});
