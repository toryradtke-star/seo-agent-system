import { renderHeroCentered } from "./centered.js";
import { renderHeroSplit } from "./split.js";
import { renderHeroMinimal } from "./minimal.js";

export const heroVariants = {
  centered: renderHeroCentered,
  split: renderHeroSplit,
  minimal: renderHeroMinimal
};
