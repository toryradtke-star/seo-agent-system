export function buildNavigation(siteBlueprint) {
  const items = (siteBlueprint.pages || []).map((page) => ({
    label: buildLabel(page),
    href: buildPath(page),
    type: page.type,
    topic: page.topic
  }));

  return {
    siteName: siteBlueprint.siteName,
    items
  };
}

export function buildPath(page) {
  const slug = slugify(page.topic || page.type);
  if (page.type === "home") {
    return "/";
  }
  return `/${page.type}/${slug}`;
}

function buildLabel(page) {
  if (page.type === "home") {
    return "Home";
  }
  return page.topic;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
