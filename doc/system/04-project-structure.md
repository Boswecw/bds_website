# 4. Project Structure

## Top-Level Map

```text
bds_website/
├── about.html
├── contact.html
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
    ├── qc/stateforge.ts
    └── stateforge/
```

## Folder Roles

- `src/styles/` holds the actual reusable presentation system.
- `docs/` contains planning and reference material that informed the implementation.
- `doc/system/` is the maintained modular system reference.
- `tools/` contains governance and QC support code.

## Structural Observations

- Product detail links referenced from the homepage point to pages that do not exist in this repo yet.
- There is no `public/` directory in the checked-in structure despite the README describing one as a future/static asset area.
- Shared page chrome is repeated directly in HTML files rather than abstracted behind includes or templates.
