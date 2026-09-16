const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function escapeAttribute(value) {
  return escapeHtml(value);
}

export function sanitizeUrl(value) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return "#";
  }

  if (raw.startsWith("#") || raw.startsWith("/") || raw.startsWith("./") || raw.startsWith("../")) {
    return escapeAttribute(raw);
  }

  try {
    const parsed = new URL(raw);
    if (SAFE_PROTOCOLS.has(parsed.protocol)) {
      return escapeAttribute(raw);
    }
  } catch (_error) {
    return "#";
  }

  return "#";
}
