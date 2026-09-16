const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "your",
  "you",
  "our",
  "home",
  "page",
  "near",
  "best",
  "top",
  "in"
]);

const ENTITY_RULES = [
  {
    terms: ["gym", "fitness", "workout", "training"],
    entities: ["memberships", "classes", "personal training", "schedule", "pricing", "recovery"]
  },
  {
    terms: ["dry needling", "physical therapy", "rehab", "clinic", "medical", "pain"],
    entities: ["treatment", "pain relief", "recovery", "appointments", "insurance", "pricing"]
  },
  {
    terms: ["hvac", "plumbing", "roofing", "repair", "cleaning", "electrical"],
    entities: ["service area", "pricing", "emergency service", "inspection", "booking", "warranty"]
  },
  {
    terms: ["consulting", "software", "saas", "corporate", "enterprise"],
    entities: ["solutions", "implementation", "pricing", "case studies", "support", "demo"]
  }
];

export function extractEntities(topic = "", location = "", competitorHeadings = []) {
  const normalizedTopic = `${topic} ${location}`.toLowerCase();
  const tokens = tokenize(topic);
  const entities = new Set(tokens);

  for (const rule of ENTITY_RULES) {
    if (rule.terms.some((term) => normalizedTopic.includes(term))) {
      rule.entities.forEach((entity) => entities.add(entity));
    }
  }

  for (const heading of competitorHeadings) {
    tokenize(heading).forEach((token) => entities.add(token));
    if (/pricing|cost|rates/i.test(heading)) {
      entities.add("pricing");
    }
  }

  if (location) {
    entities.add(location);
    entities.add("local availability");
  }

  return [...entities].filter(Boolean).slice(0, 12);
}

function tokenize(value = "") {
  return String(value)
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}
