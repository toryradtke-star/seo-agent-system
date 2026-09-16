import { arrayField, objectField, optional, stringField } from "../../core/schema.js";

export const schema = objectField(
  {
    title: stringField({ minLength: 3 }),
    intro: stringField({ minLength: 10 }),
    items: arrayField(
      objectField(
        {
          icon: optional(stringField({ minLength: 1 })),
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
  desktop: "3-column layouts supported",
  tablet: "2-column layouts",
  mobile: "1-column stacked cards"
};
