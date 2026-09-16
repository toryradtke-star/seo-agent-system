import { arrayField, objectField, optional, stringField } from "../../core/schema.js";

export const schema = objectField(
  {
    title: stringField({ minLength: 3 }),
    intro: stringField({ minLength: 10 }),
    items: arrayField(
      objectField(
        {
          label: stringField({ minLength: 2 }),
          price: stringField({ minLength: 1 }),
          description: stringField({ minLength: 5 }),
          note: optional(stringField({ minLength: 2 }))
        },
        { allowUnknown: false }
      ),
      { minItems: 1 }
    )
  },
  { allowUnknown: false }
);

export const responsiveRules = {
  desktop: "3-column pricing cards",
  tablet: "2-column pricing cards",
  mobile: "single column pricing stack"
};
