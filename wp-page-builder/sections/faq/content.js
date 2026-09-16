import { generateFAQ } from "../../content/semanticGenerator.js";

export function buildFaqContent(contentProfile) {
  return generateFAQ(contentProfile);
}
