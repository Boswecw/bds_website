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
