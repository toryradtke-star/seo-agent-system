const QUESTION_RULES = [
  {
    terms: ["gym", "fitness", "workout", "training"],
    questions: [
      "How often should someone start training each week?",
      "What should a new member expect on day one?",
      "How much does a gym membership typically cost?",
      "Are classes or coaching included?"
    ]
  },
  {
    terms: ["dry needling", "physical therapy", "rehab", "clinic", "medical", "pain"],
    questions: [
      "What does the first appointment usually involve?",
      "How many sessions does someone typically need?",
      "Does insurance help cover treatment costs?",
      "When should someone seek professional care?"
    ]
  },
  {
    terms: ["hvac", "plumbing", "roofing", "repair", "cleaning", "electrical"],
    questions: [
      "How quickly can service be scheduled?",
      "What does the estimate process look like?",
      "How is pricing usually structured?",
      "Do you serve nearby neighborhoods as well?"
    ]
  },
  {
    terms: ["consulting", "software", "saas", "corporate", "enterprise"],
    questions: [
      "How long does implementation usually take?",
      "What does pricing depend on?",
      "How does onboarding work?",
      "What results should buyers expect first?"
    ]
  }
];

export function extractQuestions(topic = "", location = "", competitorHeadings = []) {
  const normalizedTopic = `${topic} ${location}`.toLowerCase();
  const questions = new Set();

  for (const rule of QUESTION_RULES) {
    if (rule.terms.some((term) => normalizedTopic.includes(term))) {
      rule.questions.forEach((question) => questions.add(question));
    }
  }

  competitorHeadings.forEach((heading) => {
    if (/pricing|cost|rates/i.test(heading)) {
      questions.add(`How does pricing work for ${topic}?`);
    }
    if (/what|how|when|why/i.test(heading)) {
      questions.add(heading.replace(/\?*$/, "?"));
    }
  });

  if (location) {
    questions.add(`Do you serve customers in ${location}?`);
  }

  if (questions.size === 0) {
    questions.add(`What should someone know about ${topic}?`);
    questions.add(`How does ${topic} work?`);
    questions.add(`What is the best next step for ${topic}?`);
  }

  return [...questions].slice(0, 6);
}
