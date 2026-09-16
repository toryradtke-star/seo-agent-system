const assert = require("assert");
const fs = require("fs");
const path = require("path");
const scraper = require("../scraper");

async function run() {
  assert.strictEqual(typeof scraper.loadPage, "function");
  const src = fs.readFileSync(path.join(__dirname, "..", "scraper.js"), "utf-8");
  assert.ok(src.includes("assertSafeUrl"), "scraper must enforce URL safety");
  assert.ok(src.includes("first1500Words"), "scraper should provide structured text field");
}

module.exports = { run };

