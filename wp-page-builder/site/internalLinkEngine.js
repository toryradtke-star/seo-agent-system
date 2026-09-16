import { escapeHtml, sanitizeUrl } from "../core/html.js";
import { buildPath } from "./navigationBuilder.js";
import { finalizeRenderedPage } from "../renderer/renderPage.js";

export function applyInternalLinks(pageResults, siteBlueprint, navigation) {
  const navHtml = renderNavigation(navigation);

  return pageResults.map((page) => {
    const relatedPages = pickRelatedPages(page, siteBlueprint.pages || []);
    const relatedLinksHtml = renderRelatedLinks(relatedPages);
    const injectedSections = [
      {
        component: "site-navigation",
        id: "site-navigation-primary",
        variant: "default",
        html: navHtml,
        css: ""
      },
      ...page.sections,
      {
        component: "site-links",
        id: "site-links-primary",
        variant: "default",
        html: relatedLinksHtml,
        css: ""
      }
    ];
    const finalized = finalizeRenderedPage({
      pageType: page.pageType,
      sections: injectedSections,
      globalCSS: page.globalCSS || page.css || ""
    });

    return {
      ...page,
      sections: injectedSections,
      html: finalized.html,
      fullPageHtml: finalized.fullPageHtml,
      navigation,
      internalLinks: relatedPages.map((relatedPage) => ({
        href: buildPath(relatedPage),
        label: relatedPage.type === "home" ? "Home" : relatedPage.topic
      }))
    };
  });
}

function pickRelatedPages(currentPage, pages) {
  return pages
    .filter((page) => page.type !== currentPage.pageType || page.topic !== currentPage.topic)
    .filter((page) => {
      if (currentPage.pageType === "home") {
        return page.type === "service" || page.type === "location";
      }
      if (currentPage.pageType === "service") {
        return page.type === "location" || page.type === "blog";
      }
      if (currentPage.pageType === "location") {
        return page.type === "service" || page.type === "blog";
      }
      return page.type === "service" || page.type === "home";
    })
    .slice(0, 4);
}

function renderNavigation(navigation) {
  const items = (navigation.items || [])
    .slice(0, 6)
    .map(
      (item) => `<a class="wpb-site-nav__link" href="${sanitizeUrl(item.href)}">${escapeHtml(item.label)}</a>`
    )
    .join("");

  return `
    <nav class="wpb-site-nav" aria-label="Site navigation">
      <div class="wpb-shell">
        <div class="wpb-site-nav__inner">
          ${items}
        </div>
      </div>
    </nav>
  `.trim();
}

function renderRelatedLinks(relatedPages) {
  const links = relatedPages
    .map(
      (page) => `
        <li><a href="${sanitizeUrl(buildPath(page))}">${escapeHtml(page.topic)}</a></li>
      `
    )
    .join("");

  return `
    <section class="wpb-section wpb-site-links">
      <div class="wpb-shell">
        <h2>Related Pages</h2>
        <ul class="wpb-list">
          ${links}
        </ul>
      </div>
    </section>
  `.trim();
}

function injectIntoMain(html, injectedHtml) {
  if (!html.includes("</main>")) {
    return `${html}\n${injectedHtml}`;
  }

  return html.replace("</main>", `\n${injectedHtml}\n  </main>`);
}
