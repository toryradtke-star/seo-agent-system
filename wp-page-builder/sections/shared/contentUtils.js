export function buildSubjectLabel(contentProfile) {
  const locationLabel = contentProfile.location ? ` in ${contentProfile.location}` : "";
  return `${contentProfile.topic}${locationLabel}`.trim();
}

export function byPageType(contentProfile, variants) {
  return (
    variants[contentProfile.pageType] ||
    variants.default ||
    (() => {
      throw new Error(`No content strategy defined for page type "${contentProfile.pageType}".`);
    })
  )(contentProfile);
}
