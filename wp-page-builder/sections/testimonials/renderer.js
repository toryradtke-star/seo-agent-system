export function renderTestimonialsSection({ variant, data, component }) {
  const renderVariant = component.variants[variant] || component.variants.grid;
  return renderVariant(data);
}
