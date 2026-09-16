const { entityTermPattern } = require("../config/vertical");

const ENTITY_TERM = entityTermPattern();

const STOPWORDS = new Set([
  "the","and","for","with","from","that","this","your","our","you","are","can","will","into","about","have","has","was","were","not","but","all","any","how","what","when","where","why","which","their","they","them","than","then","also","more","most","over","under","best","top","custom","online","shop"
]);

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function ngrams(tokens, n) {
  const out = [];
  for (let i = 0; i <= tokens.length - n; i += 1) {
    out.push(tokens.slice(i, i + n).join(" "));
  }
  return out;
}

function topCounts(items, limit = 30) {
  const counts = new Map();
  for (const item of items) {
    counts.set(item, (counts.get(item) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([term]) => term);
}

function extractEntitiesAndPhrases(inputText) {
  const tokens = tokenize(inputText);
  const uni = topCounts(tokens, 30);
  const bi = topCounts(ngrams(tokens, 2), 30);
  const tri = topCounts(ngrams(tokens, 3), 20);

  const entities = uni.filter((t) => ENTITY_TERM.test(t));
  const phrases = [...bi, ...tri].filter((p) => p.split(" ").length >= 2).slice(0, 40);

  return {
    entities,
    phrases,
  };
}

module.exports = {
  extractEntitiesAndPhrases,
};
