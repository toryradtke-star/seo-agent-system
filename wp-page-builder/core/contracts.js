import { arrayField, assertValid, enumField, objectField, optional, stringField } from "./schema.js";
import { ValidationError } from "./errors.js";

export const contentInputSchema = objectField(
  {
    topic: stringField({ minLength: 1 }),
    location: optional(stringField({ minLength: 2 })),
    brand: optional(stringField({ minLength: 2 })),
    colors: optional(
      objectField(
        {
          primary: stringField({ minLength: 4 }),
          secondary: optional(stringField({ minLength: 4 })),
          accent: stringField({ minLength: 4 }),
          surface: stringField({ minLength: 4 }),
          text: optional(stringField({ minLength: 4 }))
        },
        { allowUnknown: false }
      )
    ),
    pageType: optional(stringField({ minLength: 2 })),
    theme: optional(stringField({ minLength: 2 })),
    serp: optional(
      objectField(
        {
          entities: arrayField(stringField({ minLength: 2 }), { minItems: 0 }),
          questions: arrayField(stringField({ minLength: 3 }), { minItems: 0 }),
          headings: arrayField(stringField({ minLength: 3 }), { minItems: 0 })
        },
        { allowUnknown: false }
      )
    )
  },
  { allowUnknown: false }
);

export const contentProfileSchema = objectField(
  {
    topic: stringField({ minLength: 1 }),
    pageType: enumField(["service", "location", "landing", "home", "blog"]),
    location: optional(stringField({ minLength: 2 })),
    brand: optional(stringField({ minLength: 2 })),
    topicType: enumField(["fitness", "medical", "home-service", "corporate", "local-service"]),
    tone: arrayField(stringField({ minLength: 2 }), { minItems: 2 }),
    serp: objectField(
      {
        entities: arrayField(stringField({ minLength: 2 }), { minItems: 0 }),
        questions: arrayField(stringField({ minLength: 3 }), { minItems: 0 }),
        headings: arrayField(stringField({ minLength: 3 }), { minItems: 0 })
      },
      { allowUnknown: false }
    ),
    intent: enumField(["conversion", "informational", "navigational"]),
    contentDepth: enumField(["light", "medium", "deep"]),
    seo: objectField(
      {
        title: stringField({ minLength: 1 }),
        description: stringField({ minLength: 1 }),
        headings: arrayField(stringField({ minLength: 1 }), { minItems: 1 }),
        keywords: arrayField(stringField({ minLength: 1 }), { minItems: 1 })
      },
      { allowUnknown: false }
    )
  },
  { allowUnknown: false }
);

const blueprintSchema = objectField(
  {
    pageType: stringField({ minLength: 1 }),
    intent: stringField({ minLength: 1 }),
    sections: arrayField(
      objectField(
        {
          component: stringField({ minLength: 1 }),
          id: optional(stringField({ minLength: 1 })),
          variant: stringField({ minLength: 1 })
        },
        { allowUnknown: false }
      ),
      { minItems: 1 }
    )
  },
  { allowUnknown: false }
);

const exportPayloadSchema = objectField(
  {
    pageType: stringField({ minLength: 1 }),
    topic: stringField({ minLength: 1 }),
    title: optional(stringField({ minLength: 1 })),
    blueprint: blueprintSchema,
    sections: optional(
      arrayField(
        objectField(
          {
            component: stringField({ minLength: 1 }),
            id: optional(stringField({ minLength: 1 })),
            variant: stringField({ minLength: 1 }),
            html: stringField({ minLength: 1 }),
            css: stringField({ minLength: 0 })
          },
          { allowUnknown: false }
        ),
        { minItems: 0 }
      )
    ),
    globalCSS: optional(stringField({ minLength: 0 })),
    html: stringField({ minLength: 1 }),
    css: stringField({ minLength: 1 })
  },
  { allowUnknown: false }
);

export function validateContentInput(input) {
  return assertValid(contentInputSchema, input, "Content input");
}

export function validateContentProfile(profile) {
  return assertValid(contentProfileSchema, profile, "Content profile");
}

export function validateBlueprint(blueprint, registry) {
  assertValid(blueprintSchema, blueprint, "Blueprint");

  const errors = [];
  for (const section of blueprint.sections) {
    const component = registry?.[section.component];
    if (!component) {
      errors.push(`Blueprint references unknown component "${section.component}".`);
      continue;
    }
    if (!component.variants[section.variant]) {
      errors.push(`Component "${section.component}" does not define variant "${section.variant}".`);
    }
  }

  if (errors.length > 0) {
    throw new ValidationError("Blueprint validation failed.", errors);
  }

  return blueprint;
}

export function validateExportPayload(payload) {
  return assertValid(exportPayloadSchema, payload, "Export payload");
}
