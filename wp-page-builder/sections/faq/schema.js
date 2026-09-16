import { arrayField, objectField, stringField } from "../../core/schema.js";

export const schema = objectField(
  {
    title: stringField({ minLength: 3 }),
    items: arrayField(
      objectField(
        {
          question: stringField({ minLength: 5 }),
          answer: stringField({ minLength: 5 })
        },
        { allowUnknown: false }
      ),
      { minItems: 1 }
    )
  },
  { allowUnknown: false }
);

export const responsiveRules = {
  desktop: "single column FAQ list",
  tablet: "single column FAQ list",
  mobile: "single column FAQ list with compact spacing"
};
