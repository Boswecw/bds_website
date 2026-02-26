# BDS Website — Full Page Designs & Wireframes v1

Status: End-to-End Information Architecture + Page Wireframes
Theme: Dark Navy Dominant (per BDS Design System v1)
HUD: Ambient right-edge dock (expand-on-invoke)

---

# 1. Site Map (Primary)

Top-level navigation:
- Home
- Products
- Store
- Security
- About
- Contact

Secondary (footer / utility):
- Privacy Policy
- Terms
- Refund Policy
- License / EULA
- Status / Changelog (optional)

Optional account area (if you require customer accounts):
- Account
- Orders
- Downloads (if digital)
- Security Settings (passkeys / 2FA)

---

# 2. Global Layout Rules (All Pages)

## 2.1 Shell
- Max width: 1200px
- 12-column grid
- 96px vertical section spacing
- Header fixed or sticky (preferred: sticky with subtle blur)
- Footer always present

## 2.2 HUD Rules
- Right-edge dock always visible
- HUD never auto-expands
- HUD offers contextual prompts based on page
- HUD always supports keyboard navigation

## 2.3 CTA Rules
- One primary CTA per viewport section
- Secondary CTA only when needed
- No more than 3 actions visible at once

---

# 3. Page Wireframes

## 3.1 Home
Purpose: Authority + orientation + conversion to Products/Store

Wireframe blocks:
1) Hero Authority Block
- Headline
- Subtext
- Primary CTA: Explore Products
- Secondary CTA: View Security Model
- Minimal geometry right column

2) Product Preview Grid (3–4 cards)
- ForgeCommand
- AuthorForge
- (Two placeholders: "Governance Fabric" / "Automation" if needed)

3) Security Anchor Strip
- 4–6 bullets, no fluff
- CTA: "How we secure transactions"

4) Store Preview
- 3 featured items (or categories)
- CTA: Go to Store

5) Authority / Background
- Short professional block

HUD prompts:
- "Explain ForgeCommand"
- "Show me the security model"
- "Take me to the store"

---

## 3.2 Products (Overview)
Purpose: Product discovery + routing to product detail pages

Wireframe blocks:
1) Page Header
- Title: Products
- Filter/sort: Production / Beta / Roadmap

2) Product Cards Grid
Each card:
- Product name
- 1-line description
- Status badge
- CTA: View Details

3) Comparison Table (optional)
- Use cases by audience

HUD prompts:
- "Recommend a product for my needs"
- "Compare ForgeCommand vs AuthorForge"

---

## 3.3 Product Detail Page (Template)
Purpose: One product, clear value, purchase path

Wireframe blocks:
1) Header Block
- Product name
- One-sentence positioning
- Status badge
- Primary CTA: Buy / Subscribe
- Secondary CTA: Documentation (optional)

2) Key Benefits (3-column)
- Outcomes

3) Feature List
- Structured bullets

4) How It Works (diagram strip)
- Minimal line diagram

5) Security / Privacy (product-specific)
- What data is stored
- What is not stored

6) Pricing block (if not handled solely in Store)

7) FAQ

HUD prompts:
- "Give me a 60-second overview"
- "What’s required to run this?"
- "Show pricing"

---

## 3.4 Store (Overview)
Purpose: Browse products, choose SKU, begin Stripe Checkout

Wireframe blocks:
1) Store Header
- Title: Store
- Search bar (wide)
- Filters (chips): Category, License type, One-time vs Subscription

2) Category Tabs (optional)
- Software
- Services
- Add-ons

3) Product Grid
Card includes:
- Product name
- Short descriptor
- Price
- License badge
- CTA: View / Buy

4) Trust Strip (below first fold)
- Stripe Checkout
- No card storage
- Passkeys supported (if accounts)

HUD prompts:
- "Help me pick the right license"
- "What’s included?"
- "Refund policy"

---

## 3.5 Store Item Detail (SKU Page)
Purpose: Convert to purchase with clarity

Wireframe blocks:
1) SKU Header
- Name
- Price
- License type
- Primary CTA: Checkout
- Secondary CTA: Compare Licenses

2) What You Get
- Entitlements
- Support level
- Updates policy

3) Requirements
- OS, dependencies

4) Delivery
- Download link after purchase (if digital)
- Email receipt

5) Policies
- Refund policy snippet
- License / EULA snippet

HUD prompts:
- "Explain the license"
- "What happens after purchase?"

---

## 3.6 Checkout Flow
Purpose: Secure payment with minimal friction

Recommended:
- Stripe Checkout redirect

Pre-checkout step (optional page):
- Confirm SKU
- Confirm price
- Confirm policies
- CTA: Continue to Stripe

Post-checkout:
### Success Page
- Order confirmed
- Download / next steps
- Link to Orders / Account (if enabled)

### Cancel Page
- Clear return path

HUD prompts:
- "I need help with my order"
- "Show my downloads"

---

## 3.7 Security Page
Purpose: Build trust; explain architecture clearly

Wireframe blocks:
1) Security Header
- Summary statement

2) Customer Security
- Passkeys (FIDO2)
- 2FA options (TOTP fallback)
- Session protections

3) Payment Security
- Stripe hosted checkout
- Webhook verification
- No card storage

4) Admin Security
- No public admin UI
- Ed25519 signed admin control plane
- Private admin services

5) Data Handling
- What is stored
- What is not stored

HUD prompts:
- "Explain passkeys"
- "Explain admin gateway"

---

## 3.8 About Page
Purpose: Authority + legitimacy + mission

Wireframe blocks:
1) About Header
- What BDS is

2) Operating Principles
- Governance-first
- Fail-closed mindset
- Evidence and traceability (high-level)

3) Background Summary
- Credibility without oversharing

4) CTA
- Contact / Services

HUD prompts:
- "Summarize BDS in one paragraph"

---

## 3.9 Contact Page
Purpose: Simple, trustworthy communication path

Wireframe blocks:
1) Contact Header

2) Contact Options
- Email
- Contact form (minimal fields)

3) Response Expectations
- Simple SLA statement (e.g., 1–2 business days)

HUD prompts:
- "Draft a message to BDS"

---

## 3.10 Legal Pages (Footer)

### Privacy Policy
- Data collected
- Cookies
- Third parties (Stripe)
- Data retention

### Terms
- Site use terms

### Refund Policy
- Clear conditions

### License / EULA
- License terms by SKU type

HUD prompts:
- "Summarize this page"

---

# 4. Account & Orders (If You Enable Customer Accounts)

## 4.1 Account Dashboard
- Profile summary
- Security status (passkeys enabled?)
- Quick links: Orders, Downloads

## 4.2 Orders
- Order list
- Status
- Receipt links

## 4.3 Downloads (Digital)
- Entitled downloads
- Version history
- Checksums (optional)

## 4.4 Security Settings
- Register new passkey
- Remove passkey
- Enable TOTP fallback (optional)
- Backup codes management

HUD prompts:
- "Add a passkey"
- "Recover my account"

---

# 5. Component Inventory (Shared)

- Header / Nav
- Footer
- Button (Primary / Secondary / Ghost)
- Card (Product / Store SKU)
- Badge (Status / License)
- Trust Strip
- Filter chips
- Search field
- HUD Dock + HUD Panel
- Minimal diagram component (Security page)

---

# 6. Next Build Step (Implementation Sequence)

1) Layout shell + tokens
2) Home + Products + Product template
3) Store + SKU page
4) Stripe Checkout redirect + success/cancel pages
5) Security page
6) About + Contact + Legal pages
7) Account area (only if required)
8) HUD integration (context prompts + panel UI)

---

End of BDS Website Pages Wireframes v1

