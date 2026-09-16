import { escapeHtml, sanitizeUrl } from "../../core/html.js";

export function renderSectionShell({ sectionClass, innerClass = "wpb-shell", attributes = {}, content }) {
  const attributeString = Object.entries(attributes)
    .map(([key, value]) => `${key}="${escapeHtml(value)}"`)
    .join(" ");
  const sectionAttributes = attributeString ? ` ${attributeString}` : "";

  return `
    <section class="wpb-section ${sectionClass}"${sectionAttributes}>
      <div class="${innerClass}">
        ${content}
      </div>
    </section>
  `;
}

export function renderHeadingBlock({ title, intro }) {
  const introHtml = intro ? `<p class="wpb-section-intro">${escapeHtml(intro)}</p>` : "";
  return `
    <h2>${escapeHtml(title)}</h2>
    ${introHtml}
  `;
}

export function renderCardGrid({ gridClass = "wpb-grid wpb-grid--3", items }) {
  return `<div class="${gridClass}">${items.join("")}</div>`;
}

export function renderButton({ className = "wpb-button", href, text }) {
  return `<a class="${className}" href="${sanitizeUrl(href)}">${escapeHtml(text)}</a>`;
}

export function renderParagraphs(paragraphs = []) {
  return paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("");
}

export function renderList(items = [], renderItem) {
  return items.map(renderItem).join("");
}
