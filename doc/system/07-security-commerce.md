# 7. Security & Commerce Model

## Public Security Narrative

The site positions BDS around:

- passkey authentication
- Stripe-hosted checkout
- Ed25519-signed admin actions
- private infrastructure segmentation
- fail-closed governance

These are presented most clearly on the homepage, `security.html`, and `docs/store_security_architecture_v_1.md`.

## Important Implementation Boundary

In this repo, those items are largely documentation and positioning statements today. The checked-in website code does not yet implement:

- passkey registration/authentication
- Stripe checkout session creation
- webhook receipt and verification
- signed admin gateway verification logic

That means the security model is currently architectural intent plus site messaging, not a full production commerce stack.

## Commerce Posture

The public store posture is intentionally bounded:

- licensed software and services only
- no card handling on the website itself
- legal terms already scaffolded
- store flow currently routes buyers into a simple licensing page plus contact-based purchase coordination until Stripe Payment Links are enabled

This is a reasonable sequence for a repo that is still establishing brand and trust surfaces first.
