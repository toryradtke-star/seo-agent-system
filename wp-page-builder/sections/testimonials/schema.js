import { arrayField, objectField, stringField } from "../../core/schema.js";

export const schema = objectField(
  {
    title: stringField({ minLength: 3 }),
    items: arrayField(
      objectField(
        {
          name: stringField({ minLength: 2 }),
          quote: stringField({ minLength: 5 })
        },
        { allowUnknown: false }
      ),
      { minItems: 1 }
    )
  },
  { allowUnknown: false }
);

export const responsiveRules = {
  desktop: "grid or carousel",
  tablet: "2-up testimonial cards",
  mobile: "single card slider or stack"
};
