const INJECTION_PATTERNS = [
  /ignore\s+previous\s+instructions?/gi,
  /follow\s+these\s+instructions?\s+instead/gi,
  /\bsystem\s+prompt\b/gi,
  /\bassistant\s*:/gi,
  /\bdeveloper\s*:/gi,
  /\breveal\s+(your\s+)?system\s+prompt\b/gi,
  /\boverride\s+your\s+instructions?\b/gi,
];

function limitRepeatedTokens(text, maxRun = 8) {
  const tokens = String(text || "").split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return "";
  const out = [];
  let prev = "";
  let run = 0;
  for (const token of tokens) {
    if (token.toLowerCase() === prev.toLowerCase()) {
      run += 1;
    } else {
      prev = token;
      run = 1;
    }
    if (run <= maxRun) out.push(token);
  }
  return out.join(" ");
}

function sanitizePageContent(text, options = {}) {
  const maxChars = Math.max(1000, Number(options.maxChars || 12000));
  let out = String(text || "");

  for (const pattern of INJECTION_PATTERNS) {
    out = out.replace(pattern, "");
  }

  out = out.replace(/```/g, "` ` `");
  out = out.replace(/<\s*script/gi, "<blocked-script");
  out = out.replace(/<\/\s*script\s*>/gi, "</blocked-script>");
  out = out.replace(/\s+/g, " ").trim();
  out = limitRepeatedTokens(out, Number(options.maxTokenRun || 8));

  if (out.length > maxChars) {
    out = out.slice(0, maxChars);
  }
  return out;
}

module.exports = {
  sanitizePageContent,
};

