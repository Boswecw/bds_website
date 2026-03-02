# 2. Architecture

## High-Level Shape

The site is a static multi-page website:

- `index.html` is the most complete page and contains the primary brand narrative
- secondary pages reuse the same visual shell with reduced content depth
- legal pages live under `legal/`
- shared styling is loaded from `src/styles/`

## Rendering Model

Each page is server-agnostic HTML. The development loop uses Bun's static server:

```bash
bun run dev
```

There is no application bundling pipeline for the website pages themselves.

## Shared Layout Pattern

Most pages repeat the same major regions:

1. header with Boswell Digital Solutions brand and navigation
2. main content region
3. footer with company attribution and SDVOSB marker

This is currently duplication-by-copy rather than templated composition.

## Homepage Interaction Layer

`index.html` contains the only meaningful client-side behavior in the repo:

- mobile nav toggle
- BDS Assistant HUD open/close behavior
- HUD overlay dismissal
- `Escape` handling for dialog dismissal
- focus handoff into the HUD input

The interaction footprint is intentionally small and local to the homepage.

## Documentation Architecture

The repo now follows the standard Forge modular doc pattern:

- editable source parts in `doc/system/`
- generated unified reference in `doc/bwSYSTEM.md`
- deterministic assembly via `doc/system/BUILD.sh`
