import { assertValid } from "./schema.js";
import { ValidationError } from "./errors.js";

export function createComponentDefinition({
  name,
  schema,
  variants,
  defaultVariant,
  responsiveRules,
  buildDefaultContent
}) {
  return {
    name,
    schema,
    variants,
    defaultVariant,
    responsiveRules,
    buildDefaultContent,
    render({ variant, data }) {
      assertValid(schema, data, `${name} section`);
      const chosenVariant = variant && variants[variant] ? variant : defaultVariant;
      const renderVariant = variants[chosenVariant];
      if (!renderVariant) {
        throw new ValidationError(`Component "${name}" is missing a renderable variant.`, [
          `Requested variant: ${variant || "(default)"}`
        ]);
      }
      return renderVariant(data);
    }
  };
}
