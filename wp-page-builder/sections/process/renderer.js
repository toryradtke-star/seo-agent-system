export function renderProcessSection({ variant, data, component }) {
  const renderVariant = component.variants[variant] || component.variants.steps;
  return renderVariant(data);
}
