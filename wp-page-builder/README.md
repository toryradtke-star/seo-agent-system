# WP Page Builder

Modular page generation system for Beaver Builder-ready HTML and CSS.

## Architecture

- `content/`: content intelligence and SEO structure
- `generator/`: blueprint and section-content generation
- `sections/`: self-contained component definitions and variants
- `components/`: registry assembly
- `design/`: tokens, themes, and CSS generation
- `renderer/`: validated page/section rendering
- `integrations/`: Google Drive / Google Docs export
- `core/`: validation, contracts, escaping, and shared errors

## Development Notes

- All renderable sections are validated before render.
- HTML output is escaped and URL attributes are sanitized.
- `generatePage()` is the reusable orchestration API.
- `index.js` is an example entrypoint that also exports to Google Drive.

## CLI

```powershell
node index.js --topic "Dry Needling" --location "Alexandria MN" --pageType service --theme clinic --export console,files
node index.js --topic "gym home page" --brand "Workout 24/7" --colors "#FFFFFF,#F77F00,#000000" --pageType home --theme gym --export files,drive
node index.js --config ./page.config.example.json
```

Export modes:

- `console`
- `files`
- `drive`
- `all`

## Adding A New Section

1. Create `sections/<name>/schema.js`
2. Create `sections/<name>/variants/*.js`
3. Create `sections/<name>/definition.js`
4. Register the definition in `components/componentRegistry.js`
5. Add template/layout/content rules as needed
