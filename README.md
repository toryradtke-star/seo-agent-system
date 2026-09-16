# SEO agent system

A multi-agent pipeline that takes a product catalog from URL to optimized page
content. It crawls, routes each page to the right treatment, pulls SERP intent,
generates a rewrite, scores that rewrite against explicit rules, and retries the
ones that fail — as queue-backed jobs that survive a restart.

Built and tuned against a signage e-commerce catalog of roughly 600 product
pages, where a full audit-and-rewrite pass runs in about 20 minutes.

## Why it's shaped this way

The interesting problems here weren't prompting. They were the ones that show up
once an LLM pipeline runs unattended against the open internet.

**Scraped pages are untrusted input, and they reach a model.** Any page you
crawl can contain text aimed at the model reading it. `core/promptSanitizer.js`
strips known injection patterns and collapses repeated-token floods; 
`core/buildSafePrompt.js` wraps whatever survives in an explicit
untrusted-content boundary that tells the model to treat the payload as data,
never as instructions. `tests/promptInjectionProtection.test.js` holds that
behavior in place.

**A crawler that takes URLs is an SSRF hole.** `core/urlSafety.js` resolves each
hostname and refuses to fetch anything landing on private or link-local ranges,
so a redirect to `169.254.169.254` or `127.0.0.1` can't turn the scraper into a
request proxy into the network it runs in. robots.txt is fetched, cached, and
honored.

**"The model returned something" is not success.** `evals/` scores each
generated page against `scoringRules.js` — required sections present, generic
filler headings (`Overview`, `Product Details`) rejected. A page that fails is
regenerated rather than shipped, and `core/retryPolicy.js` caps that at two
optimization attempts so a page that simply can't pass fails loudly instead of
burning tokens in a loop.

**Long runs die in the middle.** Work moves through BullMQ on Redis, one worker
per stage (`queue/workers/`). Interrupting a 600-page run and restarting it
resumes from the last completed stage per page instead of re-crawling and
re-billing everything — the logic is pinned by `tests/resume.logic.test.js`.

**Upstream APIs fail in predictable ways.** Retries are limited to genuinely
retryable failures — 429, 502, 503, 504, overloaded, timeouts, connection resets
— with exponential backoff plus jitter. A malformed request isn't retried,
because retrying it just fails again more expensively.

## Pipeline

```
crawl → scrape → route → analyze → optimize → evaluate → schema → export
```

`core/stages/` holds one module per stage and `core/runPagePipeline.js` composes
them. `pageRouterAgent.js` classifies each URL (product page, category,
homepage) so a PDP and a category page don't get the same treatment. The
per-stage split is what makes resume possible: stage completion is the
checkpoint.

## What's in here

| Path | |
|---|---|
| `core/` | Pipeline composition, stages, prompt safety, URL safety, retry policy |
| `queue/` | BullMQ runtime and one worker per pipeline stage |
| `evals/` | Output scoring — required sections, generic-heading rejection |
| `agents/`, `*Agent.js` | Per-concern agents: audit, content gap, internal linking, keyword clustering, schema, SERP intel, technical SEO, site strategy |
| `services/` | SERP scraping, entity extraction |
| `prompts/` | Prompt templates kept out of code |
| `config/vertical.js` | Domain vocabulary — retarget the system by editing one file |
| `tests/` | Contract, routing, resume, retry, injection, and schema tests |
| `wp-page-builder/` | Companion generator that renders optimized content into page markup |

## Running it

```bash
npm install
cp .env.example .env          # fill in ANTHROPIC_API_KEY at minimum
cp urls.example.txt urls.txt  # your crawl targets
npm test                      # 8 suites, no API key or network needed
```

Then a full pass:

```bash
node runSystem.js --mode full --url-list urls.txt
```

`systemHealthCheck.js` verifies configuration and connectivity before a long run.
The queue workers run independently — see the `worker:*` scripts in
`package.json` — and need Redis.

`.env.example` documents every variable. Rate limits (`LIMIT_CLAUDE`,
`LIMIT_HTTP`, `LIMIT_SERP`) are concurrency ceilings per outbound dependency,
set low on purpose: the bottleneck is politeness to the sites being crawled, not
throughput.

## Notes

Written with Claude Code as an AI-assisted development workflow; `CLAUDE.md`
holds the conventions that drove it.

The vocabulary in `config/vertical.js` is specific to printed signage, which is
the catalog this was built against. Retargeting to another vertical means
editing that file — the pipeline itself carries no domain assumptions.

## License

MIT
