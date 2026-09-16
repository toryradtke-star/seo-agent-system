const path = require("path");
const fs = require("fs");

async function runTest(filePath) {
  try {
    const mod = require(filePath);
    if (typeof mod.run !== "function") {
      throw new Error("Test module must export run()");
    }
    await mod.run();
    console.log(`PASS ${path.basename(filePath)}`);
    return true;
  } catch (err) {
    console.error(`FAIL ${path.basename(filePath)}: ${err?.message || err}`);
    return false;
  }
}

async function main() {
  const dir = __dirname;
  const files = fs.readdirSync(dir)
    .filter((f) => f.endsWith(".test.js"))
    .map((f) => path.join(dir, f));

  let passed = 0;
  for (const file of files) {
    if (await runTest(file)) {
      passed += 1;
    }
  }

  if (passed !== files.length) {
    process.exit(1);
  }
  console.log(`All tests passed (${passed}/${files.length}).`);
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});

