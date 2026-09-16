import { validateContentInput, validateContentProfile } from "../core/contracts.js";
import { buildSeoStructure } from "./seoStructure.js";
import { classifyTopic } from "./topicClassifier.js";

const PAGE_TYPE_RULES = [
  { pageType: "blog", terms: ["guide", "tips", "blog", "what is", "how to"] },
  { pageType: "home", terms: ["home", "homepage", "company"] },
  { pageType: "landing", terms: ["landing", "campaign", "offer"] },
  { pageType: "service", terms: ["therapy", "treatment", "service", "repair", "dry needling", "cleaning"] }
];

const INTENT_BY_PAGE_TYPE = {
  service: "conversion",
  location: "conversion",
  landing: "conversion",
  home: "navigational",
  blog: "informational"
};

const DEPTH_BY_PAGE_TYPE = {
  service: "medium",
  location: "medium",
  landing: "light",
  home: "light",
  blog: "deep"
};

export function analyzeContent(input = {}) {
  validateContentInput(input);

  const topic = input.topic || "";
  const explicitLocation = input.location || "";
  const composite = [topic, explicitLocation].filter(Boolean).join(" ").trim();
  const location = extractLocation(explicitLocation) || extractLocation(composite) || undefined;
  const pageType = normalizePageType(input.pageType) || detectPageType({ topic, location });
  const intent = INTENT_BY_PAGE_TYPE[pageType] || "conversion";
  const contentDepth = DEPTH_BY_PAGE_TYPE[pageType] || "medium";
  const classification = classifyTopic(topic || composite || "General Service", pageType);

  const profile = {
    topic: topic || composite || "General Service",
    pageType,
    location,
    brand: input.brand || undefined,
    topicType: classification.topicType,
    tone: classification.tone,
    serp: input.serp || {
      entities: [],
      questions: [],
      headings: []
    },
    intent,
    contentDepth,
    seo: buildSeoStructure({
      topic: topic || composite || "General Service",
      pageType,
      location,
      intent,
      contentDepth
    })
  };

  validateContentProfile(profile);
  return profile;
}

function detectPageType({ topic, location }) {
  const normalized = String(topic || "").toLowerCase();
  for (const rule of PAGE_TYPE_RULES) {
    if (rule.terms.some((term) => normalized.includes(term))) {
      return rule.pageType;
    }
  }

  if (location || extractLocation(topic)) {
    return "location";
  }

  return "service";
}

function extractLocation(text = "") {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  if (tokens.length >= 2) {
    const state = tokens[tokens.length - 1];
    const cityTokens = tokens.slice(0, -1);
    if (/^[A-Z]{2}$/.test(state) && cityTokens.every((token) => /^[A-Z][a-z]+$/.test(token))) {
      return `${cityTokens.join(" ")} ${state}`;
    }
  }

  const match = text.match(/\b([A-Z][a-z]+)\s([A-Z]{2})\b/);
  if (!match) {
    return "";
  }
  return `${match[1]} ${match[2]}`;
}

function normalizePageType(pageType) {
  const normalized = String(pageType || "").trim().toLowerCase();
  if (normalized === "homepage") {
    return "home";
  }
  return normalized || "";
}
