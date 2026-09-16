import test from "node:test";
import assert from "node:assert/strict";
import { expandTopics } from "../site/topicExpansion.js";
import { buildSiteArchitecture } from "../site/siteArchitecture.js";
import { buildNavigation } from "../site/navigationBuilder.js";
import { generateSite } from "../site/siteGenerator.js";

test("topicExpansion expands a core therapy topic into related service topics", () => {
  const topics = expandTopics("Physical Therapy Alexandria MN");

  assert.deepEqual(
    topics.map((entry) => entry.fullTopic),
    ["Dry Needling Alexandria MN", "Manual Therapy Alexandria MN", "Sports Injury Therapy Alexandria MN"]
  );
});

test("siteArchitecture builds a multi-page site blueprint", () => {
  const blueprint = buildSiteArchitecture({
    siteName: "Alexandria Therapy",
    topic: "Physical Therapy Alexandria MN",
    theme: "clinic"
  });

  assert.equal(blueprint.siteName, "Alexandria Therapy");
  assert.ok(blueprint.pages.some((page) => page.type === "home"));
  assert.ok(blueprint.pages.some((page) => page.type === "service"));
  assert.ok(blueprint.pages.some((page) => page.type === "location"));
  assert.ok(blueprint.pages.some((page) => page.type === "blog"));
});

test("navigationBuilder creates stable labels and hrefs", () => {
  const navigation = buildNavigation({
    siteName: "Workout 24/7",
    pages: [
      { type: "home", topic: "Workout 24/7" },
      { type: "service", topic: "Personal Training Alexandria MN" }
    ]
  });

  assert.deepEqual(navigation.items, [
    { label: "Home", href: "/", type: "home", topic: "Workout 24/7" },
    {
      label: "Personal Training Alexandria MN",
      href: "/service/personal-training-alexandria-mn",
      type: "service",
      topic: "Personal Training Alexandria MN"
    }
  ]);
});

test("siteGenerator builds pages with navigation and internal links using the page pipeline as a submodule", async () => {
  const site = await generateSite({
    siteName: "Alexandria Therapy",
    topic: "Physical Therapy Alexandria MN",
    brand: "Alexandria Therapy",
    theme: "clinic"
  });

  assert.ok(site.pages.length >= 6);
  assert.ok(site.navigation.items.length >= site.pages.length);
  assert.ok(site.pages.every((page) => page.html.includes("wpb-site-nav")));
  assert.ok(site.pages.every((page) => Array.isArray(page.internalLinks) && page.internalLinks.length > 0));
  assert.ok(site.pages.every((page) => page.sections.some((section) => section.component === "site-navigation")));
  assert.ok(site.pages.some((page) => page.pageType === "service"));
});
