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
