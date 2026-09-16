import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzePatterns } from "./patternAnalyzer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultStorePath = path.join(__dirname, "patternStore.json");

export async function selectPreferredPattern({ pageType, theme }, options = {}) {
  const storePath = options.storePath || defaultStorePath;
  const patterns = await readPatternStore(storePath);
  const analysis = analyzePatterns(patterns, { pageType, theme });
  const preferred = analysis.mostCommon;

  if (!preferred || (preferred.confidence !== "medium" && preferred.confidence !== "high")) {
    return null;
  }

  return preferred;
}

export async function readPatternStore(storePath = defaultStorePath) {
  try {
    return JSON.parse(await fs.readFile(storePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}
