export const templateBlocks = {
  opening: ["hero"],
  education: ["content", "process"],
  proof: ["benefits", "testimonials"],
  pricing: ["pricing"],
  objection: ["faq"],
  conversion: ["cta"]
};

export function composeTemplate(...blockNames) {
  return blockNames.flatMap((blockName) => templateBlocks[blockName] || []);
}
