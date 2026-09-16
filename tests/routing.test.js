const assert = require("assert");
const routePage = require("../pageRouterAgent");

async function run() {
  const pdp = routePage({ url: "https://site.com/custom-decals", headings: [{ tag: "h1", text: "Custom Decals" }] });
  const blog = routePage({ url: "https://site.com/blog/how-to", headings: [{ tag: "h1", text: "Guide" }] });
  const home = routePage({ url: "https://site.com/" });

  assert.strictEqual(pdp.pageType, "pdp");
  assert.strictEqual(blog.pageType, "blog");
  assert.strictEqual(home.pageType, "homepage");
}

module.exports = { run };

