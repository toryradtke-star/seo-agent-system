function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch (_) {
    return null;
  }
}

function extractFaqPairs(text) {
  const lines = String(text || "").split(/\r?\n/);
  const faqs = [];
  let pendingQuestion = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (/^(q:|question:)/i.test(line) || /^#+\s+.*\?$/.test(line)) {
      pendingQuestion = line.replace(/^(q:|question:)/i, "").replace(/^#+\s+/, "").trim();
      continue;
    }

    if (pendingQuestion && /^(a:|answer:)/i.test(line)) {
      const answer = line.replace(/^(a:|answer:)/i, "").trim();
      if (answer) {
        faqs.push({ question: pendingQuestion, answer });
      }
      pendingQuestion = null;
    }
  }

  return faqs;
}

function buildProductSchema(input = {}) {
  const scrapedData = input.scrapedData || {};
  const name = scrapedData.productEntity || scrapedData.title || "Product";
  const description = scrapedData.metaDescription || (scrapedData.first1500Words || "").slice(0, 320);

  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    url: input.url,
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
  };

  if (scrapedData.aggregateRating && typeof scrapedData.aggregateRating === "object") {
    schema.aggregateRating = scrapedData.aggregateRating;
  }

  const faqs = extractFaqPairs(input.optimizedContent);
  if (faqs.length > 0) {
    schema.faqPage = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    };
  }

  return schema;
}

function runSchemaAgent(input = {}) {
  if (input.pageType !== "pdp") {
    return {
      "@context": "https://schema.org",
      "@type": "WebPage",
      url: input.url,
      name: input.scrapedData?.title || input.url || "",
    };
  }

  const parsed = safeJsonParse(input.optimizedContent || "");
  if (parsed && parsed["@type"]) return parsed;

  return buildProductSchema(input);
}

module.exports = runSchemaAgent;
