import { arrayField, objectField, stringField } from "../../core/schema.js";

export const schema = objectField(
  {
    title: stringField({ minLength: 3 }),
    intro: stringField({ minLength: 10 }),
    steps: arrayField(
      objectField(
        {
          title: stringField({ minLength: 2 }),
          description: stringField({ minLength: 5 })
        },
        { allowUnknown: false }
      ),
      { minItems: 1 }
    )
  },
  { allowUnknown: false }
);

export const responsiveRules = {
  desktop: "multi-step horizontal cards",
  tablet: "two-column step grid",
  mobile: "single column stacked steps"
};
