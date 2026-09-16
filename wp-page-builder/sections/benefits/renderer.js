export function renderBenefitsSection({ variant, data, component }) {
  const renderVariant = component.variants[variant] || component.variants.icons;
  return renderVariant(data);
}
