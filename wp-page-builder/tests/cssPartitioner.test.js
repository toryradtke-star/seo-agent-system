import test from "node:test";
import assert from "node:assert/strict";
import { extractClassNames, partitionCss } from "../design/cssPartitioner.js";
import { generatePage } from "../generator/generatePage.js";

test("extractClassNames collects unique classes from section html", () => {
  const classNames = extractClassNames('<section class="wpb-hero wpb-hero--centered"><div class="wpb-shell wpb-grid"></div></section>');

  assert.deepEqual([...classNames].sort(), ["wpb-grid", "wpb-hero", "wpb-hero--centered", "wpb-shell"]);
});

test("partitionCss returns only rules needed by the section including nested media rules", () => {
  const css = `
.wpb-hero { padding: 1rem; }
.wpb-hero--centered { text-align: center; }
.wpb-faq { margin: 0; }
@media (max-width: 1024px) {
  .wpb-hero { padding: 0.5rem; }
  .wpb-faq { margin: 1rem; }
}
  `;

  const sectionCss = partitionCss('<section class="wpb-hero wpb-hero--centered"></section>', css);

  assert.ok(sectionCss.includes(".wpb-hero { padding: 1rem; }"));
  assert.ok(sectionCss.includes(".wpb-hero--centered { text-align: center; }"));
  assert.ok(sectionCss.includes("@media (max-width: 1024px)"));
  assert.ok(sectionCss.includes(".wpb-hero { padding: 0.5rem; }"));
  assert.ok(!sectionCss.includes(".wpb-faq { margin: 0; }"));
});

test("rendered sections include section-scoped css artifacts", async () => {
  const result = await generatePage({
    topic: "Dry Needling",
    location: "Alexandria MN",
    pageType: "service",
    theme: "clinic"
  });

  const heroSection = result.sections.find((section) => section.component === "hero");
  assert.ok(heroSection.css.includes(".wpb-hero"));
  assert.ok(heroSection.css.includes(".wpb-grid--2"));
  assert.ok(!heroSection.css.includes(".wpb-faq"));
});
