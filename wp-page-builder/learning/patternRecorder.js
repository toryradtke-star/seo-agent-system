import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultStorePath = path.join(__dirname, "patternStore.json");
const MAX_PATTERNS = 200;
const LOCK_RETRY_MS = 50;
const LOCK_RETRY_COUNT = 40;

export async function recordPattern({ pageType, theme, blueprint }, options = {}) {
  const storePath = options.storePath || defaultStorePath;
  const releaseLock = await acquireLock(storePath);

  try {
    const patterns = await readPatternStore(storePath);
    const record = buildPatternRecord({ pageType, theme, blueprint });

    const existing = patterns.find((pattern) => pattern.signature === record.signature);
    if (existing) {
      existing.usageCount += 1;
      existing.lastUsed = new Date().toISOString();
    } else {
      patterns.push(record);
    }

    const prunedPatterns = prunePatterns(patterns);
    await atomicWriteJson(storePath, prunedPatterns);
    return existing || record;
  } finally {
    await releaseLock();
  }
}

function buildPatternRecord({ pageType, theme, blueprint }) {
  const sectionOrder = blueprint.sections.map((section) => section.component);
  const sectionVariants = blueprint.sections.map((section) => ({
    component: section.component,
    variant: section.variant
  }));

  return {
    pageType,
    theme,
    sectionOrder,
    sectionVariants,
    usageCount: 1,
    lastUsed: new Date().toISOString(),
    signature: `${pageType}::${theme}::${sectionOrder.join("|")}::${sectionVariants.map((item) => `${item.component}:${item.variant}`).join("|")}`
  };
}

async function readPatternStore(storePath) {
  try {
    const parsed = JSON.parse(await fs.readFile(storePath, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

function prunePatterns(patterns) {
  return [...patterns]
    .sort((left, right) => {
      if ((right.usageCount || 0) !== (left.usageCount || 0)) {
        return (right.usageCount || 0) - (left.usageCount || 0);
      }

      return new Date(right.lastUsed || 0).getTime() - new Date(left.lastUsed || 0).getTime();
    })
    .slice(0, MAX_PATTERNS);
}

async function atomicWriteJson(storePath, value) {
  const tempPath = `${storePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(value, null, 2), "utf8");
  await fs.rename(tempPath, storePath);
}

async function acquireLock(storePath) {
  const lockPath = `${storePath}.lock`;

  for (let attempt = 0; attempt < LOCK_RETRY_COUNT; attempt += 1) {
    try {
      const handle = await fs.open(lockPath, "wx");
      await handle.close();
      return async () => {
        try {
          await fs.unlink(lockPath);
        } catch (error) {
          if (error.code !== "ENOENT") {
            throw error;
          }
        }
      };
    } catch (error) {
      if (error.code !== "EEXIST") {
        throw error;
      }
      await sleep(LOCK_RETRY_MS * (attempt + 1));
    }
  }

  throw new Error(`Pattern store is locked: ${storePath}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
