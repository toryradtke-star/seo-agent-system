const fs = require("fs");
const fsp = fs.promises;
const path = require("path");

function safeFilenameFromUrl(url) {
  const u = new URL(url);
  const pathname = (u.pathname || "/").replace(/\/+$/g, "");
  const slug = pathname === "/" || pathname === "" ? "home" : pathname.replace(/^\/+/, "").replace(/\//g, "--");
  return slug.replace(/[^a-zA-Z0-9-_]+/g, "-");
}

async function ensureDir(dirPath) {
  await fsp.mkdir(dirPath, { recursive: true });
}

async function readJsonSafe(filePath, fallback = null) {
  try {
    return JSON.parse(await fsp.readFile(filePath, "utf-8"));
  } catch (_) {
    return fallback;
  }
}

async function writeJson(filePath, value) {
  await ensureDir(path.dirname(filePath));
  await fsp.writeFile(filePath, JSON.stringify(value, null, 2), "utf-8");
}

function normalizeUrlKey(url) {
  const u = new URL(url);
  u.hash = "";
  return u.toString().toLowerCase();
}

module.exports = {
  ensureDir,
  normalizeUrlKey,
  readJsonSafe,
  safeFilenameFromUrl,
  writeJson,
};
