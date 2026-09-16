import { objectField, stringField } from "../../core/schema.js";

export const schema = objectField(
  {
    title: stringField({ minLength: 3 }),
    text: stringField({ minLength: 5 }),
    ctaText: stringField({ minLength: 2 }),
    ctaLink: stringField({ minLength: 1 })
  },
  { allowUnknown: false }
);

export const responsiveRules = {
  desktop: "full-width banner with inline CTA",
  tablet: "stacked banner with centered CTA",
  mobile: "single column banner"
};
