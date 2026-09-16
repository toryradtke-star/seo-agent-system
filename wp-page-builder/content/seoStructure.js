export function buildSeoStructure({ topic, pageType, location, intent, contentDepth }) {
  const normalizedTopic = topic || "Service";
  const locationLabel = location ? ` in ${location}` : "";
  const title = `${normalizedTopic}${locationLabel} | ${capitalize(pageType)} Page`;
  const description = `Structured ${pageType} page focused on ${normalizedTopic}${locationLabel}, built for ${intent} intent with ${contentDepth} content depth.`;
  const headings = [
    normalizedTopic,
    `Why Choose ${normalizedTopic}`,
    "Client Results",
    `Questions About ${normalizedTopic}`
  ];

  return {
    title,
    description,
    headings,
    keywords: [normalizedTopic, location].filter(Boolean)
  };
}

function capitalize(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
}
