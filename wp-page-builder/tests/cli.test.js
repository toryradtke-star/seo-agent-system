import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseCliArgs } from "../cli/parseArgs.js";
import { exportGeneratedPage } from "../exporters/index.js";
import { generatePage } from "../generator/generatePage.js";

test("parseCliArgs returns defaults", () => {
  const options = parseCliArgs([]);

  assert.equal(options.topic, "Dry Needling");
  assert.equal(options.location, undefined);
  assert.deepEqual(options.export, ["console"]);
  assert.equal(options.outputDir, "output/wp-page-builder");
});

test("parseCliArgs parses explicit flags", () => {
  const options = parseCliArgs([
    "--topic",
    "Physical Therapy",
    "--location",
    "Fargo ND",
    "--brand",
    "Workout 24/7",
    "--colors",
    "#FFFFFF,#F77F00,#000000",
    "--pageType",
    "location",
    "--theme",
    "corporate",
    "--export",
    "files,drive",
    "--outputDir",
    "output/custom"
  ]);

  assert.equal(options.topic, "Physical Therapy");
  assert.equal(options.location, "Fargo ND");
  assert.equal(options.brand, "Workout 24/7");
  assert.equal(options.colors.primary, "#F77F00");
  assert.equal(options.colors.surface, "#FFFFFF");
  assert.equal(options.colors.accent, "#000000");
  assert.equal(options.pageType, "location");
  assert.equal(options.theme, "corporate");
  assert.deepEqual(options.export, ["files", "drive"]);
  assert.equal(options.outputDir, "output/custom");
});

test("parseCliArgs captures config path", () => {
  const options = parseCliArgs(["--config", "./page-config.json"]);
  assert.equal(options.config, "./page-config.json");
});

test("parseCliArgs rejects missing flag values", () => {
  assert.throws(() => parseCliArgs(["--topic", "--theme", "clinic"]), /--topic requires an explicit value/);
});

test("parseCliArgs rejects invalid color formats", () => {
  const options = parseCliArgs(["--colors", "red,#F77F00,#000000"]);
  assert.equal(options.colors.invalid, true);
});

test("file exporter writes artifacts for generated pages", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "wp-page-builder-"));
  const page = await generatePage({
    topic: "Dry Needling",
    location: "Alexandria MN",
    pageType: "service",
    theme: "clinic"
  });

  const results = await exportGeneratedPage(page, {
    modes: ["files"],
    outputDir: tempDir
  });

  const artifactDir = results[0].artifactDir;
  const blueprintPath = path.join(artifactDir, "blueprint.json");
  const htmlPath = path.join(artifactDir, "page.html");
  const sectionsPath = path.join(artifactDir, "sections.json");
  const manifestPath = path.join(artifactDir, "manifest.json");
  const latestPath = path.join(tempDir, "latest.json");

  const [blueprintContent, htmlContent, sectionsContent, manifestContent, latestContent] = await Promise.all([
    fs.readFile(blueprintPath, "utf8"),
    fs.readFile(htmlPath, "utf8"),
    fs.readFile(sectionsPath, "utf8"),
    fs.readFile(manifestPath, "utf8"),
    fs.readFile(latestPath, "utf8")
  ]);

  assert.ok(blueprintContent.includes('"pageType": "service"'));
  assert.ok(htmlContent.includes("wpb-page"));
  assert.ok(sectionsContent.includes('"component": "hero"'));
  assert.ok(manifestContent.includes('"manifest": "manifest.json"'));
  assert.ok(manifestContent.includes('"sections": "sections.json"'));
  assert.ok(latestContent.includes('"pageType": "service"'));
});

test("generatePage uses page-type-specific content strategies", async () => {
  const blogPage = await generatePage({
    topic: "Dry Needling",
    pageType: "blog",
    theme: "clinic"
  });

  const homePage = await generatePage({
    topic: "Dry Needling",
    pageType: "home",
    theme: "clinic"
  });

  assert.equal(blogPage.pageType, "blog");
  assert.equal(homePage.pageType, "home");
  assert.ok(blogPage.html.includes("Dry Needling: What to Know Before You Take the Next Step"));
  assert.ok(blogPage.html.includes("Read the Guide"));
  assert.ok(homePage.html.includes("Explore Services"));
  assert.ok(homePage.html.includes("How Dry Needling Helps New Visitors"));
});

test("generatePage supports brand and custom color overrides without default location", async () => {
  const result = await generatePage({
    topic: "gym home page",
    brand: "Workout 24/7",
    colors: {
      surface: "#FFFFFF",
      primary: "#F77F00",
      accent: "#000000",
      text: "#000000"
    },
    pageType: "home",
    theme: "gym"
  });

  assert.equal(result.contentProfile.location, undefined);
  assert.equal(result.brand, "Workout 24/7");
  assert.ok(result.html.includes("Workout 24/7 Helps Members Start Strong"));
  assert.ok(result.html.includes("How Workout 24/7 Helps New Visitors"));
  assert.ok(result.globalCSS.includes("--color-surface: #FFFFFF;"));
  assert.ok(result.globalCSS.includes("--color-primary: #F77F00;"));
  assert.ok(result.globalCSS.includes("--color-accent: #000000;"));
});

test("exportGeneratedPage supports injected exporters for non-network tests", async () => {
  const page = await generatePage({
    topic: "Dry Needling",
    location: "Alexandria MN",
    pageType: "service",
    theme: "clinic"
  });

  const calls = [];
  const results = await exportGeneratedPage(page, {
    modes: ["console", "drive"],
    exporters: {
      console: async (pageData) => {
        calls.push({ mode: "console", topic: pageData.topic });
        return { mode: "console", ok: true };
      },
      drive: async (pageData) => {
        calls.push({ mode: "drive", pageType: pageData.pageType });
        return { mode: "drive", url: "https://example.test/doc/123" };
      }
    }
  });

  assert.deepEqual(calls, [
    { mode: "console", topic: "Dry Needling Alexandria MN" },
    { mode: "drive", pageType: "service" }
  ]);
  assert.deepEqual(results, [
    { mode: "console", ok: true },
    { mode: "drive", url: "https://example.test/doc/123" }
  ]);
});
