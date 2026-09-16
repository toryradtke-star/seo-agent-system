import test from "node:test";
import assert from "node:assert/strict";
import { generatePage } from "../generator/generatePage.js";
import { selectVariants } from "../layout/layoutIntelligence.js";
import { buildSectionContent } from "../generator/contentGenerator.js";
import { servicePageTemplate } from "../templates/servicePage.js";

test("generatePage returns validated service output", async () => {
  const result = await generatePage({
    topic: "Dry Needling",
    location: "Alexandria MN",
    pageType: "service",
    theme: "clinic"
  });

  assert.equal(result.pageType, "service");
  assert.equal(result.contentProfile.topicType, "medical");
  assert.deepEqual(result.contentProfile.tone, ["professional", "trust-building"]);
  assert.ok(result.contentProfile.serp.entities.includes("pricing"));
  assert.ok(result.html.includes("wpb-page"));
  assert.ok(result.globalCSS.includes(":root"));
  assert.ok(Array.isArray(result.sections));
  assert.equal(result.sections.length, 8);
  assert.equal(result.sections[0].component, "hero");
  assert.equal(result.blueprint.sections.length, 8);
  assert.ok(result.sections.some((section) => section.component === "pricing"));
  assert.ok(result.html.includes('data-page-type="service"'));
});

test("generatePage escapes user-controlled content in rendered html", async () => {
  const result = await generatePage({
    topic: "<script>alert(1)</script>",
    location: "Austin TX",
    pageType: "service",
    theme: "clinic"
  });

  assert.ok(result.html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
  assert.ok(!result.html.includes("<script>alert(1)</script>"));
});

test("generatePage preserves CTA contact anchor after shared helper refactor", async () => {
  const result = await generatePage({
    topic: "Dry Needling",
    location: "Alexandria MN",
    pageType: "service",
    theme: "clinic"
  });

  assert.ok(result.html.includes('id="contact"'));
});

test("layout intelligence applies rule-based variants for conversion service pages", () => {
  const variants = selectVariants(
    ["hero", "content", "benefits", "process", "testimonials", "faq", "cta"],
    "conversion",
    "service"
  );

  assert.deepEqual(variants, {
    hero: "split",
    content: "stacked",
    benefits: "columns",
    process: "timeline",
    testimonials: "carousel",
    faq: "simple",
    cta: "banner"
  });
});

test("layout intelligence respects informational blog overrides", () => {
  const variants = selectVariants(
    ["hero", "content", "testimonials", "cta"],
    "informational",
    "blog"
  );

  assert.deepEqual(variants, {
    hero: "minimal",
    content: "editorial",
    testimonials: "grid",
    cta: "minimal"
  });
});

test("registry-driven section content only builds content for blueprint sections", () => {
  const contentProfile = {
    topic: "Dry Needling",
    location: "Alexandria MN"
  };

  const blueprint = {
    sections: [
      { component: "hero", variant: "split" },
      { component: "cta", variant: "banner" }
    ]
  };

  const sectionContent = buildSectionContent(contentProfile, blueprint);

  assert.deepEqual(Object.keys(sectionContent), ["hero", "cta"]);
  assert.ok(sectionContent.hero.headline.includes("Dry Needling"));
  assert.equal(sectionContent.cta.ctaText, "Schedule Now");
});

test("service template is composed from reusable template blocks", () => {
  assert.deepEqual(servicePageTemplate, ["hero", "content", "process", "benefits", "testimonials", "faq", "cta"]);
});

test("blog pages keep stable structural sections for regression safety", async () => {
  const result = await generatePage({
    topic: "Dry Needling",
    pageType: "blog",
    theme: "clinic"
  });

  assert.ok(result.html.includes("wpb-hero--minimal"));
  assert.ok(result.html.includes("What This Dry Needling Guide Covers"));
  assert.ok(result.html.includes("Want Expert Help Beyond This Dry Needling Guide?"));
  assert.ok(result.html.includes("Read the Guide"));
  assert.ok(result.sections.some((section) => section.component === "cta"));
});
