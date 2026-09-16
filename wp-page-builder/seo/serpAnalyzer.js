import { extractEntities } from "./entityExtractor.js";
import { extractQuestions } from "./questionExtractor.js";

const HEADING_RULES = [
  {
    terms: ["gym", "fitness", "workout", "training"],
    headings: ["Membership Options", "Class Schedule", "Personal Training", "Gym Pricing", "Member Results"]
  },
  {
    terms: ["dry needling", "physical therapy", "rehab", "clinic", "medical", "pain"],
    headings: ["Who Benefits From Treatment", "What to Expect", "Insurance and Pricing", "Recovery Timeline", "Patient FAQs"]
  },
  {
    terms: ["hvac", "plumbing", "roofing", "repair", "cleaning", "electrical"],
    headings: ["Service Area", "What Impacts Pricing", "Emergency Availability", "Repair Process", "Common Questions"]
  },
  {
    terms: ["consulting", "software", "saas", "corporate", "enterprise"],
    headings: ["Solutions Overview", "Implementation Process", "Pricing Options", "Case Studies", "Frequently Asked Questions"]
  }
];

export async function analyzeSerp(topic = "", location = "", deps = {}) {
  const competitorHeadings = deps.competitorHeadings || inferHeadings(topic, location);
  const entities = extractEntities(topic, location, competitorHeadings);
  const questions = extractQuestions(topic, location, competitorHeadings);

  return {
    entities,
    questions,
    headings: competitorHeadings
  };
}

function inferHeadings(topic, location) {
  const normalizedTopic = `${topic} ${location}`.toLowerCase();
  for (const rule of HEADING_RULES) {
    if (rule.terms.some((term) => normalizedTopic.includes(term))) {
      return [...rule.headings];
    }
  }

  return [
    `Why Choose ${topic}`,
    `What to Expect From ${topic}`,
    `${topic} Pricing`,
    `Common Questions About ${topic}`
  ];
}
