import test from "node:test";
import assert from "node:assert/strict";
import { analyzeSerp } from "../seo/serpAnalyzer.js";
import { generatePage } from "../generator/generatePage.js";

test("analyzeSerp returns entities, questions, and headings for a topic and location", async () => {
  const serp = await analyzeSerp("Dry Needling", "Alexandria MN");

  assert.ok(serp.entities.includes("pricing"));
  assert.ok(serp.questions.some((question) => question.includes("appointment") || question.includes("pricing")));
  assert.ok(serp.headings.some((heading) => /pricing/i.test(heading)));
});

test("SERP entities and questions feed pricing and FAQ generation", async () => {
  const result = await generatePage({
    topic: "Dry Needling",
    location: "Alexandria MN",
    pageType: "service",
    theme: "clinic"
  });

  const pricingSection = result.sections.find((section) => section.component === "pricing");
  const faqSection = result.sections.find((section) => section.component === "faq");

  assert.ok(pricingSection);
  assert.ok(pricingSection.html.includes("Pricing Overview"));
  assert.ok(faqSection.html.includes("What does the first appointment usually involve?"));
});
