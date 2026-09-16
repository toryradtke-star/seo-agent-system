import { ValidationError } from "./errors.js";

export function stringField(options = {}) {
  return { kind: "string", required: true, minLength: 1, ...options };
}

export function arrayField(item, options = {}) {
  return { kind: "array", item, required: true, minItems: 1, ...options };
}

export function objectField(shape, options = {}) {
  return { kind: "object", shape, required: true, allowUnknown: false, ...options };
}

export function enumField(values, options = {}) {
  return { kind: "enum", values, required: true, ...options };
}

export function optional(descriptor) {
  return { ...descriptor, required: false };
}

export function assertValid(schema, value, label = "Value") {
  const errors = [];
  validateNode(schema, value, label, errors);
  if (errors.length > 0) {
    throw new ValidationError(`${label} validation failed.`, errors);
  }
  return value;
}

function validateNode(schema, value, path, errors) {
  if (!schema) {
    return;
  }

  if ((value === undefined || value === null) && schema.required !== false) {
    errors.push(`${path} is required.`);
    return;
  }

  if (value === undefined || value === null) {
    return;
  }

  switch (schema.kind) {
    case "string":
      validateString(schema, value, path, errors);
      return;
    case "array":
      validateArray(schema, value, path, errors);
      return;
    case "object":
      validateObject(schema, value, path, errors);
      return;
    case "enum":
      validateEnum(schema, value, path, errors);
      return;
    default:
      errors.push(`${path} uses an unsupported schema kind.`);
  }
}

function validateString(schema, value, path, errors) {
  if (typeof value !== "string") {
    errors.push(`${path} must be a string.`);
    return;
  }

  if (schema.trim !== false && value.trim().length < (schema.minLength ?? 0)) {
    errors.push(`${path} must be at least ${schema.minLength ?? 0} characters.`);
  }

  if (schema.pattern && !schema.pattern.test(value)) {
    errors.push(`${path} is not in the expected format.`);
  }
}

function validateArray(schema, value, path, errors) {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array.`);
    return;
  }

  if (value.length < (schema.minItems ?? 0)) {
    errors.push(`${path} must contain at least ${schema.minItems ?? 0} item(s).`);
  }

  value.forEach((item, index) => {
    validateNode(schema.item, item, `${path}[${index}]`, errors);
  });
}

function validateObject(schema, value, path, errors) {
  if (!isPlainObject(value)) {
    errors.push(`${path} must be an object.`);
    return;
  }

  for (const [key, childSchema] of Object.entries(schema.shape || {})) {
    validateNode(childSchema, value[key], `${path}.${key}`, errors);
  }

  if (schema.allowUnknown === false) {
    for (const key of Object.keys(value)) {
      if (!(key in (schema.shape || {}))) {
        errors.push(`${path}.${key} is not allowed.`);
      }
    }
  }
}

function validateEnum(schema, value, path, errors) {
  if (!schema.values.includes(value)) {
    errors.push(`${path} must be one of: ${schema.values.join(", ")}.`);
  }
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
