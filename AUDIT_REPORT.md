# BDS Website Audit Report

## Commands Run

```bash
bun install
bun run dev
rg -n "products/(forgecommand|authorforge|vibeforge)\.html" index.html
curl -sS -o /dev/null -w '%{http_code} %{url_effective}\n' http://127.0.0.1:35401/index.html
curl -sS -o /dev/null -w '%{http_code} %{url_effective}\n' http://127.0.0.1:35401/products.html
curl -sS -o /dev/null -w '%{http_code} %{url_effective}\n' http://127.0.0.1:35401/store.html
curl -sS -o /dev/null -w '%{http_code} %{url_effective}\n' http://127.0.0.1:35401/security.html
curl -sS -o /dev/null -w '%{http_code} %{url_effective}\n' http://127.0.0.1:35401/about.html
curl -sS -o /dev/null -w '%{http_code} %{url_effective}\n' http://127.0.0.1:35401/contact.html
curl -sS -o /dev/null -w '%{http_code} %{url_effective}\n' http://127.0.0.1:35401/legal/terms.html
curl -sS -o /dev/null -w '%{http_code} %{url_effective}\n' http://127.0.0.1:35401/legal/privacy.html
curl -sS -o /dev/null -w '%{http_code} %{url_effective}\n' http://127.0.0.1:35401/legal/refund.html
curl -sS -o /dev/null -w '%{http_code} %{url_effective}\n' http://127.0.0.1:35401/legal/eula.html
curl -sS -o /dev/null -w '%{http_code} %{url_effective}\n' http://127.0.0.1:35401/src/js/site.js
curl -sS -o /dev/null -w '%{http_code} %{url_effective}\n' http://127.0.0.1:35401/src/assets/images/bds-logo.png
curl -sS -o /dev/null -w '%{http_code} %{url_effective}\n' http://127.0.0.1:35401/src/styles/global.css
/snap/bin/chromium --headless --disable-gpu --dump-dom http://127.0.0.1:35401/index.html
/snap/bin/chromium --headless --disable-gpu --dump-dom http://127.0.0.1:35401/products.html
/snap/bin/chromium --headless --disable-gpu --dump-dom http://127.0.0.1:35401/legal/terms.html
```

## Issues Found

### Critical

- Mobile navigation was broken on every non-home page because the mobile CSS hid `.site-header__nav` below `768px`, but only `index.html` had the menu toggle button and nav JS.
- `bun run dev` was broken because the repo used `bun --serve .`, which does not start a working static server in this environment.
- `index.html` and the homepage footer linked to non-existent product detail pages under `products/*.html`.

### High

- Homepage HUD code mixed nav and HUD logic inline, which would have caused duplicate nav behavior once shared nav JS was introduced.
- HUD logic assumed all required nodes existed and lacked a zero-focusable guard inside the focus trap.

### Medium

- Legal pages and non-home pages loaded shared CSS but did not share the same interactive header contract, causing desktop/mobile behavior drift.
- Required verification depended on an escalated local server context because the sandbox would not allow port binding.

### Low

- `bun install` removed the empty tracked `bun.lock`; it was restored to keep the worktree stable.

## Fixes Applied

- Added a minimal reusable static dev server at [dev-server.ts](/home/charlie/Forge/websites/bds_website/dev-server.ts) and updated [package.json](/home/charlie/Forge/websites/bds_website/package.json) so `bun run dev` now starts a local server.
- Added shared mobile-nav behavior in [src/js/site.js](/home/charlie/Forge/websites/bds_website/src/js/site.js). It handles menu toggle, `aria-expanded`, `Escape` close, close-on-link-click, and desktop reset on resize.
- Updated the header markup on all public and legal pages to include the shared menu button, `id="main-nav"`, and the shared script:
  - [index.html](/home/charlie/Forge/websites/bds_website/index.html)
  - [products.html](/home/charlie/Forge/websites/bds_website/products.html)
  - [store.html](/home/charlie/Forge/websites/bds_website/store.html)
  - [security.html](/home/charlie/Forge/websites/bds_website/security.html)
  - [about.html](/home/charlie/Forge/websites/bds_website/about.html)
  - [contact.html](/home/charlie/Forge/websites/bds_website/contact.html)
  - [legal/terms.html](/home/charlie/Forge/websites/bds_website/legal/terms.html)
  - [legal/privacy.html](/home/charlie/Forge/websites/bds_website/legal/privacy.html)
  - [legal/refund.html](/home/charlie/Forge/websites/bds_website/legal/refund.html)
  - [legal/eula.html](/home/charlie/Forge/websites/bds_website/legal/eula.html)
- Removed dead homepage/footer links by redirecting the three product-detail links to [products.html](/home/charlie/Forge/websites/bds_website/products.html) in [index.html](/home/charlie/Forge/websites/bds_website/index.html).
- Kept HUD behavior on [index.html](/home/charlie/Forge/websites/bds_website/index.html), but narrowed the inline script to HUD-only logic and added guards for safer open/close/focus-trap behavior.
- Restored the empty [bun.lock](/home/charlie/Forge/websites/bds_website/bun.lock) after the required install step deleted it.

## Verification Notes

- `bun install` completed successfully.
- `bun run dev` succeeded outside the sandbox and served the site at `http://127.0.0.1:35401` during verification.
- All required routes returned `200` over the local server:
  - `/index.html`
  - `/products.html`
  - `/store.html`
  - `/security.html`
  - `/about.html`
  - `/contact.html`
  - `/legal/terms.html`
  - `/legal/privacy.html`
  - `/legal/refund.html`
  - `/legal/eula.html`
- Shared assets returned `200`, including `src/js/site.js`, `src/styles/global.css`, and `src/assets/images/bds-logo.png`.
- Headless Chromium successfully executed and dumped the served DOM for:
  - `/index.html`
  - `/products.html`
  - `/legal/terms.html`
- Every audited HTML page contains exactly one `<h1>`.
- No remaining `products/*.html` dead links were found in the checked-in HTML.

## Remaining Risks / TODOs

- I verified real page loads and shared-asset delivery, but I did not perform full browser automation of click interactions on every route. Mobile-nav correctness is based on shared markup/script parity plus direct code-path inspection, with real browser execution checked on representative pages.
- The secondary pages are still under-construction placeholders, so the site remains content-light outside the homepage.
- The HUD still exists only on `index.html`, which is consistent with the current design but should stay documented if the site expands.
