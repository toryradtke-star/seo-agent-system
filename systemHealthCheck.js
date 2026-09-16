const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const Anthropic = require("@anthropic-ai/sdk");

const execFileAsync = promisify(execFile);
const ROOT_DIR = __dirname;
const OUTPUT_DIR = path.join(ROOT_DIR, "output");
const HEALTH_DIR = path.join(OUTPUT_DIR, "health-check");
const TEST_URL = process.argv[2] || "http://example.com";
const MODEL = "claude-sonnet-4-20250514";

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function nowIso() {
  return new Date().toISOString();
}

function shortErr(err) {
  const msg = err?.message || String(err);
  return msg.length > 500 ? `${msg.slice(0, 500)}...` : msg;
}

async function runCommand(cmd, args, options = {}) {
  const result = {
    ok: false,
    stdout: "",
    stderr: "",
    error: null,
    exitCode: null,
  };
  try {
    const out = await execFileAsync(cmd, args, {
      cwd: ROOT_DIR,
      timeout: options.timeoutMs || 180000,
      maxBuffer: options.maxBuffer || 30 * 1024 * 1024,
      env: { ...process.env, ...(options.env || {}) },
    });
    result.ok = true;
    result.stdout = String(out.stdout || "");
    result.stderr = String(out.stderr || "");
    result.exitCode = 0;
    return result;
  } catch (err) {
    result.ok = false;
    result.stdout = String(err?.stdout || "");
    result.stderr = String(err?.stderr || "");
    result.error = err;
    result.exitCode = typeof err?.code === "number" ? err.code : null;
    return result;
  }
}

function parseJsonSafe(s) {
  try {
    return JSON.parse(s);
  } catch (_) {
    return null;
  }
}

function parseMasterPaths(stdout) {
  const lines = String(stdout || "").split(/\r?\n/);
  const out = {};
  for (const line of lines) {
    const a = line.match(/^MASTER: scraped -> (.+)$/);
    if (a) out.scrapedPath = a[1].trim();
    const b = line.match(/^MASTER: optimized -> (.+)$/);
    if (b) out.optimizedPath = b[1].trim();
    const c = line.match(/^MASTER: run metadata -> (.+)$/);
    if (c) out.runMetaPath = c[1].trim();
  }
  return out;
}

async function main() {
  ensureDir(OUTPUT_DIR);
  ensureDir(HEALTH_DIR);

  const report = {
    startedAt: nowIso(),
    testUrl: TEST_URL,
    checks: [],
    notes: [],
    ok: true,
  };

  function addCheck(name, ok, details, fix) {
    report.checks.push({ name, ok, details, fix: fix || null });
    if (!ok) report.ok = false;
  }

  // Dependency + config pre-checks
  const pkgPath = path.join(ROOT_DIR, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  const deps = pkg.dependencies || {};
  const requiredDeps = [
    "@anthropic-ai/sdk",
    "axios",
    "cheerio",
    "googleapis",
  ];
  const missingDeps = requiredDeps.filter((d) => !deps[d]);
  addCheck(
    "Dependencies in package.json",
    missingDeps.length === 0,
    missingDeps.length === 0
      ? `All required dependencies declared: ${requiredDeps.join(", ")}`
      : `Missing dependencies: ${missingDeps.join(", ")}`,
    missingDeps.length === 0 ? null : "Add missing dependencies to package.json and run npm install."
  );

  const apiKeyPresent = Boolean(process.env.ANTHROPIC_API_KEY);
  addCheck(
    "Environment: ANTHROPIC_API_KEY",
    apiKeyPresent,
    apiKeyPresent ? "ANTHROPIC_API_KEY is set in environment." : "ANTHROPIC_API_KEY is missing.",
    apiKeyPresent ? null : "Set ANTHROPIC_API_KEY in your shell/user environment before running API tests."
  );

  // TEST 1 — Claude Code membership
  let whoami = await runCommand("claude", ["whoami"], { timeoutMs: 20000 });
  if (!whoami.ok) {
    whoami = await runCommand("claude", ["whoami"], { timeoutMs: 20000 });
  }
  const whoamiText = `${whoami.stdout}\n${whoami.stderr}`.trim();
  let cliOk = whoami.ok && !/not logged in|unauth|error/i.test(whoamiText);
  let cliDetails = cliOk ? whoamiText || "Authenticated" : whoamiText || shortErr(whoami.error);
  let cliFix = "Run `claude login` and verify membership/session in Claude Code CLI.";

  if (!cliOk) {
    const authStatus = await runCommand("claude", ["auth", "status"], { timeoutMs: 20000 });
    const authRaw = `${authStatus.stdout}\n${authStatus.stderr}`.trim();
    const authJson = parseJsonSafe(authStatus.stdout);
    const loggedIn = Boolean(authJson && authJson.loggedIn === true);
    if (authStatus.ok && loggedIn) {
      cliOk = true;
      cliDetails = "whoami failed in non-interactive mode; auth status confirms logged in.";
      cliFix = null;
    } else if (authRaw) {
      cliDetails = `${cliDetails}\nFallback auth status: ${authRaw}`;
    }
  }
  addCheck(
    "TEST 1 — Claude Code membership (claude whoami)",
    cliOk,
    cliDetails,
    cliFix
  );
  fs.writeFileSync(path.join(HEALTH_DIR, "claude-whoami.log"), whoamiText, "utf-8");

  // TEST 2 — Claude API
  if (!apiKeyPresent) {
    addCheck(
      "TEST 2 — Claude API via SDK",
      false,
      "Skipped because ANTHROPIC_API_KEY is missing.",
      "Set ANTHROPIC_API_KEY and rerun."
    );
  } else {
    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 32,
        messages: [{ role: "user", content: "Reply with OK." }],
      });
      const text = (response.content || [])
        .filter((b) => b?.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      const apiOk = Boolean(text);
      addCheck(
        "TEST 2 — Claude API via SDK",
        apiOk,
        apiOk ? `Model=${response.model || MODEL}; Response=${text}` : "No text returned from API.",
        apiOk ? null : "Verify API key scope/quota and model availability."
      );
      fs.writeFileSync(
        path.join(HEALTH_DIR, "claude-api.json"),
        JSON.stringify({ model: response.model, text, timestamp: nowIso() }, null, 2),
        "utf-8"
      );
    } catch (err) {
      addCheck(
        "TEST 2 — Claude API via SDK",
        false,
        shortErr(err),
        "Confirm ANTHROPIC_API_KEY is valid and has access to the requested model."
      );
    }
  }

  // TEST 3 — Scraper
  const scraperRun = await runCommand("node", ["scraper.js", TEST_URL], { timeoutMs: 120000 });
  let scrapedData = null;
  if (scraperRun.ok) {
    scrapedData = parseJsonSafe(scraperRun.stdout.trim());
  }
  const scraperOk =
    scraperRun.ok &&
    scrapedData &&
    typeof scrapedData.bodyHtml === "string" &&
    Array.isArray(scrapedData.headings);
  if (scraperOk) {
    fs.writeFileSync(path.join(ROOT_DIR, "scraped-body.html"), scrapedData.bodyHtml, "utf-8");
    fs.writeFileSync(
      path.join(ROOT_DIR, "scraped-headings.json"),
      JSON.stringify(scrapedData.headings, null, 2),
      "utf-8"
    );
    fs.writeFileSync(
      path.join(HEALTH_DIR, "scraper-output.json"),
      JSON.stringify(scrapedData, null, 2),
      "utf-8"
    );
  }
  addCheck(
    "TEST 3 — Scraper",
    scraperOk,
    scraperOk
      ? "Scraper returned valid JSON; wrote scraped-body.html and scraped-headings.json."
      : (scraperRun.stderr || scraperRun.stdout || shortErr(scraperRun.error)),
    scraperOk ? null : "Check target URL reachability and scraper.js runtime dependencies."
  );

  // TEST 4 — PDP Agent
  const scrapedPath = path.join(HEALTH_DIR, "scraped-for-pdp.json");
  if (scraperOk) {
    fs.writeFileSync(scrapedPath, JSON.stringify(scrapedData, null, 2), "utf-8");
  }
  const pdpRun = scraperOk
    ? await runCommand("node", ["pdpAgent.js", TEST_URL, scrapedPath], { timeoutMs: 300000 })
    : { ok: false, stdout: "", stderr: "Skipped because scraper failed." };
  const pdpText = String(pdpRun.stdout || "").trim();
  const pdpOk = pdpRun.ok && pdpText.length > 0;
  if (pdpOk) {
    fs.writeFileSync(path.join(HEALTH_DIR, "pdp-output.txt"), pdpText, "utf-8");
  }
  addCheck(
    "TEST 4 — PDP Agent",
    pdpOk,
    pdpOk ? "PDP agent returned optimized content." : (pdpRun.stderr || shortErr(pdpRun.error)),
    pdpOk ? null : "Ensure ANTHROPIC_API_KEY is valid and pdpAgent.js can access the model."
  );

  // TEST 5 — Docs Agent
  const docsInputPath = path.join(HEALTH_DIR, "docs-input.txt");
  fs.writeFileSync(
    docsInputPath,
    pdpOk ? pdpText : "Health check fallback content",
    "utf-8"
  );
  const docsTitle = `System Health Check ${new Date().toISOString()}`;
  const docsRun = await runCommand("node", ["docsAgent.js", docsInputPath, docsTitle], {
    timeoutMs: 300000,
  });
  const docsOk = docsRun.ok && /DOCS:\s+done\. Doc ID:/i.test(docsRun.stdout);
  fs.writeFileSync(
    path.join(HEALTH_DIR, "docs-agent.log"),
    `${docsRun.stdout}\n${docsRun.stderr}`.trim(),
    "utf-8"
  );
  // Health artifact in /output for docs test traceability.
  fs.writeFileSync(
    path.join(HEALTH_DIR, "docs-agent-result.json"),
    JSON.stringify(
      {
        ok: docsOk,
        testedAt: nowIso(),
        note: "docsAgent.js publishes to Google Docs; this file is the local /output verification artifact.",
      },
      null,
      2
    ),
    "utf-8"
  );
  addCheck(
    "TEST 5 — Docs Agent",
    docsOk,
    docsOk
      ? "Docs agent authenticated and created a Google Doc; wrote /output health artifact."
      : (docsRun.stderr || docsRun.stdout || shortErr(docsRun.error)),
    docsOk ? null : "Run docsAgent.js once interactively to complete OAuth/token setup (oauth.json + token.json)."
  );

  // TEST 6 — Master Agent
  const masterRun = await runCommand("node", ["masterAgent.js", TEST_URL], {
    timeoutMs: 420000,
  });
  fs.writeFileSync(
    path.join(HEALTH_DIR, "master-agent.log"),
    `${masterRun.stdout}\n${masterRun.stderr}`.trim(),
    "utf-8"
  );
  const paths = parseMasterPaths(masterRun.stdout);
  const masterOk =
    masterRun.ok &&
    paths.scrapedPath &&
    paths.optimizedPath &&
    paths.runMetaPath &&
    fs.existsSync(paths.scrapedPath) &&
    fs.existsSync(paths.optimizedPath) &&
    fs.existsSync(paths.runMetaPath);
  addCheck(
    "TEST 6 — Master Agent",
    masterOk,
    masterOk
      ? `Full pipeline executed. Artifacts: ${paths.scrapedPath}, ${paths.optimizedPath}, ${paths.runMetaPath}`
      : (masterRun.stderr || masterRun.stdout || shortErr(masterRun.error)),
    masterOk ? null : "Inspect master-agent.log; common fixes are API key, docs OAuth token, or network access."
  );

  report.finishedAt = nowIso();
  fs.writeFileSync(
    path.join(HEALTH_DIR, "system-health-report.json"),
    JSON.stringify(report, null, 2),
    "utf-8"
  );

  console.log("SYSTEM HEALTH REPORT");
  for (const c of report.checks) {
    console.log(`${c.ok ? "✓" : "✗"} ${c.name}`);
    if (!c.ok) {
      console.log(`  Error: ${c.details}`);
      if (c.fix) console.log(`  Suggested fix: ${c.fix}`);
    }
  }
  console.log(`Report file: ${path.join(HEALTH_DIR, "system-health-report.json")}`);

  process.exit(report.ok ? 0 : 1);
}

main().catch((err) => {
  console.error("SYSTEM HEALTH REPORT");
  console.error(`✗ Fatal health check failure: ${shortErr(err)}`);
  process.exit(1);
});
