const SERVICE_EXPANSIONS = [
  {
    terms: ["physical therapy", "therapy", "rehab"],
    topics: ["Dry Needling", "Manual Therapy", "Sports Injury Therapy"]
  },
  {
    terms: ["gym", "fitness", "workout"],
    topics: ["Personal Training", "Group Fitness Classes", "Recovery Coaching"]
  },
  {
    terms: ["hvac", "heating", "cooling"],
    topics: ["AC Repair", "Heating Repair", "HVAC Maintenance"]
  }
];

export function expandTopics(coreTopic = "", options = {}) {
  const { baseTopic, location } = splitTopicAndLocation(coreTopic, options.location);
  const normalizedBaseTopic = baseTopic.toLowerCase();

  const matchedExpansion = SERVICE_EXPANSIONS.find((rule) =>
    rule.terms.some((term) => normalizedBaseTopic.includes(term))
  );

  const seedTopics = matchedExpansion?.topics || buildFallbackTopics(baseTopic);

  return seedTopics.map((topic) => ({
    topic,
    fullTopic: [topic, location].filter(Boolean).join(" ").trim()
  }));
}

export function splitTopicAndLocation(coreTopic = "", explicitLocation) {
  const trimmed = String(coreTopic || "").trim();
  const explicit = String(explicitLocation || "").trim();

  if (explicit) {
    return {
      baseTopic: trimmed,
      location: explicit
    };
  }

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length < 3) {
    return {
      baseTopic: trimmed,
      location: ""
    };
  }

  const state = tokens[tokens.length - 1];
  const city = tokens[tokens.length - 2];

  if (!/^[A-Z]{2}$/.test(state) || !/^[A-Z][a-z]+$/.test(city)) {
    return {
      baseTopic: trimmed,
      location: ""
    };
  }

  return {
    baseTopic: tokens.slice(0, -2).join(" ").trim(),
    location: `${city} ${state}`.trim()
  };
}

function buildFallbackTopics(baseTopic) {
  const clean = baseTopic || "Core Service";
  return [`${clean} Services`, `${clean} Specialists`, `${clean} Solutions`];
}
