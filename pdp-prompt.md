# PDP Optimization Prompt

You are optimizing a full eCommerce Product Detail Page (PDP).

This PDP contains:

- Product Header
- Configurator
- PDP Tabs
- Post-Tab Content (BEFORE FAQ)
- FAQ

---

## PRIMARY PRODUCT ENTITY RULE

Before generating any optimized content,
detect the primary purchasable product entity from:

- H1
- Page Title
- URL slug

Examples:

/mesh-banners → Mesh Banners
/vinyl-banners → Vinyl Banners
/custom-decals → Custom Decals
/roll-labels → Roll Labels

Extract the singular product noun:

Mesh Banner
Vinyl Banner
Custom Decal
Roll Label

All optimized headings must dynamically use this detected product entity.

Never reuse "Mesh Banner" unless the page being audited
is specifically a Mesh Banner PDP.

All examples in this prompt are placeholders only.

Always replace example product nouns with the detected product entity.

---

## PDP INTENT RULE

This is a transactional eCommerce Product Detail Page.

All optimized headings must reflect:

- Purchase intent
- Ordering capability
- Customization availability
- Installation or real-world use case
- Material durability when relevant

Avoid informational-only headings such as:

Overview
Specifications
Product Details
Product Information
General Information

These weaken transactional classification.

Instead:

Headings must imply that the user
can order, customize, install, or purchase
the detected product.

Example:

Mesh Banner Overview (bad)

Order Custom Mesh Banners for Outdoor Fence Installation (good)

Never output informational PDP section headings.

---

## HEADING VARIATION RULE

All tab H2s must include the detected
primary product entity across the PDP.

However:

Do NOT begin every H2 with the full product name.

Use natural semantic variation such as:

- Material for Custom Mesh Banners
- Finishing Options for Outdoor Mesh Banner Installation
- Production Times for Printed Mesh Banners
- Artwork Requirements for Mesh Banner Printing
- Shipping Options for Large Format Mesh Banners

Ensure the primary product entity
appears somewhere in the heading,
but vary placement to avoid repetition.

Avoid patterns such as:

Custom Mesh Banner Material
Custom Mesh Banner Finishing
Custom Mesh Banner Production
Custom Mesh Banner Shipping

This creates template-like repetition.

Headings should read naturally to users.

---

## PDP JOURNEY RULE

Not all PDP sections serve the same role.

Tabs are:

Product education content.

Post-Tab Content is:

Purchase reinforcement content.

FAQ is:

Decision support content.

Therefore:

Only the following sections may contain
strong ordering language such as:

Order
Buy
Purchase
Get Started
Customize Now

- Product Header
- Product Overview Tab
- Post-Tab Content (Before FAQ)

Avoid strong ordering language in:

- Material Tab
- Finishing Options Tab
- Production Times Tab
- Shipping Tab
- Artwork Tab

These should remain informational but
support purchase decisions indirectly.

Do not repeat the same transactional
heading intent across multiple sections.

Each section must serve a unique role
in the purchase journey.

---

## TAB CTA FILTER RULE

Tabs must not contain:

Order
Buy
Customize your order
Request a quote
Get started
Place your order

If CTA-style language exists inside:

Material
Finishing
Production
Shipping
Artwork

Rewrite to informational support language.

Example:

We can customize your order through a custom quote (bad)

Custom sizing and specialty applications
are available upon request. (good)

---

## CONVERSION HIERARCHY RULE

Only ONE PDP section may contain
strong purchase CTA-style H2 language.

This must be:

Post-Tab Content (Before FAQ)

Examples:

Order Custom Fabric Banners Today
Customize & Print Your Fabric Banner
Design & Order Custom Fabric Banners
Create Your Custom Fabric Banner Online

---

The Product Overview Tab may contain:

- customization language
- installation language
- material
- durability
- display usage

But MUST NOT contain:

Order
Buy
Purchase
Get Started
Order Now
Customize Now

---

Overview is:

Product Understanding

Post-Tab is:

Purchase Reinforcement

Do not create CTA-style H2s in Overview.

---

## STEP 1

Audit ALL headings and output:

BEFORE HEADING STRUCTURE

Then output:

AFTER OPTIMIZED STRUCTURE

Fix:

- Skipped heading levels
- Tool-style headings
- Missing product entity
- Missing material
- Missing durability
- Missing ordering language

---

## STEP 2

Optimize ALL PDP CONTENT SECTIONS:

1) Product Header
2) Configurator Labels
3) Product Overview Tab
4) Material Options Tab
5) Finishing Options Tab
6) Production Times Tab
7) Payment Options Tab
8) Shipping Guidelines Tab
9) Common Uses Tab
10) Artwork Tab
11) Post-Tab Content (Before FAQ)
12) FAQ

---

## PRODUCT HEADER RULES

- H1 must include:
  - Product
  - Use case (fence, storefront, outdoor, construction install, etc)

Example:
Custom Mesh Banners for Outdoor Fence & Construction Use

- Subtitle MUST be an `<h2>`
- Subtitle MUST include:
  - Material
  - Durability
  - Customization
  - Ordering language

---

## PRODUCT OVERVIEW TAB H2 RULE

Do NOT use informational headings such as:
Overview
Specifications
Product Details
Product Information

Instead:

Rewrite the Product Overview tab H2 to include:

- Primary product entity
- Ordering or purchasing language
- Installation or use case if possible

Example:

Mesh Banner Overview & Specifications (bad)

Order Custom Mesh Banners for Outdoor Fence & Construction Installations (good)

Never output an informational Product Overview H2.

---

## TAB CONTENT RULES

- DO NOT wrap tab content in `<div>`
- Start directly with `<h2>`

---

## TAB H2 SEO RULES

Each tab `<h2>` must be optimized for SEO.

Do NOT use UI labels like:
Material Options
Finishing Options
Production Times
Shipping Guidelines
Artwork
Common Uses
Payment Options

Instead, rewrite them to:

- Include the primary product entity
- Include material, installation, ordering, or durability where relevant

Examples:

Material Options →
Mesh Banner Material for Outdoor Fence Installations

Finishing Options →
Mesh Banner Finishing Options for Fence Mounting

Production Times →
Custom Mesh Banner Production & Turnaround Times

Shipping Guidelines →
Shipping Options for Custom Mesh Banner Delivery

Artwork →
Mesh Banner Artwork Requirements for Printing

Common Uses →
Outdoor Fence & Construction Uses for Mesh Banners

Payment Options →
Mesh Banner Payment & Ordering Options

Never leave tab H2s as generic UI labels.

---

## TAB STRUCTURE RULES

- DO NOT suggest creating new tabs
- Only optimize existing tabs

---

## RELATED PRODUCTS RULE

Never create or optimize headings for:
Related Products
You May Also Like
Products You Might Like

These sections are navigational UI elements
and should not be treated as SEO heading sections.

Do not convert these into H2s.

---

## HEADING LINK RULE

Do not include:
Buttons
Return to Top links
Anchor links
CTAs

inside H2 or H3 tags.

Links must be placed in paragraphs below headings.
Never embed `<a>` elements inside SEO headings.

---

## OUTPUT FORMAT

```
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
MATERIAL OPTIONS TAB
==================================================

COPY EVERYTHING BELOW

[html]

PASTE INTO:
Material Options Tab

--------------------------------------------------

==================================================
FINISHING OPTIONS TAB
==================================================

COPY EVERYTHING BELOW

[html]

PASTE INTO:
Finishing Options Tab

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
PAYMENT OPTIONS TAB
==================================================

COPY EVERYTHING BELOW

[html]

PASTE INTO:
Payment Options Tab

--------------------------------------------------

==================================================
SHIPPING GUIDELINES TAB
==================================================

COPY EVERYTHING BELOW

[html]

PASTE INTO:
Shipping Guidelines Tab

--------------------------------------------------

==================================================
COMMON USES TAB
==================================================

COPY EVERYTHING BELOW

[html]

PASTE INTO:
Common Uses Tab

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
```

---

## INPUT DATA

**HEADINGS:**
{{HEADINGS_JSON}}

**HTML:**
{{BODY_HTML}}
