const { productPathPattern } = require("./config/vertical");

const PRODUCT_PATH = productPathPattern();

function toText(value) {
  return String(value || "").toLowerCase();
}

function routePage(input = {}) {
  const urlString = String(input.url || "");
  let pathname = "/";
  try {
    pathname = new URL(urlString).pathname.toLowerCase();
  } catch (_) {
    pathname = toText(urlString);
  }

  const title = toText(input.title);
  const headingText = Array.isArray(input.headings)
    ? input.headings.map((h) => toText(h.text)).join(" ")
    : "";
  const content = toText(input.visibleText || input.first1500Words);
  const combined = `${title} ${headingText} ${content}`;

  if (pathname === "/" || pathname === "") {
    return { pageType: "homepage" };
  }

  if (
    /\/(product|products|item|p)\//.test(pathname) ||
    PRODUCT_PATH.test(pathname) ||
    /\/(custom-|banner-)/.test(pathname) ||
    /(add to cart|upload artwork|select size|choose options|price)/.test(combined)
  ) {
    return { pageType: "pdp" };
  }

  if (/\/(blog|article|news|resources)\//.test(pathname) || /(blog|article)/.test(combined)) {
    return { pageType: "blog" };
  }

  if (/\/(category|categories)\//.test(pathname) || /\/(banners|decals|stickers|signs|flags|magnets)(\/|$)/.test(pathname)) {
    return { pageType: "category" };
  }

  return { pageType: "generic" };
}

module.exports = routePage;
