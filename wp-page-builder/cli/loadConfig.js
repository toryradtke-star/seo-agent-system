import fs from "node:fs/promises";
import path from "node:path";

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export async function loadCliConfig(configPath) {
  if (!configPath) {
    return {};
  }

  const resolvedPath = path.resolve(configPath);
  const raw = await fs.readFile(resolvedPath, "utf8");
  const parsed = JSON.parse(raw);

  return {
    ...parsed,
    __configPath: resolvedPath
  };
}

export function mergeCliOptions(defaultedOptions, configOptions = {}) {
  const normalizedConfig = {
    ...pickDefined(configOptions),
    colors: normalizeColors(configOptions.colors)
  };

  return {
    ...defaultedOptions,
    ...normalizedConfig,
    export: configOptions.export ? normalizeExport(configOptions.export) : defaultedOptions.export,
    examples: configOptions.examples ? normalizeExamples(configOptions.examples) : defaultedOptions.examples
  };
}

function pickDefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== null));
}

function normalizeExport(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
  }

  return ["console"];
}

function normalizeColors(value) {
  if (!value) {
    return undefined;
  }

  if (typeof value === "string") {
    const [surface, primary, accent] = value.split(",").map((item) => item.trim()).filter(Boolean);
    if (!surface || !primary || !accent) {
      return undefined;
    }
    if (![surface, primary, accent].every((entry) => HEX_COLOR_PATTERN.test(entry))) {
      return undefined;
    }
    return {
      primary,
      secondary: primary,
      accent,
      surface,
      text: accent
    };
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    const colorValues = [value.surface, value.primary, value.accent].filter(Boolean);
    if (colorValues.length >= 3 && !colorValues.every((entry) => HEX_COLOR_PATTERN.test(entry))) {
      return undefined;
    }
    return value;
  }

  return undefined;
}

function normalizeExamples(value) {
  if (!value) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return undefined;
}
