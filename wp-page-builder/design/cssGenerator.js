function flattenTokens(tokenGroup, prefix) {
  return Object.entries(tokenGroup)
    .map(([key, value]) => `  --${prefix}-${key}: ${value};`)
    .join("\n");
}

export function generateCssVariables(tokens) {
  return [
    ":root {",
    flattenTokens(tokens.colors, "color"),
    flattenTokens(tokens.spacing, "space"),
    flattenTokens(tokens.typography, "font"),
    flattenTokens(tokens.radius, "radius"),
    flattenTokens(tokens.shadows, "shadow"),
    "}"
  ].join("\n");
}

export function generateBaseCss(tokens) {
  return `
${generateCssVariables(tokens)}

* { box-sizing: border-box; }
body { margin: 0; color: var(--color-text); background: var(--color-surface); font-family: var(--font-body); font-size: var(--font-bodySize); }
img { display: block; max-width: 100%; border-radius: var(--radius-card); }
a { color: inherit; text-decoration: none; }
h1, h2, h3 { margin: 0 0 1rem; color: var(--color-accent); font-family: var(--font-heading); line-height: 1.1; }
h1 { font-size: var(--font-h1); }
h2 { font-size: var(--font-h2); }
p { margin: 0 0 1rem; line-height: 1.6; }
.wpb-page { overflow: hidden; }
.wpb-shell { width: min(100% - 2rem, var(--space-container)); margin: 0 auto; }
.wpb-section { padding: var(--space-section) 0; }
.wpb-grid { display: grid; gap: var(--space-gap); }
.wpb-grid--2 { grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: center; }
.wpb-grid--3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.wpb-eyebrow { margin-bottom: 0.75rem; color: var(--color-primary); font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.wpb-lead, .wpb-section-intro { color: var(--color-muted); max-width: 42rem; }
.wpb-button { display: inline-block; padding: 0.95rem 1.5rem; border-radius: var(--radius-button); background: var(--color-primary); color: #fff; font-weight: 700; box-shadow: var(--shadow-soft); }
.wpb-text-link { color: var(--color-primary); font-weight: 700; }
.wpb-hero { background: linear-gradient(135deg, rgba(20, 108, 120, 0.08), rgba(244, 162, 97, 0.12)); }
.wpb-hero__content, .wpb-hero__media { position: relative; }
.wpb-benefit-card, .wpb-benefit-panel, .wpb-benefit-column, .wpb-pricing-card, .wpb-testimonial-card, .wpb-testimonial-slide, .wpb-faq-row, .wpb-faq-item { padding: 1.5rem; border: 1px solid var(--color-border); border-radius: var(--radius-card); background: #fff; box-shadow: var(--shadow-card); }
.wpb-content-sidebar, .wpb-process-step, .wpb-timeline-item, .wpb-inline-note, .wpb-cta-panel { padding: 1.5rem; border: 1px solid var(--color-border); border-radius: var(--radius-card); background: #fff; box-shadow: var(--shadow-card); }
.wpb-benefit-card__icon { width: 2.5rem; height: 2.5rem; display: inline-grid; place-items: center; margin-bottom: 1rem; border-radius: 50%; background: var(--color-secondary); color: var(--color-accent); font-weight: 700; }
.wpb-pricing-note { color: var(--color-muted); font-size: 0.95rem; }
.wpb-carousel-track { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(18rem, 1fr); gap: var(--space-gap); overflow-x: auto; padding-bottom: 0.5rem; scroll-snap-type: x proximity; }
.wpb-testimonial-slide { scroll-snap-align: start; }
.wpb-faq-list { display: grid; gap: 1rem; }
.wpb-faq-item summary { cursor: pointer; font-weight: 700; }
.wpb-list { margin: 0; padding-left: 1.25rem; display: grid; gap: 0.75rem; }
.wpb-inline-note-list { display: grid; gap: 1rem; margin-top: 1.5rem; }
.wpb-step-number { width: 2.5rem; height: 2.5rem; display: inline-grid; place-items: center; margin-bottom: 1rem; border-radius: 50%; background: var(--color-primary); color: #fff; font-weight: 700; }
.wpb-timeline { display: grid; gap: 1rem; }
.wpb-timeline-item { display: grid; grid-template-columns: auto 1fr; gap: 1rem; align-items: start; }
.wpb-cta-panel { display: grid; grid-template-columns: 1fr auto; gap: 1.5rem; align-items: center; background: linear-gradient(135deg, rgba(20, 108, 120, 0.08), rgba(143, 211, 216, 0.18)); }
  `;
}

export function generateResponsiveCss() {
  return `
@media (max-width: 1024px) {
  .wpb-grid--3 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .wpb-grid--2 { grid-template-columns: 1fr; }
  .wpb-cta-panel { grid-template-columns: 1fr; }
}

@media (max-width: 767px) {
  .wpb-section { padding: 3.5rem 0; }
  .wpb-grid--3 { grid-template-columns: 1fr; }
  .wpb-shell { width: min(100% - 1.25rem, var(--space-container)); }
}
  `;
}
