import { objectField, stringField } from "../../core/schema.js";

export const schema = objectField(
  {
    headline: stringField({ minLength: 3 }),
    subtext: stringField({ minLength: 10 }),
    ctaText: stringField({ minLength: 2 }),
    ctaLink: stringField({ minLength: 1 }),
    image: stringField({ minLength: 1 })
  },
  { allowUnknown: false }
);

export const responsiveRules = {
  desktop: "split or centered layout",
  tablet: "stacked content with centered actions",
  mobile: "single column with compact spacing"
};
