export function renderPricingSection({ variant, data, component }) {
  const renderVariant = component.variants[variant] || component.variants.cards;
  return renderVariant(data);
}
