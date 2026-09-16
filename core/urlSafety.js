const dns = require("dns").promises;
const net = require("net");
const robotsCache = new Map();

const PRIVATE_IPV4_RANGES = [
  [/^10\./, "10.0.0.0/8"],
  [/^127\./, "127.0.0.0/8"],
  [/^169\.254\./, "169.254.0.0/16"],
  [/^172\.(1[6-9]|2\d|3[0-1])\./, "172.16.0.0/12"],
  [/^192\.168\./, "192.168.0.0/16"],
  [/^0\./, "0.0.0.0/8"],
];

function isPrivateIp(ip) {
  if (!ip) return true;
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    return (
      lower === "::1"
      || lower.startsWith("fc")
      || lower.startsWith("fd")
      || lower.startsWith("fe80")
    );
  }
  if (!net.isIPv4(ip)) return false;
  return PRIVATE_IPV4_RANGES.some(([re]) => re.test(ip));
}

function isLocalHostname(hostname) {
  const lower = String(hostname || "").toLowerCase();
  return (
    lower === "localhost"
    || lower.endsWith(".localhost")
    || lower === "127.0.0.1"
    || lower === "::1"
  );
}

async function assertSafeUrl(urlString, options = {}) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch (_) {
    throw new Error(`Invalid URL: ${urlString}`);
  }

  if (!/^https?:$/i.test(parsed.protocol)) {
    throw new Error(`Blocked URL protocol: ${parsed.protocol}`);
  }

  if (isLocalHostname(parsed.hostname)) {
    throw new Error(`Blocked local hostname: ${parsed.hostname}`);
  }

  if (net.isIP(parsed.hostname) && isPrivateIp(parsed.hostname)) {
    throw new Error(`Blocked private IP target: ${parsed.hostname}`);
  }

  if (options.allowHosts && Array.isArray(options.allowHosts) && options.allowHosts.length > 0) {
    const hostAllowed = options.allowHosts.some((h) => String(h || "").toLowerCase() === parsed.hostname.toLowerCase());
    if (!hostAllowed) {
      throw new Error(`Blocked host outside allowlist: ${parsed.hostname}`);
    }
  }

  try {
    const resolved = await dns.lookup(parsed.hostname, { all: true });
    for (const row of resolved) {
      if (isPrivateIp(row.address)) {
        throw new Error(`Blocked private DNS resolution for ${parsed.hostname}: ${row.address}`);
      }
    }
  } catch (err) {
    if (/Blocked private DNS resolution/.test(String(err?.message || ""))) {
      throw err;
    }
    // DNS lookup failures are treated as fetch-time failures by caller.
  }

  if (options.enforceRobots === true) {
    const allowed = await isAllowedByRobots(parsed.toString());
    if (!allowed) {
      throw new Error(`Blocked by robots.txt: ${parsed.toString()}`);
    }
  }

  return parsed.toString();
}

function parseRobots(robotsText) {
  const lines = String(robotsText || "").split(/\r?\n/);
  let applies = false;
  const disallow = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const ua = line.match(/^User-agent:\s*(.+)$/i);
    if (ua) {
      applies = ua[1].trim() === "*" ? true : false;
      continue;
    }
    if (!applies) continue;
    const d = line.match(/^Disallow:\s*(.*)$/i);
    if (d) {
      const rule = d[1].trim();
      if (rule) disallow.push(rule);
    }
  }
  return disallow;
}

async function isAllowedByRobots(urlString) {
  const target = new URL(urlString);
  const origin = `${target.protocol}//${target.host}`;
  if (!robotsCache.has(origin)) {
    try {
      const resp = await fetch(`${origin}/robots.txt`, { method: "GET" });
      if (!resp.ok) {
        robotsCache.set(origin, []);
      } else {
        const text = await resp.text();
        robotsCache.set(origin, parseRobots(text));
      }
    } catch (_) {
      robotsCache.set(origin, []);
    }
  }

  const rules = robotsCache.get(origin) || [];
  const pathWithQuery = `${target.pathname}${target.search || ""}`;
  return !rules.some((rule) => pathWithQuery.startsWith(rule));
}

module.exports = {
  assertSafeUrl,
};
