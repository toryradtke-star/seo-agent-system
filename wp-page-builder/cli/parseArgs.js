const DEFAULTS = {
  topic: "Dry Needling",
  location: undefined,
  brand: undefined,
  colors: undefined,
  pageType: "service",
  theme: "clinic",
  export: ["console"],
  outputDir: "output/wp-page-builder",
  config: null,
  examples: undefined
};

const VALID_PAGE_TYPES = new Set(["service", "location", "landing", "home", "blog"]);
const VALID_THEMES = new Set(["clinic", "corporate", "startup", "gym", "local-service"]);
const VALID_EXPORTS = new Set(["console", "files", "drive"]);
const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function parseCliArgs(argv = []) {
  const args = [...argv];
  const options = { ...DEFAULTS };

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const next = args[index + 1];

    switch (key) {
      case "topic":
        options.topic = requireFlagValue(key, next);
        index += 1;
        break;
      case "location":
        options.location = requireFlagValue(key, next);
        index += 1;
        break;
      case "brand":
        options.brand = requireFlagValue(key, next);
        index += 1;
        break;
      case "colors":
        options.colors = normalizeColors(requireFlagValue(key, next));
        index += 1;
        break;
      case "pageType":
        options.pageType = requireFlagValue(key, next);
        index += 1;
        break;
      case "theme":
        options.theme = requireFlagValue(key, next);
        index += 1;
        break;
      case "export":
        options.export = normalizeExportModes(requireFlagValue(key, next));
        index += 1;
        break;
      case "outputDir":
        options.outputDir = requireFlagValue(key, next);
        index += 1;
        break;
      case "config":
        options.config = requireFlagValue(key, next);
        index += 1;
        break;
      case "examples":
        options.examples = normalizeExamples(requireFlagValue(key, next));
        index += 1;
        break;
      case "help":
        options.help = true;
        break;
      default:
        options.unknown = options.unknown || [];
        options.unknown.push(token);
    }
  }

  return options;
}

export function formatHelpText() {
  return `
Usage:
  node index.js --topic "Dry Needling" --location "Alexandria MN" --brand "Workout 24/7" --colors "#FFFFFF,#F77F00,#000000" --pageType service --theme clinic --export console,files,drive
  node index.js --topic "Gym Alexandria MN" --pageType home --examples ./examples/gym-home.html
  node index.js --config ./page-config.json --export files,drive

Options:
  --topic       Required page topic input.
  --location    Optional location string.
  --brand       Optional brand name used in page copy.
  --colors      Optional brand colors as "#FFFFFF,#F77F00,#000000".
  --pageType    service | location | landing | home | blog
  --theme       clinic | corporate | startup | gym | local-service
  --export      console | files | drive | all
  --outputDir   Output directory for file exports. Defaults to output/wp-page-builder
  --config      Optional JSON config file containing topic/location/brand/colors/pageType/theme/export/outputDir
  --examples    Optional comma-separated local HTML files, image files, or URLs used only for layout guidance.
  --help        Print this message.
  `.trim();
}

export function validateCliOptions(options) {
  const errors = [];

  if (options.unknown?.length) {
    errors.push(`Unknown arguments: ${options.unknown.join(", ")}`);
  }

  if (!options.topic || !String(options.topic).trim()) {
    errors.push("--topic is required.");
  }

  if (options.pageType && !VALID_PAGE_TYPES.has(options.pageType)) {
    errors.push(`--pageType must be one of: ${[...VALID_PAGE_TYPES].join(", ")}`);
  }

  if (options.theme && !VALID_THEMES.has(options.theme)) {
    errors.push(`--theme must be one of: ${[...VALID_THEMES].join(", ")}`);
  }

  if (options.colors && !options.colors.primary) {
    errors.push("--colors must contain three comma-separated hex colors.");
  }

  const invalidExports = (options.export || []).filter((mode) => !VALID_EXPORTS.has(mode));
  if (invalidExports.length > 0) {
    errors.push(`--export contains unsupported mode(s): ${invalidExports.join(", ")}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function normalizeExportModes(rawValue) {
  if (!rawValue) {
    return ["console"];
  }

  const modes = rawValue
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (modes.includes("all")) {
    return ["console", "files", "drive"];
  }

  return [...new Set(modes)];
}

function normalizeColors(rawValue) {
  const colors = rawValue
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (colors.length < 3) {
    return { invalid: true };
  }

  if (!colors.every((value) => HEX_COLOR_PATTERN.test(value))) {
    return { invalid: true };
  }

  const [surface, primary, accent] = colors;
  return {
    primary,
    secondary: primary,
    accent,
    surface,
    text: accent
  };
}

function normalizeExamples(rawValue) {
  if (!rawValue) {
    return undefined;
  }
  return rawValue.split(",").map((item) => item.trim()).filter(Boolean);
}

function requireFlagValue(key, value) {
  if (!value || value.startsWith("--")) {
    throw new Error(`--${key} requires an explicit value.`);
  }

  return value;
}
