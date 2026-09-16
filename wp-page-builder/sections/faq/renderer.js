export function renderFaqSection({ variant, data, component }) {
  const renderVariant = component.variants[variant] || component.variants.accordion;
  return renderVariant(data);
}
