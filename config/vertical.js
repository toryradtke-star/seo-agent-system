/**
 * Vertical vocabulary.
 *
 * Several agents score relevance by checking whether a token looks like a
 * product word for the site being audited. That list is inherently
 * domain-specific, so it lives here rather than inline in each agent — pointing
 * this system at a different vertical means editing one file, not grepping for
 * regexes.
 *
 * The defaults below describe a signage / printed-goods e-commerce catalog,
 * which is the vertical this was built and tuned against.
 */
const PRODUCT_TERMS = [
  "banner", "banners",
  "sign", "signs",
  "decal", "decals",
  "sticker", "stickers",
  "flag", "flags",
  "magnet", "magnets",
];

/** Materials and service words that co-occur with the products above. */
const ATTRIBUTE_TERMS = [
  "vinyl", "mesh", "artwork", "shipping", "printing", "design",
];

/** Matches a single product token. */
const productTermPattern = () => new RegExp(`(${PRODUCT_TERMS.join("|")})`);

/** Matches a product token or an attribute word. */
const entityTermPattern = () =>
  new RegExp(`(${[...PRODUCT_TERMS, ...ATTRIBUTE_TERMS].join("|")})`);

/** Matches a URL path segment that is a product category. */
const productPathPattern = () =>
  new RegExp(`\\/(${PRODUCT_TERMS.join("|")})(\\/|$)`);

module.exports = {
  PRODUCT_TERMS,
  ATTRIBUTE_TERMS,
  productTermPattern,
  entityTermPattern,
  productPathPattern,
};
