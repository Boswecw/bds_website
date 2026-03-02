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
