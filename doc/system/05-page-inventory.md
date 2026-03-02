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
