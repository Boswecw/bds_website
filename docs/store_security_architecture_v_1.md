# Store Security Architecture — v1

## Status: Approved Direction
Stack: FastAPI + Render + Stripe + ForgeCommand (Admin Control Plane)

---

# 1. Core Security Model

Two distinct security zones:

## Zone A — Public Customer Surface (Untrusted)
Runs as: `public-api` (Render Web Service)

Responsibilities:
- Customer registration & login
- Passkey (FIDO2/WebAuthn) authentication
- Session management (httpOnly cookies)
- 2FA (Passkeys primary; TOTP optional fallback)
- Stripe Checkout session creation
- Stripe webhook endpoint (public, signature verified)
- Rate limiting + bot protection

Assumptions:
- Internet-exposed
- Hostile traffic expected
- Zero trust of client

---

## Zone B — Admin Surface (Trusted)

### admin-api (Render Private Service)
- Refunds
- Product management
- Order management
- Security actions (lock account, revoke sessions, reset 2FA)
- Audit logging

Not reachable from public internet.

---

### admin-gateway (Render Web Service)
- Verifies Ed25519 signatures from ForgeCommand
- Enforces replay protection (timestamp + nonce)
- Forwards valid requests to private admin-api

ForgeCommand connects only to admin-gateway.

---

# 2. Authentication Strategy (Customer Side)

## Primary Authentication: Passkeys (FIDO2 / WebAuthn)
Library: `python-fido2`

Endpoints:
- POST /auth/passkeys/register/options
- POST /auth/passkeys/register/verify
- POST /auth/passkeys/login/options
- POST /auth/passkeys/login/verify

Validation Rules:
- RP ID must match production domain
- Origin must match exactly
- Challenge TTL: 5 minutes
- Signature counter must increase
- Credential bound to correct user

Stored per credential:
- credential_id (bytes, unique)
- public_key
- sign_count
- transports (optional)
- created_at

Session issuance:
- httpOnly, Secure, SameSite=Strict cookie

Optional fallback:
- TOTP + backup codes

---

# 3. Stripe Integration

Payment Method: Stripe Checkout (hosted)

public-api responsibilities:
- Create checkout session
- Handle /stripe/webhook
- Verify webhook signatures
- Mark orders paid from webhook (source of truth)

Never store card data.
Store only Stripe IDs:
- stripe_customer_id
- payment_intent_id
- checkout_session_id
- price_id / product_id

---

# 4. Admin Authentication (ForgeCommand)

Authentication Method: Ed25519 Signed Requests

Headers:
- X-BDS-KeyId
- X-BDS-Timestamp
- X-BDS-Nonce
- X-BDS-Signature

Canonical string includes:
- version
- HTTP method
- path + query
- timestamp
- nonce
- body SHA256

Gateway Requirements:
- 5 minute timestamp window
- Nonce uniqueness enforced
- Signature verification with stored public key
- Strict route allowlist
- Audit log every action

ForgeCommand stores private key securely.
admin-gateway stores only public key.

ForgeCommand does NOT:
- Issue customer login tokens
- Bypass customer 2FA
- Impersonate customers

It may:
- Lock accounts
- Revoke sessions
- Reset 2FA enrollment (audited)

---

# 5. Deployment on Render

Services:

1. public-api (Web Service)
2. admin-gateway (Web Service)
3. admin-api (Private Service)

All can live in the same repository.
Separate entrypoints per service.

Security boundaries are enforced by service exposure, not repo structure.

---

# 6. Final Architecture Principle

ForgeCommand is the control plane.
Customer authentication is the public trust plane.

Authority is separated from identity issuance.
Sandboxing is defense-in-depth, not a replacement for boundary separation.

---

# Current Decision Summary

- FastAPI retained
- Stripe Checkout used
- Passkeys (FIDO2) primary customer auth
- httpOnly cookie sessions
- Ed25519 admin gateway
- Private admin-api on Render
- No admin UI exposed publicly

This is a modern, security-forward architecture appropriate for a payment-enabled site.

