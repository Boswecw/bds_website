# 1. Overview & Philosophy

## Purpose

`bds_website` is the public marketing surface for Boswell Digital Solutions. It presents:

- company positioning
- Forge applications and platform framing
- services and advisory work
- systems architecture thought surface
- a security-first posture
- a future commerce surface for licensed software and services
- legal pages for terms, privacy, refund, and EULA

## Current Delivery Model

The site is implemented as static HTML/CSS with a minimal inline JavaScript layer on the homepage. It is intentionally simple:

- no framework runtime in production pages
- no client-side state management library
- no active checkout flow yet
- no authenticated customer area yet

This keeps the public surface easy to inspect and cheap to ship while the brand, copy, and governance posture are still being refined.

## Information Architecture

The current public IA separates the commercial lanes intentionally:

- `Products` is the buyer entry point for applications
- `Services` is the entry point for consulting and delivery work
- `Forge` explains the platform philosophy behind Forge-branded applications
- `Architecture` is the authority lane for principles, papers, and future-system previews
- `Store` remains available as a licensing surface, but it is not a top-level nav item

## Product Philosophy

The presentation model is consistent across the repo:

- governance-first before feature-first
- dark, controlled visual language instead of trend-driven startup styling
- security claims framed as architecture, not marketing garnish
- accessible, low-complexity public navigation
- clear distinction between what exists now and what is planned

## Scope Boundaries

This repository currently covers the website shell and supporting documentation. It does not yet contain:

- implemented Stripe checkout flows
- passkey registration or login code
- server-side webhook handling
- product detail pages beyond `authorforge.html`

Those capabilities are described in planning docs, but they are not present in this repo as executable website features today.
