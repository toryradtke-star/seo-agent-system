# PDP Optimization Agent

This project optimizes eCommerce Product Detail Pages (PDPs) for SEO using Claude Code.

## Workflow

When the user provides a product page URL to optimize:

1. **Scrape the page** — Run `node scraper.js <url>` to fetch the page content. This outputs JSON with `headings` and `bodyHtml`.

2. **Read the prompt** — Read `pdp-prompt.md` for the full optimization rules and output format.

3. **Generate optimized content** — Apply the rules from `pdp-prompt.md` to the scraped page data. Substitute `{{HEADINGS_JSON}}` with the scraped headings and `{{BODY_HTML}}` with the scraped HTML. Follow all rules and produce the output in the specified format.

4. **Save output** — Write the optimized content to `output/<product-name>.md` (create the `output/` directory if needed). Derive the product name from the URL slug.

5. **Google Docs (optional)** — If the user wants the output in Google Docs, run `node docsAgent.js <output-file> "<doc-title>"` to create a new Google Doc with the content.

## Scripts

- `scraper.js` — Fetches a URL and extracts headings + body HTML. Usage: `node scraper.js <url>`
- `docsAgent.js` — Uploads content from a file to a new Google Doc. Usage: `node docsAgent.js <file-path> [doc-title]`

## Key Files

- `pdp-prompt.md` — The full PDP optimization prompt with all SEO rules
- `oauth.json` — Google OAuth credentials
- `token.json` — Google OAuth token (auto-generated on first auth)
- `credentials.json` — Google service account credentials
