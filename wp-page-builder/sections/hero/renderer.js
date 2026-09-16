export function renderHeroSection({ variant, data, component }) {
  const renderVariant = component.variants[variant] || component.variants.centered;
  return renderVariant(data);
}
