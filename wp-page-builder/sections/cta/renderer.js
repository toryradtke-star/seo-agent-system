export function renderCtaSection({ variant, data, component }) {
  const renderVariant = component.variants[variant] || component.variants.banner;
  return renderVariant(data);
}
