import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { analyzeReferences } from "../analysis/referenceAnalyzer.js";
import { generatePage } from "../generator/generatePage.js";

test("analyzeReferences extracts structural signals from local html", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "wpb-ref-"));
  const htmlPath = path.join(tempDir, "example.html");
  await fs.writeFile(
    htmlPath,
    `
    <html><body>
      <section><h1>Welcome to Our Gym</h1><p>Intro</p><a href="#join">Join Now</a></section>
      <section><h2>Why Choose Us</h2><div class="grid"><p>Benefit A</p><p>Benefit B</p></div></section>
      <section><h2>Testimonials</h2><img src="trainer.jpg" /><a href="#book">Book Today</a></section>
      <section><h2>FAQ</h2><p>Question</p></section>
    </body></html>
    `,
    "utf8"
  );

  const signals = await analyzeReferences([htmlPath]);

  assert.ok(signals.dominantSections.includes("benefits"));
  assert.equal(signals.layoutPreference, "visual");
  assert.equal(signals.ctaFrequency, "medium");
});

test("reference signals can guide layout selection without copying content", async () => {
  const result = await generatePage(
    {
      topic: "Gym Alexandria MN",
      pageType: "home",
      theme: "gym"
    },
    {
      referenceSignals: {
        dominantSections: ["hero", "benefits", "faq"],
        layoutPreference: "visual",
        sectionDensity: "medium",
        ctaFrequency: "low"
      }
    }
  );

  const heroSection = result.sections.find((section) => section.component === "hero");
  const benefitsSection = result.sections.find((section) => section.component === "benefits");
  assert.equal(heroSection.variant, "centered");
  assert.equal(benefitsSection.variant, "columns");
  assert.ok(!result.html.includes("Welcome to Our Gym"));
});
