import { renderContentEditorial } from "./editorial.js";
import { renderContentStacked } from "./stacked.js";

export const contentVariants = {
  editorial: renderContentEditorial,
  stacked: renderContentStacked
};
