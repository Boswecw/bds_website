# BDS Website — Boswell Digital Solutions

**Status:** Initial scaffold  
**Stack:** Static HTML/CSS/JS → SolidStart migration path  
**Design System:** BDS Design System v1 (Dark Navy Dominant)

## Structure

```
bds_website/
├── index.html              # Homepage
├── products.html           # Products overview
├── store.html              # Store overview
├── security.html           # Security architecture
├── about.html              # About BDS
├── contact.html            # Contact
├── src/
│   ├── styles/
│   │   ├── tokens.css      # Design system tokens
│   │   ├── global.css      # Base styles + components
│   │   ├── header.css      # Site header/nav
│   │   ├── footer.css      # Site footer
│   │   ├── hud.css         # HUD assistant dock
│   │   └── pages/
│   │       └── home.css    # Homepage sections
│   ├── components/         # Component JS (future)
│   ├── layouts/            # Layout templates (future)
│   ├── pages/              # Page modules (future)
│   └── assets/
│       └── images/
├── public/                 # Static assets
└── docs/                   # Design system docs
```

## Design Principles

- **Navy = Structure** — Deep navy backgrounds, surface elevation via lighter navy
- **Orange = Action** — Sparingly used for CTAs and interactive emphasis
- **Fail-closed governance** — HUD never mutates state, always ambient
- **WCAG 2.1 AA** — Minimum 4.5:1 contrast, keyboard navigation throughout
- **No AI aesthetic slop** — No gradients, no glow, no purple tech tones

## HUD System

The BDS Assistant HUD is an ambient right-edge dock:
- Never auto-expands
- Context-aware suggestions per page
- Keyboard navigable with focus trapping
- Polite, capable, non-intrusive tone

## Pages (Build Sequence)

1. ✅ Layout shell + design tokens
2. ✅ Homepage
3. ⬜ Products overview + product detail template
4. ⬜ Store + SKU page
5. ⬜ Stripe Checkout integration
6. ⬜ Security page
7. ⬜ About + Contact + Legal
8. ⬜ Account area (if required)
9. ⬜ HUD contextual intelligence

## SDVOSB

Boswell Digital Solutions LLC is a Service-Disabled Veteran-Owned Small Business.
