# BDS Website — System Documentation

> Public-facing Boswell Digital Solutions website for product positioning, security framing, and bounded commerce.

| Key | Value |
|-----|-------|
| **Document version** | 1.2 (2026-03-02) |
| **Prefix** | `bw` |
| **Output** | `doc/bwSYSTEM.md` |
| **Protocol** | BDS Documentation Protocol v2.0 |

## Modular Documentation

This reference is split into numbered part files under `doc/system/`.
Rebuild the unified document with `bash doc/system/BUILD.sh`.

## Table of Contents

1. [Overview & Philosophy](./system/01-overview-philosophy.md)
2. [Architecture](./system/02-architecture.md)
3. [Tech Stack](./system/03-tech-stack.md)
4. [Project Structure](./system/04-project-structure.md)
5. [Page Inventory](./system/05-page-inventory.md)
6. [Design System & HUD](./system/06-design-system-hud.md)
7. [Security & Commerce Model](./system/07-security-commerce.md)
8. [Quality & Handover](./system/08-quality-handover.md)

## Quick Assembly

```bash
bash doc/system/BUILD.sh
```

*Last updated: 2026-03-02*

---

# 1. Overview & Philosophy

## Purpose

`bds_website` is the public marketing surface for Boswell Digital Solutions. It presents:

- company positioning
- Forge ecosystem products
- a security-first posture
- a future commerce surface for licensed software and services
- legal pages for terms, privacy, refund, and EULA

## Current Delivery Model

The site is implemented as static HTML/CSS with a minimal inline JavaScript layer on the homepage. It is intentionally simple:

- no framework runtime in production pages
- no client-side state management library
- no active checkout flow yet
- no authenticated customer area yet

This keeps the public surface easy to inspect and cheap to ship while the brand, copy, and governance posture are still being refined.

## Product Philosophy

The presentation model is consistent across the repo:

- governance-first before feature-first
- dark, controlled visual language instead of trend-driven startup styling
- security claims framed as architecture, not marketing garnish
- accessible, low-complexity public navigation
- clear distinction between what exists now and what is planned

## Scope Boundaries

This repository currently covers the website shell and supporting documentation. It does not yet contain:

- implemented Stripe checkout flows
- passkey registration or login code
- server-side webhook handling
- product detail pages for the homepage links under `products/`

Those capabilities are described in planning docs, but they are not present in this repo as executable website features today.

---

# 2. Architecture

## High-Level Shape

The site is a static multi-page website:

- `index.html` is the most complete page and contains the primary brand narrative
- secondary pages reuse the same visual shell but are mostly under-construction placeholders
- legal pages live under `legal/`
- shared styling is loaded from `src/styles/`

## Rendering Model

Each page is server-agnostic HTML. The development loop uses a small local static server launched through Bun:

```bash
bun run dev
```

The `dev` script runs `dev-server.ts`. There is no application bundling pipeline for the website pages themselves.

## Shared Layout Pattern

Most pages repeat the same major regions:

1. header with Boswell Digital Solutions brand and navigation
2. main content region
3. footer with company attribution and SDVOSB marker

This is currently duplication-by-copy rather than templated composition. The homepage is the only page with the expanded multi-column footer; the rest of the pages use a simplified footer bottom bar.

## Homepage Interaction Layer

The client-side behavior is split across two places:

- `src/js/site.js` provides shared mobile-nav behavior for every page
- `index.html` contains the homepage-only HUD behavior
- the HUD script handles open/close state, overlay dismissal, `Escape`, focus handoff into the input, and focus trapping inside the panel

The interaction footprint remains intentionally small. All pages now share the same header toggle/button contract, while only the homepage instantiates HUD markup and its inline HUD script.

## Shared Navigation Contract

The responsive header implementation is now consistent across the site:

- every page includes `#menu-toggle`
- every page includes `#main-nav`
- every page loads `src/js/site.js` or `../src/js/site.js` from legal routes
- the shared script toggles `.site-header__nav--open`, updates `aria-expanded`, closes on `Escape`, closes after nav-link activation, and resets on desktop resize

As checked in today, mobile navigation is implemented through one shared script and one shared markup pattern across all pages.

## Documentation Architecture

The repo now follows the standard Forge modular doc pattern:

- editable source parts in `doc/system/`
- generated unified reference in `doc/bwSYSTEM.md`
- deterministic assembly via `doc/system/BUILD.sh`

---

# 3. Tech Stack

## Runtime Stack

| Layer | Technology | Notes |
|------|------------|-------|
| Public pages | HTML5 | Static multi-page site |
| Styling | CSS | Shared tokens plus page-specific styles |
| Interaction | Vanilla JavaScript | Shared `src/js/site.js` plus homepage HUD inline script |
| Dev server | Bun + local TypeScript server | `bun run dev` executes `dev-server.ts` |
| Package manager | Bun | Minimal `package.json` |

## Design Stack

| Concern | Implementation |
|--------|----------------|
| Heading font | `DM Sans` |
| Body font | `Source Sans 3` |
| Token source | `src/styles/tokens.css` |
| Shared layout styles | `src/styles/global.css`, `header.css`, `footer.css`, `hud.css` |
| Homepage styles | `src/styles/pages/home.css` |
| Shared behavior | `src/js/site.js` |

## Quality / Governance Tooling

The repo also contains StateForge QC wiring:

- `tools/qc/stateforge.ts`
- `tools/stateforge/`
- `bun run qc:stateforge`

That tooling is part of the broader Forge governance workflow, not the website runtime itself.

## Practical Consequences

This stack is optimized for:

- low operational complexity
- easy inspection of shipped markup
- fast edits to copy and presentation
- simple hosting on any static-capable platform

It is not yet optimized for:

- component reuse through templates
- typed frontend logic
- automated content generation pipelines
- integrated commerce or auth backends

---

# 4. Project Structure

## Top-Level Map

```text
bds_website/
├── AUDIT_REPORT.md
├── bun.lock
├── dev-server.ts
├── about.html
├── contact.html
├── out/
│   └── stateforge.evidence.bundle.json
├── index.html
├── products.html
├── security.html
├── store.html
├── legal/
│   ├── eula.html
│   ├── privacy.html
│   ├── refund.html
│   └── terms.html
├── src/
│   ├── assets/images/
│   │   └── bds-logo.png
│   ├── js/
│   │   └── site.js
│   └── styles/
│       ├── footer.css
│       ├── global.css
│       ├── header.css
│       ├── hud.css
│       ├── tokens.css
│       └── pages/home.css
├── docs/
│   ├── bds_design_system_color_tokens_v_1.md
│   ├── bds_homepage_wireframe_with_hud_v_1.md
│   ├── bds_website_pages_wireframes_v_1.md
│   ├── page-content-v1.md
│   └── store_security_architecture_v_1.md
├── doc/
│   ├── bwSYSTEM.md
│   └── system/
└── tools/
    ├── qc/
    │   ├── perf_budgets.json
    │   └── stateforge.ts
    └── stateforge/
        ├── fixtures/
        ├── out/
        ├── src/
        └── package.json
```

## Folder Roles

- `src/styles/` holds the actual reusable presentation system.
- `docs/` contains planning and reference material that informed the implementation.
- `doc/system/` is the maintained modular system reference.
- `out/` holds generated evidence artifacts already checked into the repo.
- `tools/` contains governance and QC support code, including a vendored StateForge workspace.

## Structural Observations

- Homepage product links now route to `products.html` instead of dead `products/*.html` pages.
- There is no `public/` directory in the checked-in structure despite the README describing one as a future/static asset area.
- Shared page chrome is repeated directly in HTML files rather than abstracted behind includes or templates.

---

# 5. Page Inventory

## Implemented Public Pages

| Page | Path | Status |
|------|------|--------|
| Homepage | `index.html` | Primary authored page; most complete experience |
| Products | `products.html` | Shell present; under construction |
| Store | `store.html` | Shell present; under construction |
| Security | `security.html` | Shell present; marked under construction |
| About | `about.html` | Shell present; under construction |
| Contact | `contact.html` | Shell present; under construction |

## Legal Pages

| Page | Path | Status |
|------|------|--------|
| Terms | `legal/terms.html` | Shell present; under construction |
| Privacy | `legal/privacy.html` | Shell present; under construction |
| Refund | `legal/refund.html` | Shell present; under construction |
| EULA | `legal/eula.html` | Shell present; under construction |

## Homepage Content Blocks

`index.html` currently carries the main brand story:

- authority-driven hero
- product preview cards
- security strip and zone diagram
- store preview cards
- founder / company background
- expanded footer navigation
- ambient HUD assistant

## Shared-Asset Boundary

All public pages load the shared style sheets, including `hud.css`. Only the homepage actually instantiates HUD markup and the inline HUD behavior. All pages now load the shared header script from `src/js/site.js`.

## Content Gaps

The site communicates several future capabilities that are not implemented here yet:

- live store inventory or purchase flow
- fully written-out security architecture page
- contextual HUD intelligence beyond static suggestions

That gap is acceptable as long as the marketing copy remains explicit about planned versus available functionality.

---

# 6. Design System & HUD

## Visual Direction

The design system is defined primarily in `src/styles/tokens.css`:

- deep navy backgrounds for authority and restraint
- orange reserved for calls to action and focus states
- light neutral text for readability against dark surfaces
- compact border radius and restrained elevation

The stated tone is engineered, calm, authoritative, and controlled.

## Typography

- headings use `DM Sans`
- body copy uses `Source Sans 3`
- type scale is declared with explicit token variables

This gives the repo a consistent, non-default visual language without requiring a component framework.

## Interaction System

The HUD is the most opinionated interaction element in the site:

- docked on the right edge
- never auto-expands
- opens into a dialog-like side panel
- offers static suggested prompts
- supports overlay click dismissal and `Escape`
- traps keyboard focus while open on the homepage

The HUD is currently a presentation primitive, not a connected assistant service. Its DOM and JavaScript are only present on `index.html`; the other pages load the shared HUD styles but do not instantiate the HUD UI.

## Accessibility Intent

The implementation already signals several accessibility priorities:

- skip link
- labeled navigation
- button semantics for toggles
- focus-visible styling
- dialog-like HUD affordances
- homepage HUD focus trapping

The repo should preserve those patterns if the site later migrates to a framework implementation.

---

# 7. Security & Commerce Model

## Public Security Narrative

The site positions BDS around:

- passkey authentication
- Stripe-hosted checkout
- Ed25519-signed admin actions
- private infrastructure segmentation
- fail-closed governance

These are presented most clearly on the homepage and in `docs/store_security_architecture_v_1.md`. The dedicated `security.html` page itself is still an under-construction placeholder.

## Important Implementation Boundary

In this repo, those items are largely documentation and positioning statements today. The checked-in website code does not yet implement:

- passkey registration/authentication
- Stripe checkout session creation
- webhook receipt and verification
- signed admin gateway verification logic

That means the security model is currently architectural intent plus site messaging, not a full production commerce stack.

## Commerce Posture

The public store posture is intentionally bounded:

- licensed software and services only
- no card handling on the website itself
- legal terms already scaffolded
- pricing and fulfillment still placeholder-level

This is a reasonable sequence for a repo that is still establishing brand and trust surfaces first.

---

# 8. Quality & Handover

## Local Commands

```bash
bun run dev
bun run qc:stateforge
bash doc/system/BUILD.sh
```

## Current Quality Posture

What exists now:

- deterministic static page rendering
- shared mobile-navigation behavior via `src/js/site.js`
- shared CSS tokens and layout styles
- lightweight homepage HUD interaction script
- StateForge QC wiring in-repo
- checked-in StateForge evidence and report artifacts under `out/` and `tools/stateforge/out/`
- legal and content planning docs

What does not exist yet:

- automated frontend tests
- broken-link enforcement
- templating to remove duplicated layout markup
- production commerce integration tests

## Known Risks

1. Homepage links to product detail pages that are not present.
2. Secondary content pages are mostly shells, so the public narrative depth is concentrated in `index.html`.
3. Security and store claims can outpace implementation if future copy is not kept precise.
4. Repeated header/footer markup increases drift risk across pages.

## Maintenance Rule

When the website structure or system claims change:

1. update the relevant `doc/system/*.md` part files
2. rebuild `doc/bwSYSTEM.md`
3. keep architectural claims aligned with implemented behavior

---
