import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { analyzePatterns } from "../learning/patternAnalyzer.js";
import { recordPattern } from "../learning/patternRecorder.js";
import { selectPreferredPattern } from "../learning/patternSelector.js";
import { generatePage } from "../generator/generatePage.js";

test("pattern analyzer assigns confidence by usage count", () => {
  const analysis = analyzePatterns([
    { pageType: "home", theme: "gym", usageCount: 1 },
    { pageType: "home", theme: "gym", usageCount: 3 },
    { pageType: "home", theme: "gym", usageCount: 6 }
  ]);

  assert.equal(analysis.topPatterns[0].confidence, "high");
  assert.equal(analysis.topPatterns[1].confidence, "medium");
  assert.equal(analysis.topPatterns[2].confidence, "low");
});

test("pattern recorder stores and increments blueprint patterns", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "wpb-patterns-"));
  const storePath = path.join(tempDir, "patternStore.json");

  await recordPattern(
    {
      pageType: "service",
      theme: "clinic",
      blueprint: {
        sections: [
          { component: "hero", variant: "split" },
          { component: "cta", variant: "banner" }
        ]
      }
    },
    { storePath }
  );

  await recordPattern(
    {
      pageType: "service",
      theme: "clinic",
      blueprint: {
        sections: [
          { component: "hero", variant: "split" },
          { component: "cta", variant: "banner" }
        ]
      }
    },
    { storePath }
  );

  const stored = JSON.parse(await fs.readFile(storePath, "utf8"));
  assert.equal(stored.length, 1);
  assert.equal(stored[0].usageCount, 2);
  assert.ok(stored[0].lastUsed);
});

test("pattern recorder prunes least-used patterns beyond max size", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "wpb-pattern-limit-"));
  const storePath = path.join(tempDir, "patternStore.json");
  const largeStore = Array.from({ length: 205 }, (_, index) => ({
    pageType: "service",
    theme: "clinic",
    sectionOrder: ["hero", "cta"],
    sectionVariants: [
      { component: "hero", variant: "split" },
      { component: "cta", variant: "banner" }
    ],
    usageCount: index + 1,
    lastUsed: new Date(Date.now() - index * 1000).toISOString(),
    signature: `sig-${index}`
  }));

  await fs.writeFile(storePath, JSON.stringify(largeStore, null, 2), "utf8");

  await recordPattern(
    {
      pageType: "service",
      theme: "clinic",
      blueprint: {
        sections: [
          { component: "hero", variant: "split" },
          { component: "cta", variant: "banner" }
        ]
      }
    },
    { storePath }
  );

  const stored = JSON.parse(await fs.readFile(storePath, "utf8"));
  assert.equal(stored.length, 200);
});

test("pattern selector returns only medium or high confidence patterns", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "wpb-pattern-select-"));
  const storePath = path.join(tempDir, "patternStore.json");
  await fs.writeFile(
    storePath,
    JSON.stringify(
      [
        {
          pageType: "home",
          theme: "gym",
          sectionOrder: ["hero", "benefits", "cta"],
          sectionVariants: [
            { component: "hero", variant: "centered" },
            { component: "benefits", variant: "columns" },
            { component: "cta", variant: "banner" }
          ],
          usageCount: 3,
          signature: "x"
        }
      ],
      null,
      2
    ),
    "utf8"
  );

  const preferred = await selectPreferredPattern({ pageType: "home", theme: "gym" }, { storePath });
  assert.equal(preferred.sectionVariants[0].variant, "centered");
  assert.equal(preferred.confidence, "medium");
});

test("generatePage can use learned pattern variants", async () => {
  const result = await generatePage(
    {
      topic: "Gym Home Page",
      pageType: "home",
      theme: "gym"
    },
    {
      theme: "gym",
      referenceSignals: {},
      learnedPattern: {
        pageType: "home",
        theme: "gym",
        sectionOrder: ["hero", "content", "benefits", "testimonials", "cta"],
        sectionVariants: [
          { component: "hero", variant: "centered" },
          { component: "content", variant: "editorial" },
          { component: "benefits", variant: "columns" },
          { component: "testimonials", variant: "grid" },
          { component: "cta", variant: "banner" }
        ],
        usageCount: 5,
        confidence: "medium"
      }
    }
  );

  const benefitsSection = result.sections.find((section) => section.component === "benefits");
  assert.equal(benefitsSection.variant, "columns");
});
