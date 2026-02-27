# BDS Website — Page Content Implementation Prompt
# Use with Claude Sonnet in VS Code

You are implementing page content for the BDS (Boswell Digital Solutions) website. The project is a static HTML/CSS site at `/Forge/websites/bds_website/`.

## Context Files (read these first)
- `docs/page-content-v1.md` — All page copy organized by page. This is your primary content source.
- `docs/bds_website_pages_wireframes_v_1.md` — Wireframe structure for every page.
- `docs/bds_design_system_color_tokens_v_1.md` — Color system, spacing, typography rules.
- `docs/store_security_architecture_v_1.md` — Technical details for the security page.
- `src/styles/tokens.css` — CSS custom properties (design tokens).
- `src/styles/global.css` — Base styles, button/card/badge components, grid system.
- `src/styles/header.css` — Header with logo image.
- `src/styles/footer.css` — Footer styles.
- `src/styles/hud.css` — HUD dock and panel styles.
- `src/styles/pages/home.css` — Homepage-specific styles (reference for section patterns).
- `index.html` — Fully built homepage. Use as the structural template for all pages.

## Task
Implement full HTML content for these pages, replacing the stub placeholder content:

1. `products.html` — Product overview with 4 cards + shared infrastructure section
2. `store.html` — Store with trust strip, 4 product cards, policies strip
3. `security.html` — Full security architecture page (6 sections + diagram)
4. `about.html` — Mission, principles, background, SDVOSB sections
5. `contact.html` — Contact info + form
6. `legal/privacy.html` — Privacy policy (full text)
7. `legal/terms.html` — Terms of service (full text)
8. `legal/refund.html` — Refund policy (full text)
9. `legal/eula.html` — License agreement (full text)

## Implementation Rules

### Structure
- Every page MUST include: skip link, full header with logo and nav, main content, full footer, HUD dock with page-specific suggestions, mobile nav toggle, and all scripts from index.html.
- Copy the header, footer, HUD dock, and script blocks directly from `index.html`.
- Root-level pages use `src/styles/...` paths. Legal pages use `../src/styles/...` paths.
- Root-level pages link to `products.html`, `store.html`, etc. Legal pages use `../products.html` etc.
- Add `site-header__nav-link--active` class to the current page nav link.

### Styles
- Use existing CSS classes from `global.css` (`.section`, `.container`, `.grid`, `.grid-2`, `.grid-3`, `.card`, `.badge`, `.btn`, `.btn-primary`, `.btn-ghost`, `.trust-strip`, `.trust-item`, `.divider`).
- Use existing homepage classes where patterns repeat (product cards, security diagram, badges).
- Create new page-specific CSS files at `src/styles/pages/{pagename}.css` only when needed.
- All pages import: `global.css`, `header.css`, `footer.css`, `hud.css`, plus any page-specific CSS.
- Follow design tokens strictly. No hardcoded colors. No inline color styles.

### Design System Compliance
- Dark navy backgrounds only (`--bg-primary`, `--bg-surface`).
- Orange (`--accent`) for CTAs and interactive elements only. Use sparingly.
- Section alternation: alternate between `--bg-primary` and `--bg-surface` backgrounds.
- 96px section spacing (`--space-12` / `.section` class).
- 6px border radius (`--radius`).
- No gradients, no glow, no decorative noise.
- Minimum contrast ratio 4.5:1. Primary text on navy exceeds 7:1.
- All interactive elements must have visible focus states.
- Use `aria-labelledby` on sections with headings. Use `aria-label` on diagrams.

### Accessibility
- Skip link: `<a href="#main" class="skip-link">Skip to main content</a>`
- Semantic HTML: `<main id="main">`, `<section>`, `<article>`, `<nav>`, `<aside>`.
- Form fields need `<label>` elements with `for` attributes.
- Required fields marked with `aria-required="true"`.
- SVG icons need `aria-hidden="true"` on decorative ones.

### HUD Dock
- Every page gets page-specific HUD suggestion buttons.
- Suggestions are listed in `docs/page-content-v1.md` per page.
- Replace the suggestion button text in the HUD panel body.

### Content
- All copy comes from `docs/page-content-v1.md`. Do not invent content.
- Legal pages use a single-column readable layout (max-width 720px).
- Legal pages use `<h2>` for section titles, `<p>` for body text.
- Contact form is HTML only (no backend). Use `action="#"` and `method="post"`.

### Security Page Special Notes
- Include the Zone A / Zone B security diagram matching the homepage pattern.
- Expand it with more detail per `docs/page-content-v1.md` Section 4.
- The security principles section should use a distinct visual treatment (e.g., left-border accent like the diagram zones).

## Execution Order
1. Create any needed page-specific CSS files first.
2. Build `products.html` (closest to homepage pattern).
3. Build `store.html` (similar card grid + trust strip).
4. Build `security.html` (most complex, multiple sections).
5. Build `about.html` (text-heavy, simpler layout).
6. Build `contact.html` (form + contact info).
7. Build all 4 legal pages (similar single-column layout, batch them).
8. Verify all nav links work across pages (relative paths).

## Quality Checks
After implementation, verify:
- [ ] Every page has consistent header/footer/HUD
- [ ] Active nav link highlighted on each page
- [ ] Legal page paths use `../` prefix correctly
- [ ] No hardcoded colors (all via CSS variables)
- [ ] Contact form has proper labels and required attributes
- [ ] HUD suggestions are page-specific
- [ ] Section backgrounds alternate between primary and surface
- [ ] All external links open in new tab with `rel="noopener noreferrer"`
- [ ] Mobile responsive (grid collapses, nav toggles)
