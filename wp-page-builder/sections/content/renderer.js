export function renderContentSection({ variant, data, component }) {
  const renderVariant = component.variants[variant] || component.variants.editorial;
  return renderVariant(data);
}
