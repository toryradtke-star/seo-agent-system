import { classifyTopic } from "./topicClassifier.js";

function enrichContext(context = {}) {
  const classification = context.topicType && Array.isArray(context.tone)
    ? { topicType: context.topicType, tone: context.tone }
    : classifyTopic(context.topic, context.pageType);

  return {
    ...context,
    ...classification,
    topic: context.topic || "Your Service",
    pageType: context.pageType || "service",
    theme: context.theme || "clinic",
    serp: context.serp || {
      entities: [],
      questions: [],
      headings: []
    }
  };
}

function subjectLabel(context) {
  return [context.topic, context.location].filter(Boolean).join(" ").trim();
}

function brandLabel(context) {
  return context.brand || context.topic;
}

function audienceLabel(context) {
  const labels = {
    fitness: "members",
    medical: "patients",
    "home-service": "homeowners",
    corporate: "buyers",
    "local-service": "local customers"
  };

  return labels[context.topicType] || "visitors";
}

function capitalize(value) {
  if (!value) {
    return value;
  }

  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function toneLead(context) {
  const leads = {
    fitness: "Build momentum with",
    medical: "Get a clear, clinically grounded path with",
    "home-service": "Get dependable help from",
    corporate: "Move forward with confidence using",
    "local-service": "Choose a trusted local option for"
  };

  return leads[context.topicType] || "Get started with";
}

function heroCtaByPageType(context) {
  const byPageType = {
    service: "Book an Appointment",
    location: "Schedule Locally",
    home: "Explore Services",
    blog: "Read the Guide",
    landing: "Claim the Offer"
  };

  return byPageType[context.pageType] || "Get Started";
}

function ctaLinkByPageType(context) {
  const byPageType = {
    service: "#contact",
    location: "#contact",
    home: "#services",
    blog: "#guide",
    landing: "#contact"
  };

  return byPageType[context.pageType] || "#contact";
}

function quoteVoice(context) {
  const byType = {
    fitness: [
      "The page made the next step feel immediate and motivating.",
      "I knew what the offer was and how to start within seconds.",
      "It felt energetic without becoming confusing."
    ],
    medical: [
      "The page explained the service clearly and made booking feel safe.",
      "I understood what to expect before I ever called.",
      "It felt professional, calm, and easy to trust."
    ],
    "home-service": [
      "I could tell exactly what was offered and how to reach the team.",
      "The page answered the practical questions I had right away.",
      "It made the decision feel low-risk and straightforward."
    ],
    corporate: [
      "The messaging felt polished and credible from the first section.",
      "I understood the value proposition quickly and knew where to go next.",
      "It balanced clarity, trust, and professionalism well."
    ],
    "local-service": [
      "The page felt local, clear, and easy to act on.",
      "I could tell the business understood the community it serves.",
      "The next step felt simple instead of sales-heavy."
    ]
  };

  return byType[context.topicType] || byType["local-service"];
}

export function generateHero(context) {
  const enriched = enrichContext(context);
  const label = subjectLabel(enriched);
  const brand = brandLabel(enriched);

  const headlineByPageType = {
    service: `${toneLead(enriched)} ${label}`.trim(),
    location: `${brand} for ${enriched.location || label}`.trim(),
    home: `${brand} Helps ${capitalize(audienceLabel(enriched))} Start Strong`,
    blog: `${enriched.topic}: What to Know Before You Take the Next Step`,
    landing: `${brand} Built for a Faster Decision`
  };

  const subtextByType = {
    fitness: `${brand} should feel high-energy, clear, and easy to act on for visitors who want visible progress and a simple first step.`,
    medical: `${brand} should establish trust quickly with calm, professional language that explains the service and lowers hesitation.`,
    "home-service": `${brand} should reassure visitors that the service is reliable, easy to understand, and backed by a direct path to contact.`,
    corporate: `${brand} should communicate credibility, clarity, and strategic value from the first screen.`,
    "local-service": `${brand} should feel relevant, approachable, and clearly tied to the needs of nearby customers.`
  };

  return {
    headline: headlineByPageType[enriched.pageType] || `${toneLead(enriched)} ${label}`.trim(),
    subtext: subtextByType[enriched.topicType] || subtextByType["local-service"],
    ctaText: heroCtaByPageType(enriched),
    ctaLink: ctaLinkByPageType(enriched)
  };
}

export function generateBenefits(context) {
  const enriched = enrichContext(context);
  const audience = audienceLabel(enriched);
  const titleByPageType = {
    service: `Why ${audience[0].toUpperCase()}${audience.slice(1)} Choose ${enriched.topic}`,
    location: `Why ${enriched.location || "Local"} Visitors Choose ${enriched.topic}`,
    home: `Why ${brandLabel(enriched)} Converts New Visitors`,
    blog: `Key Takeaways About ${enriched.topic}`,
    landing: `Why This ${enriched.topic} Offer Performs`
  };

  const fallbackItemsByType = {
    fitness: [
      { icon: "01", title: "Motivating Positioning", description: "Frame the offer around momentum, progress, and a clear entry point." },
      { icon: "02", title: "Visible Value", description: "Help visitors see the outcome and the path to getting there without friction." },
      { icon: "03", title: "Action-Ready CTA", description: "Keep the next step obvious so interested visitors move quickly." }
    ],
    medical: [
      { icon: "01", title: "Clinical Clarity", description: "Explain the service in a way that reduces uncertainty and builds confidence." },
      { icon: "02", title: "Trust Signals", description: "Use structured proof and steady language to support informed decisions." },
      { icon: "03", title: "Guided Next Step", description: "Move patients toward consultation or booking with minimal hesitation." }
    ],
    "home-service": [
      { icon: "01", title: "Practical Value", description: "Focus on what gets solved, how quickly, and what the next step looks like." },
      { icon: "02", title: "Reliable Framing", description: "Make the business feel dependable and easy to reach." },
      { icon: "03", title: "Fast Contact Path", description: "Keep calls, forms, and decision points direct and easy to find." }
    ],
    corporate: [
      { icon: "01", title: "Strategic Positioning", description: "Clarify the business value before diving into supporting detail." },
      { icon: "02", title: "Credible Messaging", description: "Use polished structure and proof to support the offer." },
      { icon: "03", title: "Decision Support", description: "Help buyers understand the next conversation or conversion step." }
    ],
    "local-service": [
      { icon: "01", title: "Local Relevance", description: "Show that the page is built for the audience in the area being served." },
      { icon: "02", title: "Easy Trust", description: "Use familiar, approachable copy that lowers friction." },
      { icon: "03", title: "Straightforward Action", description: "Close the gap between interest and contact with a clear CTA." }
    ]
  };

  const entityItems = (enriched.serp.entities || [])
    .filter((entity) => typeof entity === "string" && entity.trim())
    .slice(0, 3)
    .map((entity, index) => ({
      icon: `0${index + 1}`,
      title: capitalize(entity),
      description: `${brandLabel(enriched)} can address ${entity.toLowerCase()} directly so ${audience} see how ${enriched.topic} fits their decision process.`
    }));

  return {
    title: titleByPageType[enriched.pageType] || `Why ${audience} choose ${enriched.topic}`,
    intro: `${brandLabel(enriched)} should reinforce ${enriched.tone.join(" and ")} messaging while giving ${audience} a fast reason to keep moving down the page.`,
    items: entityItems.length > 0 ? entityItems : fallbackItemsByType[enriched.topicType] || fallbackItemsByType["local-service"]
  };
}

export function generateProcess(context) {
  const enriched = enrichContext(context);

  const stepsByPageType = {
    service: [
      { title: "Understand the Need", description: `Clarify how ${enriched.topic} helps and who it is designed for.` },
      { title: "Review the Plan", description: "Explain what the first appointment, consultation, or engagement looks like." },
      { title: "Take the Next Step", description: "Close with a single booking or contact action that feels easy to complete." }
    ],
    location: [
      { title: "Confirm Local Fit", description: `Show that ${enriched.topic} is available for people in ${enriched.location || "the target area"}.` },
      { title: "Build Confidence", description: "Reinforce trust, convenience, and the reason to choose this provider nearby." },
      { title: "Reach Out Nearby", description: "Use a location-specific CTA that makes acting now feel natural." }
    ],
    home: [
      { title: "Get Oriented", description: `Help visitors understand what ${brandLabel(enriched)} offers right away.` },
      { title: "Find Proof", description: "Use benefits, testimonials, and FAQs to support the offer." },
      { title: "Choose a Path", description: "Guide users into services, contact, or the highest-value next action." }
    ],
    blog: [
      { title: "Learn the Basics", description: `Ground readers in the main idea behind ${enriched.topic}.` },
      { title: "Apply the Insight", description: "Turn the explanation into useful, practical guidance." },
      { title: "Decide What to Do Next", description: "Bridge from education into service exploration when relevant." }
    ],
    landing: [
      { title: "See the Offer", description: "Lead with the campaign message and who it is for." },
      { title: "Validate the Choice", description: "Support the claim with concise proof and structure." },
      { title: "Convert Quickly", description: "Drive directly into the primary form, call, or booking action." }
    ]
  };

  return {
    title:
      enriched.pageType === "blog"
        ? `How to Use This ${enriched.topic} Guide`
        : `How ${brandLabel(enriched)} Moves Visitors Forward`,
    intro: `${brandLabel(enriched)} should keep the flow ${enriched.tone[0]} enough to hold attention while staying ${enriched.tone[1]} enough to build confidence.`,
    steps: stepsByPageType[enriched.pageType] || stepsByPageType.service
  };
}

export function generateTestimonials(context) {
  const enriched = enrichContext(context);
  const quotes = quoteVoice(enriched);

  return {
    title:
      enriched.pageType === "blog"
        ? `What Readers Value About This ${enriched.topic} Guide`
        : `Why ${capitalize(audienceLabel(enriched))} Trust ${brandLabel(enriched)}`,
    items: [
      { name: "Jordan P.", quote: quotes[0] },
      { name: "Casey M.", quote: quotes[1] },
      { name: "Taylor R.", quote: quotes[2] }
    ]
  };
}

export function generateFAQ(context) {
  const enriched = enrichContext(context);
  const label = subjectLabel(enriched);

  const faqByPageType = {
    service: [
      {
        question: `Who is ${enriched.topic} best for?`,
        answer: `Use this answer to describe the type of ${audienceLabel(enriched)} who benefits most from ${label}.`
      },
      {
        question: "What happens first?",
        answer: "Explain the first appointment, consultation, or onboarding step in plain language."
      },
      {
        question: "How should someone get started?",
        answer: "Point to the clearest booking, call, or contact action on the page."
      }
    ],
    location: [
      {
        question: `Do you offer ${enriched.topic} in ${enriched.location || "this area"}?`,
        answer: "Confirm service availability and explain how nearby visitors can reach the team."
      },
      {
        question: "Why choose a local provider?",
        answer: "Use this answer to reinforce convenience, familiarity, and trust."
      },
      {
        question: "What should the next step be?",
        answer: "Keep the answer tied to a local call, form, or scheduling action."
      }
    ],
    home: [
      {
        question: `What does ${brandLabel(enriched)} offer?`,
        answer: "Summarize the main services or categories without overwhelming first-time visitors."
      },
      {
        question: "Where should a new visitor start?",
        answer: "Guide them toward the most important service, contact, or conversion path."
      },
      {
        question: "How can someone reach the team?",
        answer: "Clarify the primary action for inquiries, booking, or consultation."
      }
    ],
    blog: [
      {
        question: `What should readers understand first about ${enriched.topic}?`,
        answer: "Use this answer to reinforce the article's main educational takeaway."
      },
      {
        question: "When should someone look for expert help?",
        answer: "Bridge informational reading into professional action without forcing it."
      },
      {
        question: "What can the reader do next?",
        answer: "Offer the next educational or service-oriented step based on intent."
      }
    ],
    landing: [
      {
        question: "Who is this offer for?",
        answer: "Qualify the audience quickly so the conversion path feels relevant."
      },
      {
        question: "What does someone need to do?",
        answer: "Keep the operational steps short and friction-free."
      },
      {
        question: "Why act now?",
        answer: "Tie the CTA back to the value of moving forward today."
      }
    ]
  };

  const serpQuestions = (enriched.serp.questions || []).slice(0, 3).map((question) => ({
    question,
    answer: buildSerpAnswer(question, enriched)
  }));

  return {
    title:
      enriched.pageType === "location"
        ? `Questions About ${enriched.topic} in ${enriched.location || "Your Area"}`
        : `Common Questions About ${brandLabel(enriched)}`,
    items: serpQuestions.length > 0 ? serpQuestions : faqByPageType[enriched.pageType] || faqByPageType.service
  };
}

export function generateCTA(context) {
  const enriched = enrichContext(context);

  const titleByPageType = {
    service: `Ready to Get Started with ${enriched.topic}?`,
    location: `Ready to Connect in ${enriched.location || "Your Area"}?`,
    home: `Ready to Take the Next Step with ${brandLabel(enriched)}?`,
    blog: `Want Expert Help Beyond This ${enriched.topic} Guide?`,
    landing: "Ready to Claim the Offer?"
  };

  const ctaTextByPageType = {
    service: "Schedule Now",
    location: "Contact the Local Team",
    home: "Start Here",
    blog: "Talk to an Expert",
    landing: "Claim Now"
  };

  const ctaLinkByType = {
    service: "#book-now",
    location: "#book-now",
    home: "#services",
    blog: "#contact",
    landing: "#book-now"
  };

  return {
    title: titleByPageType[enriched.pageType] || `Ready to take the next step with ${brandLabel(enriched)}?`,
    text: `${brandLabel(enriched)} should close with a ${enriched.tone.join(" and ")} prompt that makes the next action feel clear and low-friction.`,
    ctaText: ctaTextByPageType[enriched.pageType] || "Get Started",
    ctaLink: ctaLinkByType[enriched.pageType] || "#contact"
  };
}

export function generateContentSection(context) {
  const enriched = enrichContext(context);
  const titleByPageType = {
    service: `What to Know About ${subjectLabel(enriched)}`,
    location: `Why ${enriched.location || "Local"} Visitors Choose ${enriched.topic}`,
    home: `How ${brandLabel(enriched)} Helps New Visitors`,
    blog: `What This ${enriched.topic} Guide Covers`,
    landing: `Why This ${enriched.topic} Offer Matters`
  };

  return {
    title: titleByPageType[enriched.pageType] || `What to Know About ${subjectLabel(enriched)}`,
    paragraphs: [
      `${brandLabel(enriched)} should explain ${subjectLabel(enriched)} with ${enriched.tone.join(" and ")} language that matches ${audienceLabel(enriched)} expectations.`,
      `This section gives the page a clearer middle layer so visitors understand the offer before they reach deeper proof and calls to action.`,
      ...(enriched.serp.headings?.[0] ? [`SERP patterns also suggest headings such as "${enriched.serp.headings[0]}", which signals what searchers expect to see on the page.`] : [])
    ],
    highlights: [
      ...(enriched.serp.headings || []).slice(0, 2).map((heading) => `Reflect "${heading}"`),
      `Match a ${enriched.topicType} tone`,
      "Clarify the next step",
      "Keep the structure easy to scan"
    ].slice(0, 3)
  };
}

export function generatePricing(context) {
  const enriched = enrichContext(context);
  const topicLabel = brandLabel(enriched);
  const pricingAnchor = enriched.topicType === "fitness"
    ? ["Starter Access", "$29/mo", "A simple entry point for new members who want a low-friction start."]
    : enriched.topicType === "medical"
      ? ["Initial Visit", "$95+", "Use this tier to frame the first appointment, consultation, or assessment."]
      : enriched.topicType === "corporate"
        ? ["Core Plan", "Custom Quote", "Position pricing around scope, implementation, and support requirements."]
        : ["Base Service", "$149+", "Give visitors a realistic starting point before final scope is confirmed."];

  return {
    title: `${topicLabel} Pricing Overview`,
    intro: `SERP signals indicate that searchers expect pricing context for ${enriched.topic}. Use this section to set expectations without locking the business into rigid quotes.`,
    items: [
      {
        label: pricingAnchor[0],
        price: pricingAnchor[1],
        description: pricingAnchor[2],
        note: enriched.location ? `Available for ${enriched.location}` : "Adjust to match your actual offer."
      },
      {
        label: "Most Popular",
        price: enriched.topicType === "fitness" ? "$79/mo" : enriched.topicType === "corporate" ? "Tailored Scope" : "$195+",
        description: `Use this tier to highlight the option most ${audienceLabel(enriched)} are likely to choose.`,
        note: "Good place for bundled value or package framing."
      },
      {
        label: "Premium",
        price: enriched.topicType === "corporate" ? "Enterprise Quote" : enriched.topicType === "fitness" ? "$149/mo" : "$295+",
        description: `Reserve this tier for the highest-support version of ${enriched.topic}.`,
        note: "Keep the next step tied to consultation or booking."
      }
    ]
  };
}

function buildSerpAnswer(question, context) {
  const normalized = String(question).toLowerCase();

  if (normalized.includes("pricing") || normalized.includes("cost")) {
    return `Use this answer to explain how ${brandLabel(context)} frames pricing for ${context.topic}, including what affects the final quote or plan.`;
  }

  if (normalized.includes("insurance")) {
    return "Use this answer to clarify coverage, reimbursement, or how payment expectations are handled.";
  }

  if (normalized.includes("serve") || normalized.includes("location")) {
    return context.location
      ? `Confirm availability in ${context.location} and explain the fastest path to booking or contacting the team.`
      : "Clarify service area coverage and how nearby visitors can get started.";
  }

  if (normalized.includes("first") || normalized.includes("appointment") || normalized.includes("day one")) {
    return `Explain what someone should expect when they first engage with ${brandLabel(context)} so the process feels clear and low-friction.`;
  }

  return `Answer this in a ${context.tone.join(" and ")} way so visitors get a direct next step without extra ambiguity.`;
}
