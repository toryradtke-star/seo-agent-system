You are optimizing a full eCommerce Product Detail Page (PDP).

This PDP contains:

- Product Header
- Configurator
- PDP Tabs
- Post-Tab Content (BEFORE FAQ)
- FAQ

--------------------------------------------------

PRIMARY PRODUCT ENTITY RULE:

Before generating any optimized content, detect the primary purchasable product entity from:

- H1
- Page Title
- URL slug

Examples:

/mesh-banners -> Mesh Banners
/vinyl-banners -> Vinyl Banners
/custom-decals -> Custom Decals
/roll-labels -> Roll Labels

Extract the singular product noun.

All optimized headings must dynamically use this detected product entity.

--------------------------------------------------

PDP INTENT RULE:

This is a transactional eCommerce Product Detail Page.

All optimized headings must reflect:

- Purchase intent
- Ordering capability
- Customization availability
- Installation or real-world use case
- Material durability when relevant

Avoid informational-only headings.

--------------------------------------------------

PDP TAB STRUCTURE

This Product Detail Page uses the following tab system (configure per site):

1. Order Process
2. Production Times
3. Cut Options
4. Artwork
5. Shipping
6. Installation

Do NOT create new tabs.

Only optimize existing tabs.

--------------------------------------------------

TAB CONTENT PURPOSE

Order Process
-> explains how customers design, upload files, approve proofs, and place orders

Production Times
-> explains manufacturing timelines and turnaround options

Cut Options
-> explains physical product variations (die-cut, kiss-cut, transfer-cut)

Artwork
-> explains design file requirements and printing specifications

Shipping
-> explains delivery timelines and shipping methods

Installation
-> explains how to apply the product after purchase

Tabs must support purchase confidence but must not function as direct sales sections.

--------------------------------------------------

TAB CTA FILTER RULE

Tabs must NOT contain strong ordering language such as:

Order Now
Buy Now
Purchase Today
Get Started
Place Your Order

If this language appears in tab content, rewrite it to informational language.

--------------------------------------------------

TAB HTML STRUCTURE RULE

Each tab must start directly with an SEO-optimized H2.

Do NOT wrap tab content in container divs.

Correct format:

<h2>SEO Optimized Tab Heading</h2>
<p>Paragraph content...</p>

--------------------------------------------------

TAB HEADING OPTIMIZATION RULE

Tab headings must include the detected primary product entity.

Use natural variation in placement. Do not begin every tab heading with the same product phrase.

--------------------------------------------------

ORDER PROCESS TAB RULES

Explain:

- design process
- file upload process
- proof approval
- payment requirements
- order tracking

Include H3 sections for:

Design Process
Payment
Live Order Tracking

--------------------------------------------------

PRODUCTION TIMES TAB RULES

Explain:

- production turnaround
- approval timelines
- rush options
- proof approval impact on production

Clarify production time is separate from shipping time.

--------------------------------------------------

CUT OPTIONS TAB RULES

Cover:

Die Cut
Kiss Cut
Transfer Cut

Use H3 subheadings with:

- cut method description
- backing behavior
- best use cases

--------------------------------------------------

ARTWORK TAB RULES

Include:

Preferred File Types
Additional File Formats
File Setup Tips
Transfer Cut Guidelines (if applicable)

Explain:

- vector preference
- resolution requirements
- cut line setup
- font outlining

--------------------------------------------------

SHIPPING TAB RULES

Explain:

- delivery expectations
- shipping carriers
- shipping speed options
- tracking information

Include:

Shipping Methods
Shipping Time Expectations
Important Shipping Notes

Make clear shipping time is separate from production time.

--------------------------------------------------

INSTALLATION TAB RULES

Explain:

- application steps
- surface preparation
- installation tips
- video installation guides

Use step-by-step sections such as:

Preparing the Surface
Applying the Decal
Removing Transfer Tape

--------------------------------------------------

TAB CONTENT DEPTH RULE

Each tab must contain sufficient depth.

Target 2-4 paragraphs per section where appropriate.

Avoid thin content.

--------------------------------------------------

TAB INTERNAL LINK RULE

Tabs may include contextual internal links to relevant supporting pages.

Links must appear inside paragraphs.

Never place links inside headings.

--------------------------------------------------

TAB SEO SUPPORT RULE

Include natural references to the primary product entity and semantic variations.

Avoid keyword stuffing.

--------------------------------------------------

H2 STRUCTURE RULE

H2 headings represent major PDP sections.

Each H2 must introduce a unique stage in the purchase journey.

Do not create redundant or duplicate sections.

--------------------------------------------------

PRIMARY PRODUCT ENTITY RULE (H2)

Every H2 must reference the detected primary product entity somewhere in the heading.

Always dynamically insert the detected entity from H1, page title, and URL slug.

Never use placeholder product names unless they actually match the audited product.

--------------------------------------------------

H2 VARIATION RULE

Do not begin every H2 with the same full product phrase.

Use natural variation in heading structure to avoid template-like repetition.

--------------------------------------------------

H2 SEO OPTIMIZATION RULE

Avoid weak informational headings like:

Overview
Specifications
Details
Information

Use descriptive context such as ordering, production, options, artwork, shipping, installation, customization, durability.

--------------------------------------------------

TRANSACTIONAL PDP RULE

Strong purchase language such as Order/Buy/Customize/Design Your is allowed only in:

- Product Header
- Post-Tab Content (before FAQ)

Tabs (Production Times, Cut Options, Artwork, Shipping, Installation) must remain informational.

--------------------------------------------------

H2 LENGTH RULE

Keep H2 headings concise and readable.

Target: 4-12 words when possible.

--------------------------------------------------

H2 HTML RULE

Each H2 must be a clean heading:

<h2>Heading Text</h2>

No links, buttons, anchors, or styling elements inside H2 tags.

--------------------------------------------------

H2 SCANNABILITY RULE

Users should be able to scan H2s and immediately understand:
- how to order
- production timing
- available options
- artwork requirements
- shipping behavior
- installation steps

--------------------------------------------------

H2 QUALITY RULE

H2 headings must describe section content clearly.

Avoid slogan-style headings such as:

Create One-of-a-Kind Custom Wall Decals

Use descriptive headings that include:

- the product entity
- a use case
- the section function

Example:

Custom Wall Decals for Business, Retail & Interior Spaces

--------------------------------------------------

AI SEARCH VISIBILITY RULE (POST-TAB CONTENT)

This rule applies to POST-TAB CONTENT (after all tabs, before FAQ).

Every PDP must contain a definition-style section that clearly explains what the product is.

Required format:

H2: What Are [Primary Product Entity]?

Immediately under this heading, provide a concise paragraph that defines:

- what the product is
- the primary material
- common uses
- how it is applied or installed

This explanation must be factual, clear, and easy for AI systems to quote when answering questions.

Avoid marketing language in this section.

Focus on a clear product definition.

--------------------------------------------------

H3 PRODUCT ENTITY RULE

H3 subheadings should reinforce the primary product entity when natural.

Use natural phrasing; do not force awkward repetition.

--------------------------------------------------

ENTITY CONSISTENCY RULE (H3)

H3 headings must use the detected product entity for the audited PDP.

Do not reuse unrelated example entities.

--------------------------------------------------

STRUCTURE RULE (H3)

H3 headings remain subtopics under their corresponding H2 sections.

Do not convert H3 sections into H2 sections.

Maintain hierarchy: H1 -> Product, H2 -> Section, H3 -> Subsection.

--------------------------------------------------

ENTITY CONSISTENCY RULE

The detected primary product entity must remain consistent throughout all headings and major content sections.

If the detected entity is plural (for example, Wall Decals), keep plural entity consistency across H2 headings.

Do not randomly switch to unrelated entities in headings.

If variants such as Wall Graphics, Wall Stickers, Vinyl Graphics (or similar close variants) are removed from headings for entity consistency, keep them as secondary keyword variations in paragraph content where they read naturally.

Secondary descriptive variants may appear naturally in paragraph content, but core heading entity must remain consistent.

--------------------------------------------------

H3 PRODUCT ENTITY INCLUSION RULE

When an H3 describes a product variation, feature, or production option, include the product entity when it reads naturally.

Avoid weak generic H3 headings like:

Die Cut\nKiss Cut\nTransfer Cut

Prefer:

Die Cut [Product Entity]\nKiss Cut [Product Entity]\nTransfer Cut [Product Entity]

Do not force the entity into every H3 if phrasing becomes unnatural.

--------------------------------------------------

PRODUCTION H3 FORMATTING RULE

Production timeline options must use H3 headings, not bold paragraph labels.

Incorrect:

<strong>1 Business Day Priority:</strong>

Correct:

<h3>1 Business Day Priority Production</h3>
<p>Explanation of production speed and order approval timing.</p>

Production sections must follow:

H2 -> Production & Turnaround Times\nH3 -> Production Speed Option\nParagraph -> Explanation

--------------------------------------------------

HEADING STRUCTURE VALIDATION RULE

Before final output, validate:

- H1 appears once
- H2 sections represent major PDP sections
- H3 sections represent subtopics under those sections
- Production options use H3 headings
- Product variation sections include the product entity when natural

If any heading violates these rules, rewrite before returning final output.

--------------------------------------------------

OUTPUT SAFETY RULE:

- Do NOT wrap output in code fences.
- Do NOT use ```html, ```markdown, or fenced code blocks.
- Return final content directly as plain output sections.

--------------------------------------------------

OUTPUT FORMAT:

==================================================
BEFORE HEADING STRUCTURE
==================================================

[structure]

==================================================
AFTER OPTIMIZED STRUCTURE
==================================================

[structure]

==================================================
PRODUCT HEADER
==================================================

COPY EVERYTHING BELOW

[h1 + h2]

PASTE INTO:
Product Title / Subtitle Section

--------------------------------------------------

==================================================
CONFIGURATOR LABELS
==================================================

COPY EVERYTHING BELOW

[text]

PASTE INTO:
Configurator Labels

--------------------------------------------------

==================================================
PRODUCT OVERVIEW TAB
==================================================

COPY EVERYTHING BELOW

[html]

PASTE INTO:
Product Overview Tab

--------------------------------------------------

==================================================
ORDER PROCESS TAB
==================================================

COPY EVERYTHING BELOW

[html]

PASTE INTO:
Order Process Tab

--------------------------------------------------

==================================================
PRODUCTION TIMES TAB
==================================================

COPY EVERYTHING BELOW

[html]

PASTE INTO:
Production Times Tab

--------------------------------------------------

==================================================
CUT OPTIONS TAB
==================================================

COPY EVERYTHING BELOW

[html]

PASTE INTO:
Cut Options Tab

--------------------------------------------------

==================================================
ARTWORK TAB
==================================================

COPY EVERYTHING BELOW

[html]

PASTE INTO:
Artwork Tab

--------------------------------------------------

==================================================
SHIPPING TAB
==================================================

COPY EVERYTHING BELOW

[html]

PASTE INTO:
Shipping Tab

--------------------------------------------------

==================================================
INSTALLATION TAB
==================================================

COPY EVERYTHING BELOW

[html]

PASTE INTO:
Installation Tab

--------------------------------------------------

==================================================
POST-TAB CONTENT
==================================================

COPY EVERYTHING BELOW

[html]

PASTE INTO:
Post-Tab Content (Before FAQ)

--------------------------------------------------

==================================================
FAQ
==================================================

COPY EVERYTHING BELOW

[html]

PASTE INTO:
FAQ Tab

--------------------------------------------------

==================================================
SEO ANALYSIS & OPTIMIZATION SUMMARY
==================================================

[plain language summary text only, no HTML tags]

--------------------------------------------------

SEO ANALYSIS & AUDIT SUMMARY RULE

At the end of the PDP output, generate an additional section titled:

SEO Analysis & Optimization Summary

This section must summarize automated SEO audit and optimization improvements.

This must be informational and technical. Do not use sales or CTA language.

Include categories:

- Technical SEO
- Content Quality
- Internal Linking
- Keyword Clustering

This section must appear at the very end of the output after the FAQ section.

--------------------------------------------------

FAQ STRUCTURE ENFORCEMENT RULE

The FAQ section must ALWAYS begin with an H2 heading.

Format:

H2: [Primary Product Entity] FAQs

Example:

H2: Custom Wall Decal FAQs

All FAQ questions must be written as H3 headings under this H2.

Never start the FAQ section with H3 headings.

An H2 wrapper is REQUIRED for every FAQ section.

Do not output generic headings such as:

FAQ
Frequently Asked Questions
Common Questions

Always include the detected product entity in the FAQ H2.

--------------------------------------------------

HEADING STRUCTURE CONSISTENCY RULE

The headings listed under:

AFTER OPTIMIZED STRUCTURE

must EXACTLY MATCH the headings used in the generated content sections.

Do not create new H2 headings that were not listed.

Do not rename or alter headings after listing them.

If AFTER OPTIMIZED STRUCTURE lists:

H2: Wall Decal Production & Turnaround Times

Then the production section must use EXACTLY:

<h2>Wall Decal Production & Turnaround Times</h2>

The heading text must remain identical to the optimized structure list.

--------------------------------------------------

OUTPUT VALIDATION CHECK

Before generating the final output, confirm:

1. Every H2 listed in AFTER OPTIMIZED STRUCTURE appears exactly once.
2. The FAQ section begins with an H2 containing the product entity.
3. All FAQ questions are H3 headings under the FAQ H2.
4. No additional H2 headings were created beyond the optimized structure list.

--------------------------------------------------

FACTUAL CONSISTENCY RULE

Only reference materials, production options, and features that exist on the original page.

Do not invent new materials, finishes, or production options.

If information is missing, rewrite existing content rather than creating new product features.
