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
- contact-page intake submission via `src/js/contact-form.js`
- shared CSS tokens and layout styles
- shared content-page styling for services, forge, architecture, security, about, contact, and store routes
- published legal policy pages for privacy, terms, refund, and EULA
- contact and legal surfaces now consistently point to the same business email address
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

1. Stripe checkout is still placeholder-level; the store currently routes into contact-based purchase coordination rather than live payment links.
2. Only AuthorForge has a dedicated detail page today; additional product pages will need the same treatment as the portfolio expands.
3. The contact form now depends on public intake-service availability; if that service is down, users fall back to business email.
4. Security and ecosystem claims can outpace implementation if future copy is not kept precise.
5. Repeated header/footer markup increases drift risk across pages.

## Maintenance Rule

When the website structure or system claims change:

1. update the relevant `doc/system/*.md` part files
2. rebuild `doc/bwSYSTEM.md`
3. keep architectural claims aligned with implemented behavior
