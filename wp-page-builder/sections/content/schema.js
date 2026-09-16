import { arrayField, objectField, stringField } from "../../core/schema.js";

export const schema = objectField(
  {
    title: stringField({ minLength: 3 }),
    paragraphs: arrayField(stringField({ minLength: 5 }), { minItems: 1 }),
    highlights: arrayField(stringField({ minLength: 3 }), { minItems: 1 })
  },
  { allowUnknown: false }
);

export const responsiveRules = {
  desktop: "two-column editorial layout",
  tablet: "stacked content with highlights below",
  mobile: "single column with compact spacing"
};
