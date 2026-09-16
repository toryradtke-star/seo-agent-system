const TOPIC_RULES = [
  {
    topicType: "fitness",
    terms: ["gym", "fitness", "workout", "training", "strength", "athlete", "wellness studio"]
  },
  {
    topicType: "medical",
    terms: ["dry needling", "physical therapy", "chiropractic", "medical", "rehab", "pain", "treatment", "clinic"]
  },
  {
    topicType: "home-service",
    terms: ["hvac", "plumbing", "roofing", "cleaning", "electrical", "landscaping", "repair", "installation"]
  },
  {
    topicType: "corporate",
    terms: ["consulting", "saas", "software", "finance", "legal", "b2b", "enterprise", "corporate"]
  }
];

export const TONE_STYLES = {
  fitness: ["energetic", "motivational"],
  medical: ["professional", "trust-building"],
  "home-service": ["practical", "reassuring"],
  corporate: ["polished", "credible"],
  "local-service": ["approachable", "community-oriented"]
};

export function classifyTopic(topic = "", pageType = "") {
  const normalized = `${topic} ${pageType}`.toLowerCase();

  for (const rule of TOPIC_RULES) {
    if (rule.terms.some((term) => normalized.includes(term))) {
      return {
        topicType: rule.topicType,
        tone: [...TONE_STYLES[rule.topicType]]
      };
    }
  }

  if (pageType === "location" || normalized.includes("local")) {
    return {
      topicType: "local-service",
      tone: [...TONE_STYLES["local-service"]]
    };
  }

  return {
    topicType: "local-service",
    tone: [...TONE_STYLES["local-service"]]
  };
}
