import { generateHero } from "../../content/semanticGenerator.js";

const defaultImage =
  "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1200&q=80";

export function buildHeroContent(contentProfile) {
  return {
    ...generateHero(contentProfile),
    image: defaultImage
  };
}
