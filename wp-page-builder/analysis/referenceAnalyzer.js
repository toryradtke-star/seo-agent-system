import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const SECTION_KEYWORDS = {
  hero: ["hero", "headline", "welcome"],
  content: ["about", "overview", "content"],
  benefits: ["benefit", "why choose", "features"],
  process: ["process", "how it works", "steps"],
  testimonials: ["testimonials", "reviews", "results"],
  faq: ["faq", "questions"],
  cta: ["cta", "get started", "book", "contact", "join"]
};

const CTA_TERMS = ["book", "contact", "join", "start", "call", "schedule", "claim", "sign up"];
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"]);
const HTML_EXTENSIONS = new Set([".html", ".htm"]);
const FETCH_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

export async function analyzeReferences(exampleInputs = [], deps = {}) {
  const inputs = normalizeExamples(exampleInputs);
  if (inputs.length === 0) {
    return emptySignals();
  }

  const fetchText = deps.fetchText || defaultFetchText;
  const analyzeImage = deps.analyzeImage || analyzeLocalImage;
  const htmlSignals = [];
  const imageSignals = [];

  for (const input of inputs) {
    try {
      const type = detectInputType(input);
      if (type === "html-file") {
        const html = await fs.readFile(path.resolve(input), "utf8");
        htmlSignals.push(analyzeHtmlContent(html));
        continue;
      }
      if (type === "html-url") {
        const html = await fetchText(input);
        htmlSignals.push(analyzeHtmlContent(html));
        continue;
      }
      if (type === "image-file") {
        imageSignals.push(await analyzeImage(path.resolve(input)));
      }
    } catch (_error) {
      continue;
    }
  }

  return mergeSignals(htmlSignals, imageSignals);
}

function normalizeExamples(exampleInputs) {
  if (!exampleInputs) {
    return [];
  }
  if (Array.isArray(exampleInputs)) {
    return exampleInputs.filter(Boolean);
  }
  if (typeof exampleInputs === "string") {
    return exampleInputs.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function detectInputType(input) {
  if (/^https?:\/\//i.test(input)) {
    const pathname = new URL(input).pathname.toLowerCase();
    const extension = path.extname(pathname);
    return IMAGE_EXTENSIONS.has(extension) ? "image-url" : "html-url";
  }

  const extension = path.extname(input).toLowerCase();
  if (IMAGE_EXTENSIONS.has(extension)) {
    return "image-file";
  }
  if (HTML_EXTENSIONS.has(extension)) {
    return "html-file";
  }
  return "html-file";
}

function analyzeHtmlContent(html) {
  const normalized = html.toLowerCase();
  const sectionCount = (normalized.match(/<section\b/g) || []).length || 1;
  const headingMatches = [...html.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi)];
  const headingText = headingMatches.map((match) => stripTags(match[2]).trim()).filter(Boolean);
  const paragraphCount = (normalized.match(/<p\b/g) || []).length;
  const imageCount = (normalized.match(/<img\b/g) || []).length;
  const buttonCount = (normalized.match(/<button\b/g) || []).length;
  const linkMatches = [...html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)];
  const ctaCount = buttonCount + linkMatches.filter((match) => CTA_TERMS.some((term) => stripTags(match[1]).toLowerCase().includes(term))).length;

  const componentCounts = Object.fromEntries(Object.keys(SECTION_KEYWORDS).map((key) => [key, 0]));
  for (const heading of headingText) {
    const normalizedHeading = heading.toLowerCase();
    for (const [component, keywords] of Object.entries(SECTION_KEYWORDS)) {
      if (keywords.some((keyword) => normalizedHeading.includes(keyword))) {
        componentCounts[component] += 1;
      }
    }
  }

  const dominantSections = Object.entries(componentCounts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([component]) => component);

  const layoutPreference = imageCount >= sectionCount || normalized.includes("grid") || normalized.includes("columns")
    ? "visual"
    : "editorial";

  const densityScore = paragraphCount + headingText.length * 2;
  const sectionDensity = densityScore / sectionCount > 8 ? "high" : densityScore / sectionCount > 4 ? "medium" : "low";
  const ctaFrequency = ctaCount >= 4 ? "high" : ctaCount >= 2 ? "medium" : "low";

  return {
    dominantSections,
    layoutPreference,
    sectionDensity,
    ctaFrequency
  };
}

async function analyzeLocalImage(filePath) {
  const command = `
Add-Type -AssemblyName System.Drawing;
$img = [System.Drawing.Image]::FromFile('${filePath.replace(/'/g, "''")}');
$bmp = New-Object System.Drawing.Bitmap($img);
$sample = @();
for ($x = 0; $x -lt $bmp.Width; $x += [Math]::Max([int]($bmp.Width / 10), 1)) {
  for ($y = 0; $y -lt $bmp.Height; $y += [Math]::Max([int]($bmp.Height / 10), 1)) {
    $c = $bmp.GetPixel($x, $y);
    $sample += ('#{0}{1}{2}' -f $c.R.ToString('X2'), $c.G.ToString('X2'), $c.B.ToString('X2'));
  }
}
$width = $bmp.Width;
$height = $bmp.Height;
$bmp.Dispose();
$img.Dispose();
@{ width=$width; height=$height; colors=$sample | Select-Object -First 5 } | ConvertTo-Json -Compress
`;

  const { stdout } = await execFileAsync("powershell", ["-NoProfile", "-Command", command], {
    windowsHide: true
  });

  const parsed = JSON.parse(stdout);
  const orientation = parsed.width >= parsed.height ? "visual" : "editorial";

  return {
    dominantSections: [],
    layoutPreference: orientation,
    sectionDensity: parsed.height > parsed.width ? "high" : "medium",
    ctaFrequency: "low",
    colors: parsed.colors || []
  };
}

async function defaultFetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const response = await fetch(url, { signal: controller.signal });
  if (!response.ok) {
    clearTimeout(timeout);
    throw new Error(`Failed to fetch example URL: ${url}`);
  }

  const contentLength = Number(response.headers.get("content-length") || "0");
  if (contentLength > MAX_RESPONSE_BYTES) {
    clearTimeout(timeout);
    throw new Error(`Reference URL exceeded max size: ${url}`);
  }

  try {
    const reader = response.body?.getReader();
    if (!reader) {
      return await response.text();
    }

    const chunks = [];
    let receivedBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      receivedBytes += value.byteLength;
      if (receivedBytes > MAX_RESPONSE_BYTES) {
        controller.abort();
        throw new Error(`Reference URL exceeded max size: ${url}`);
      }
      chunks.push(value);
    }

    return new TextDecoder().decode(concatChunks(chunks, receivedBytes));
  } finally {
    clearTimeout(timeout);
  }
}

function mergeSignals(htmlSignals, imageSignals) {
  const allSignals = [...htmlSignals, ...imageSignals];
  if (allSignals.length === 0) {
    return emptySignals();
  }

  return {
    dominantSections: mostCommon(allSignals.flatMap((signal) => signal.dominantSections)).slice(0, 4),
    layoutPreference: mostFrequentValue(allSignals.map((signal) => signal.layoutPreference)) || "balanced",
    sectionDensity: mostFrequentValue(allSignals.map((signal) => signal.sectionDensity)) || "medium",
    ctaFrequency: mostFrequentValue(allSignals.map((signal) => signal.ctaFrequency)) || "medium"
  };
}

function mostCommon(values) {
  const counts = new Map();
  for (const value of values) {
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([value]) => value);
}

function mostFrequentValue(values) {
  return mostCommon(values.filter(Boolean))[0];
}

function stripTags(value) {
  return String(value || "").replace(/<[^>]+>/g, " ");
}

function emptySignals() {
  return {
    dominantSections: [],
    layoutPreference: "balanced",
    sectionDensity: "medium",
    ctaFrequency: "medium"
  };
}

function concatChunks(chunks, totalLength) {
  const output = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return output;
}
