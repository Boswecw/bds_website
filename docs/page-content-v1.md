# BDS Website Page Content v1

All content below is final copy for implementation into HTML pages.
Follows wireframe structure from bds_website_pages_wireframes_v_1.md.

---

## products.html

### Page Header
Title: Products
Subtitle: Governance-first tools built on shared production infrastructure. Every product in the Forge ecosystem enforces auditable authority chains and fail-closed defaults.

### Product Cards

**ForgeCommand** (Badge: Beta)
Tauri-based operations dashboard with five autonomous monitoring agents: Monitoring, Diagnostics, Remediation, Analytics, and Report. Provides 24/7 automated infrastructure oversight. Governance-aware HUD with deterministic blocker ordering and Tier-0 emergency halt semantics.

**AuthorForge** (Badge: Roadmap)
AI-assisted creative writing platform designed for authors who demand control over their process and output. Built on the same governed execution model as every Forge product. Your work stays yours.

**VibeForge** (Badge: Launching 2026)
AI-assisted development environment with governed execution pipelines, auditable build chains, and integrated context management. Powered by DataForge, NeuroForge, and ForgeAgents backend infrastructure.

**WebSafe** (Badge: Planned)
Online safety tool for families and organizations. Content filtering and monitoring with privacy-respecting architecture.

### Shared Infrastructure Section
Heading: Built on shared infrastructure
Text: Every Forge product shares a common backend: DataForge for authoritative data storage, NeuroForge for AI orchestration, and ForgeAgents for governed tool execution. Consistent security posture, unified audit trails, and no duplicated risk surfaces.

HUD Suggestions: "Recommend a product for my needs" | "Compare ForgeCommand and VibeForge" | "What is on the roadmap?"

---

## store.html

### Page Header
Title: Store
Subtitle: Licensed software and services from Boswell Digital Solutions.

### Trust Strip
Stripe-hosted checkout (no card data stored) | Passkey authentication supported | Clear refund policy | Digital delivery after purchase

### Product Grid

**ForgeCommand License** (Badge: Available) - Coming Soon
Full operations dashboard with autonomous monitoring agents, governance-aware HUD, and Tier-0 emergency controls.

**VibeForge License** (Badge: Pre-order) - Coming Soon
AI-assisted development environment with governed execution pipelines. Launching January 2026. Reserve your license.

**Consulting Services** (Badge: Available) - Contact for Quote
Governance architecture review, AI infrastructure consulting, and implementation guidance. 16 years of federal service experience.

**AuthorForge License** (Badge: Planned) - TBD
Creative writing platform license. Release date TBD.

### Policies Strip
Heading: Purchase with confidence
- All payments processed through Stripe hosted checkout
- We never store credit card information on our servers
- Digital products delivered immediately after purchase
- See our Refund Policy for return conditions
- License terms available before purchase

HUD Suggestions: "Help me pick the right license" | "What is included with ForgeCommand?" | "Show me the refund policy"

---

## security.html

### Page Header
Title: Security Architecture
Subtitle: Security at BDS is architecture, not afterthought. Every system boundary, authentication flow, and administrative action is designed with defense-in-depth principles.

### Section 1: Customer Authentication
Your identity is protected by modern, phishing-resistant authentication.

**Passkeys (FIDO2 / WebAuthn):** Primary authentication method. Cryptographic credentials stored on your device. No passwords to steal, no phishing vectors.

**Two-Factor Authentication:** TOTP-based fallback for devices without passkey support. Backup codes available for account recovery.

**Session Protection:** httpOnly, Secure, SameSite=Strict cookies. Sessions cannot be accessed by client-side scripts or cross-site requests.

**Rate Limiting:** All public endpoints rate-limited with bot protection against credential stuffing and brute force attacks.

### Section 2: Payment Processing
We never touch your card data. Period.

**Stripe Hosted Checkout:** All payment processing on Stripe PCI-compliant infrastructure. Card details entered on Stripe servers, never ours.

**No Card Storage:** We store only Stripe reference IDs (customer ID, payment intent ID, session ID). No card numbers, CVVs, or billing details ever reach our servers.

**Webhook Verification:** Every payment event cryptographically verified through Stripe webhook signatures before order fulfillment.

**Order Source of Truth:** Orders marked paid only on Stripe webhook confirmation. Client-side success pages are informational only.

### Section 3: Administrative Control Plane
Administrative actions are cryptographically authenticated and fully audited. There is no public admin interface.

**No Public Admin UI:** Administrative functions not accessible from public internet. No admin login page to attack.

**Ed25519 Signed Requests:** Every administrative action requires cryptographic signature from ForgeCommand. Headers include key ID, timestamp, nonce, and signature over canonical request string including body SHA256.

**Admin Gateway:** Dedicated gateway verifies signatures, enforces 5-minute timestamp windows, checks nonce uniqueness, maintains strict route allowlist before forwarding to private admin API.

**Private Admin API:** Runs as Render Private Service. Not reachable from public internet. Only the gateway can reach it.

**Audit Logging:** Every administrative action logged with action type, operator identity, timestamp, and affected resources.

### Section 4: Security Zones Diagram
Zone A Public Customer Surface (Internet-Exposed): Customer registration/login, Passkey auth, Session management, Stripe Checkout sessions, Webhook endpoint (signature verified), Rate limiting/bot protection.

Zone B Admin Control Plane (Private): ForgeCommand to Admin Gateway (Ed25519 verified), Gateway to Private Admin API, Refunds/product/order management, Account security actions, Governance event logging.

### Section 5: Data Handling
Heading: What We Store and What We Do Not

We store: Account credentials (passkey public keys, TOTP secrets if enrolled), Order records (product, price, status, Stripe reference IDs), Session tokens (server-side, httpOnly), Audit logs (administrative actions).

We do NOT store: Credit card numbers or CVVs, Billing addresses (Stripe handles this), Passwords (passkeys are passwordless), Browsing behavior or analytics beyond basic server logs.

### Section 6: Security Principles
**Fail-closed:** If a security check cannot be completed, access is denied. Never fail open.
**Defense-in-depth:** Multiple independent security layers. Compromise of one layer does not compromise the system.
**Least privilege:** Every service, key, and credential has minimum permissions necessary.
**Authority separation:** Customer identity issuance completely separate from administrative control. ForgeCommand cannot issue customer tokens, bypass 2FA, or impersonate customers.
**Audit everything:** Every security-relevant action produces an immutable audit record.

HUD Suggestions: "Explain passkeys" | "How does the admin gateway work?" | "What data do you store about me?"

---

## about.html

### Page Header
Label: About BDS
Title: Governance-first infrastructure, built by someone who has operated it.

### Section 1: What We Build
Boswell Digital Solutions builds AI-powered tools on production-grade infrastructure with fail-closed governance, cryptographic authority, and auditable decision chains. Every product in the Forge ecosystem enforces the same principles that govern critical federal infrastructure: if it is not authorized, it does not execute.

### Section 2: How We Build

**Governance-First:** Every state transition requires authorization. The system defaults to deny. Human authority sits above autonomous behavior at every decision point.

**Fail-Closed:** When something goes wrong (missing data, failed validation, ambiguous state) the system stops and surfaces the problem. We never paper over uncertainty with assumptions.

**Evidence and Traceability:** Decisions are backed by evidence. Changes are versioned. Authority chains are auditable. If it is not in DataForge, it did not happen.

**Production from Day One:** No prototypes promoted to production. Infrastructure is built to production standards from the first commit: tested, documented, and governed.

### Section 3: Who Is Behind This
Boswell Digital Solutions LLC is a Service-Disabled Veteran-Owned Small Business (SDVOSB) founded by a U.S. Navy veteran with submarine qualifications and 16 years of federal service with the U.S. Forest Service.

That federal career included Type III Incident Command on wildland fire incidents, Type II Contracting Officer Representative oversight, and Qualified Security Manager responsibilities. These are roles where governed execution, chain-of-command authority, and auditable decision-making are not theoretical preferences. They are operational requirements.

The Forge ecosystem is built on that experience. Not as metaphor, but as architecture.

### Section 4: SDVOSB
Heading: Service-Disabled Veteran-Owned Small Business
BDS is registered as a Service-Disabled Veteran-Owned Small Business. This designation reflects both the founder military service and the business commitment to accountability, discipline, and mission focus that define veteran-owned operations.

CTAs: Contact Us | View Our Security Architecture

HUD Suggestions: "Summarize BDS in one paragraph" | "What does SDVOSB mean?" | "Tell me about the Forge ecosystem"

---

## contact.html

### Page Header
Title: Contact
Subtitle: Have a question, need a quote, or want to discuss a project? We would like to hear from you.

### Contact Options

**Email:** contact@boswelldigital.com
**Response Time:** We respond to all inquiries within 1 to 2 business days.

### Contact Form Fields
- Name (required)
- Email (required)
- Subject (select: General Inquiry, Product Question, Consulting, Partnership, Support)
- Message (required, textarea)
- Submit button: Send Message

Note below form: Your message is sent directly to our team. We do not use chatbots for initial support responses.

HUD Suggestions: "Draft a message to BDS" | "What consulting services do you offer?"

---

## legal/privacy.html

### Title: Privacy Policy
Effective Date: To be set at launch

**Information We Collect:** When you create an account, we collect your email address and passkey credential data (public key only). When you make a purchase, Stripe collects payment information on their servers. We receive only reference IDs (customer ID, payment intent ID). We collect basic server logs (IP address, request path, timestamp) for security and operational purposes.

**How We Use Information:** Account information authenticates you and manages purchases. Stripe reference IDs track order status and process refunds. Server logs used for security monitoring, rate limiting, and troubleshooting.

**Third Parties:** We use Stripe for payment processing. Stripe privacy policy governs their handling of payment data. We do not sell, rent, or share personal information with other third parties. We do not use advertising networks or tracking pixels.

**Cookies:** We use httpOnly session cookies for authentication. These cookies cannot be accessed by JavaScript and are required for the site to function. No advertising cookies, analytics cookies, or third-party tracking cookies.

**Data Retention:** Account data retained while account is active. Order records retained for legal and tax compliance. Server logs retained for 90 days then deleted. You may request deletion by contacting us.

**Your Rights:** Request access to, correction of, or deletion of personal data at any time: contact@boswelldigital.com.

**Changes:** Registered users notified of material changes via email.

---

## legal/terms.html

### Title: Terms of Service
Effective Date: To be set at launch

**Acceptance:** By accessing or using boswelldigital.com or any BDS products, you agree to these terms.

**Accounts:** You are responsible for maintaining security of account credentials, including passkey devices. Notify us immediately of unauthorized access.

**Products and Licenses:** Software products are licensed, not sold. Each product governed by specific license agreement (EULA). License terms presented before purchase.

**Payments:** All payments processed through Stripe. Prices listed in USD. We reserve the right to change pricing with notice to existing customers.

**Refunds:** Governed by our Refund Policy. Review before purchasing.

**Intellectual Property:** All BDS products, content, and branding are property of Boswell Digital Solutions LLC. Do not reproduce, distribute, or reverse engineer without written permission.

**Limitation of Liability:** Products provided as-is. No guarantee of uninterrupted service or fitness for particular purpose. Liability limited to amount paid for product in question.

**Termination:** We may suspend or terminate accounts that violate these terms. You may close your account at any time.

**Governing Law:** Laws of the Commonwealth of Kentucky.

**Contact:** contact@boswelldigital.com

---

## legal/refund.html

### Title: Refund Policy
Effective Date: To be set at launch

**Software Licenses:** Digital software licenses may be refunded within 14 days of purchase if not activated or used beyond initial installation. Submit requests to contact@boswelldigital.com with order number.

**Consulting Services:** May be cancelled before work begins for full refund. Once work commenced, refunds prorated based on work completed. Clear accounting provided before processing partial refund.

**Subscriptions:** May be cancelled at any time. Cancellation takes effect at end of current billing period. No prorated refunds for partial billing periods.

**Processing:** Refunds processed through Stripe, typically appearing within 5 to 10 business days. Issued to original payment method.

**Exceptions:** We reserve right to deny requests showing evidence of abuse (repeated purchase-and-refund patterns, license key sharing).

**Contact:** contact@boswelldigital.com with order number and reason.

---

## legal/eula.html

### Title: End User License Agreement
Effective Date: To be set at launch

**Grant of License:** Boswell Digital Solutions LLC grants a non-exclusive, non-transferable, revocable license to use purchased software in accordance with these terms.

**License Types:**

Single-User License: Installation and use on up to two devices owned or controlled by licensee. Not for shared, team, or organizational use.

Team License: Use by number of seats purchased within single organization. Each seat represents one individual user.

Enterprise License: Custom terms negotiated per agreement. Contact us.

**Restrictions:** Do not: reverse engineer, decompile, or disassemble the software; redistribute, sublicense, or share license keys; use software to build competing products; remove or alter proprietary notices or branding.

**Updates:** License includes updates and patches for major version purchased. Major version upgrades may require additional purchase or upgrade fee.

**Termination:** License terminates automatically on violation. Destroy all copies upon termination.

**Warranty Disclaimer:** Software provided as-is without warranty of any kind.

**Limitation of Liability:** BDS not liable for indirect, incidental, special, or consequential damages. Total liability shall not exceed amount paid for the license.

**Governing Law:** Commonwealth of Kentucky.

**Contact:** contact@boswelldigital.com
