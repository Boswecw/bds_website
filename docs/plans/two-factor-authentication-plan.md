# Account Security — Two-Factor Authentication Plan

**Status:** Phases 1–3 implemented (enrollment, sign-in challenge, session gating, backup-authenticator recovery, ForgeCustomer-side AAL2 enforcement). Phase 4b implemented (ForgeCustomer admin endpoint, Forge_Command "Require MFA" operator action, bds_website error-handling fix) — see §10. Phase 4a remains not started, blocked on Sentinel infrastructure that doesn't exist yet.
**Depends on:** Supabase project Auth settings only for phase 1; no server-managed session rewrite required to ship enrollment + sign-in challenge
**Primary surface:** `login.html`, `account.html`, `src/js/forge/*` (this repo). Phase 3 enforcement touches ForgeCustomer (Rust/Axum) and is **not built here**.

---

## 1. Goal

Let a customer turn on TOTP-based two-factor authentication for their BDS account, and require a verification code at sign-in once they have. Ship this without waiting on the full server-managed-session rewrite that the CSSA Sentinel security plan schedules for "Wave 6" — MFA can land as a client-side Supabase Auth feature today, ahead of that rewrite.

## 2. Current state

Confirmed against the code, not the aspirational docs:

- Auth is 100% client-side Supabase Auth. `src/js/forge/supabase.js:6` imports `@supabase/supabase-js@2.45.0` from `esm.sh` (CDN ESM, not an npm package — the repo has no `dependencies` at all in `package.json`).
- `login.html` + `src/js/forge/login.js` drive sign-up, password sign-in (`signInWithPassword`, line 87), and magic-link sign-in (`signInWithOtp`, line 127). There is no TOTP/MFA call anywhere in the repo — the only `otp` hit is that magic-link call, which is passwordless email sign-in, not a second factor.
- `src/js/forge/session.js`'s `bootstrapSession()` is the single gate every authenticated page calls before touching ForgeCustomer. This is the natural enforcement point for a client-side AAL check.
- There is **no server-managed session**: no cookie, no CSRF token, no JWT verification in this repo. `server/forge.ts` and `server/hud.ts` forward the browser's bearer token as-is; `server/security/http.ts:363` only regex-validates the `Bearer <token>` shape. ForgeCustomer is the only party that verifies the Supabase JWT.
- `doc/store_security_architecture_v_1.md` describes passkeys-as-primary with "TOTP + backup codes" as a fallback — that is a different, unimplemented FastAPI architecture, not the shipped stack. Treat it as directional intent only.
- The CSSA Sentinel plan set (`docs/plans/BDS_Website_CSSA_Sentinel_Security_Plan_Set_2026-06-12/…`) bundles MFA into Wave 6 (`11_IMPLEMENTATION_ROADMAP.md`, epic `BDS-SEC-060`) alongside the full server-session redesign, and expects an "MFA result" Sentinel event (`09_SENTINEL_INTEGRATION_PLAN.md:59`) and an operator "require MFA" action in Forge_Command (`10_FORGE_COMMAND_INCIDENT_EXPERIENCE.md`). None of that is scoped as standalone, shippable work — this document is that scoping. That plan set is hash-sealed (see its `MANIFEST.md`) and is not edited here; this is a new, independent plan that cross-references it.

## 3. The core decision: use Supabase's native TOTP MFA

Because Supabase *is* the identity provider here (not a backend we own), the pragmatic choice is `supabase-js`'s built-in `auth.mfa` API rather than hand-rolled TOTP:

- `auth.mfa.enroll({ factorType: 'totp' })` returns a QR code as an inline SVG `data:` URI plus the raw secret — no QR-rendering library needed, and no new dependency at all (this repo has zero npm dependencies today; adding a TOTP/QR library would be the first one).
- The CSP already allows this: `server/security/http.ts:45` sets `img-src 'self' data:`, so the enrollment QR renders with no CSP change.
- Supabase stores and verifies the TOTP secret and factor state itself (in its own `auth` schema) — no new table, migration, or secret storage in this repo or in ForgeCustomer.
- `auth.mfa.getAuthenticatorAssuranceLevel()` gives `{ currentLevel, nextLevel }`; comparing them after any sign-in (password, magic link, or an existing persisted session) is how the client knows a challenge is outstanding.

This confines phase 1 entirely to `src/js/forge/*` and `login.html`/`account.html` — no ForgeCustomer change, no new backend.

## 4. Scope & non-goals

In scope (this plan):

- TOTP authenticator-app enrollment, verification, and sign-in challenge.
- Client-side session gating via `bootstrapSession()`.
- A recovery path for a lost device.

Out of scope (explicitly not this plan):

- SMS/phone-based factors (cost, and weaker than TOTP — don't add it).
- WebAuthn/passkeys — that is `docs/store_security_architecture_v_1.md`'s separate, larger architecture change and should stay its own plan.
- The server-managed session/cookie/CSRF rewrite (Wave 6) — not a prerequisite for phases 1–2 here.
- Making MFA mandatory for all accounts — ship opt-in first; mandating it (e.g. for accounts with an active subscription, or for Forge_Command operator accounts) is a product decision, not an engineering default. Flagged as an open question below.
- Authoritative server-side enforcement (rejecting an AAL1-only token for an MFA-enabled account) — that has to live in ForgeCustomer or Supabase RLS, not in this repo. See §9.

## 5. Enrollment flow (`account.html`)

Add a new `forge-section` between **Profile** (`account.html:64`) and **Subscription** (`account.html:69`) — security settings belong next to identity, ahead of billing:

```html
<section class="forge-section" aria-labelledby="account-2fa-heading">
  <h2 id="account-2fa-heading">Two-factor authentication</h2>
  ...
</section>
```

New module `src/js/forge/mfa.js`, following the existing thin-wrapper pattern in `supabase.js`:

- `listFactors()` → wraps `auth.mfa.listFactors()`, used to render current state (no factor / pending / verified) and drive the section's UI.
- `enrollTotp()` → wraps `auth.mfa.enroll({ factorType: 'totp' })`, returns the QR `data:` URI, the manual-entry secret, and the new `factorId`.
- `verifyEnrollment(factorId, code)` → wraps `auth.mfa.challenge({ factorId })` then `auth.mfa.verify({ factorId, challengeId, code })`. A factor is only "active" after this succeeds — an unverified enrollment must not count as MFA-enabled.
- `unenroll(factorId)` → wraps `auth.mfa.unenroll({ factorId })`, gated behind a re-entered password or a fresh challenge (see step-up note in §9) so a hijacked-but-still-open tab can't silently turn MFA off.

UI flow: "Set up" → show QR + manual secret + a single code input → on verify success, show the recovery guidance from §8 → section now shows "Enabled" with a "Remove" action and the enrollment date.

## 6. Sign-in challenge flow (`login.js`, `session.js`)

Two entry points need the same post-auth AAL check; the check itself belongs in one shared helper in `mfa.js` (`hasPendingChallenge()`, wrapping the `currentLevel !== nextLevel` comparison) so the logic isn't duplicated:

- **Password sign-in** (`login.js:82-104`): after `signInWithPassword` succeeds and a session exists (line 94), call `hasPendingChallenge()` before `finishSignIn()`. If a challenge is pending, swap the form in place to a "Enter your 6-digit code" step — same single-page pattern the file already uses for the signin/signup mode toggle (`login.js:31-34`) — rather than introducing a second page. Only call `finishSignIn()` (which provisions ForgeCustomer and redirects) after `auth.mfa.verify` succeeds.
- **Magic link** (`login.js:114-141` for the request; the redemption itself happens on whatever page `emailRedirectTo` lands on, via `detectSessionInUrl: true` in `supabase.js:25`): there is no `finishSignIn()`-equivalent callback to hook here, so the check has to happen in `bootstrapSession()` (`session.js:23`) — the one place every authenticated page already funnels through. If `hasPendingChallenge()` is true, redirect to `login.html?next=<original>&mfa=1` instead of provisioning, and have `login.html` render the same code-entry step directly (skipping password/magic-link UI) when `mfa=1` is present and a session already exists.
- **Already-open tab with a stale session**: `onAuthStateChange` (`supabase.js:59`) should also re-check AAL on `TOKEN_REFRESHED`/`SIGNED_IN` events so a long-lived tab can't keep operating past a revoked or newly-required factor.

Rate-limit and generically-error the code-verification step the same way `07_AUTH_SESSION_CSRF_AND_ACCOUNT_SECURITY.md §7` already requires for password sign-in (progressive delay, no distinction between "wrong code" and "expired challenge" in the copy shown to the user).

## 7. Recovery & lost-device handling

**Decided and implemented:** the backup-authenticator path, the zero-new-infra option. Supabase's TOTP MFA does not ship built-in one-time recovery codes as of the pinned client version, so this repo doesn't wait on that — `account.js`'s MFA section lists every verified factor (not just one) and offers "Add backup authenticator" whenever at least one factor already exists, using the same enrollment flow as the first factor. At sign-in, `mfa.js`'s `verifyAnyFactor()` tries the submitted code against each enrolled factor in turn, so the challenger doesn't need to know or pick which authenticator produced it.

What's still a manual process, not code in this repo: a user who loses access to *every* enrolled authenticator has no self-service path. That's support-assisted removal — a human, via existing account-support channels, calls `unenroll` after verifying identity out-of-band. There's no admin surface in this repo to build that against; it's an operational process today, and the "generate real recovery codes" option from the original draft of this section remains available later if support-assisted reset proves too slow in practice (would need a small table somewhere — a new Supabase table guarded by RLS, or a ForgeCustomer-owned one — so treat it as its own follow-on, not a quick add).

"Reset a customer's MFA" should still be logged and auditable once there's a support surface to do it from — this is the same capability `10_FORGE_COMMAND_INCIDENT_EXPERIENCE.md` and `13_OPERATIONS_RUNBOOKS_AND_RECOVERY.md` already assume exists for incident response ("require MFA" / "reset 2FA enrollment").

## 8. What the user sees, once

On successful enrollment, show (once, not stored client-side): "Add a second authenticator as a backup in case you lose access to this one." (Implemented as the enabled-state copy in `account.js`'s `renderMfaEnabled`, shown whenever exactly one factor exists.) Contacting support remains the only path once *all* factors are lost.

## 9. Enforcement boundary — what this repo can and can't guarantee

Everything in §5–§7 is a **client-side UX gate** by itself. A modified or bypassed client could skip the challenge step entirely and still hold a valid AAL1 Supabase session — the gate is not a security boundary on its own, the same way `bootstrapSession()`'s existing auth check isn't.

**Decided and implemented (`forgecustomer` PR #16):** ForgeCustomer now rejects an AAL1 (or missing-`aal`) token for any account it's been told has MFA enabled, via a new `customer_profiles.mfa_required` column checked in `CustomerContext::require_active()`. The remaining design question was never "can ForgeCustomer check the `aal` claim" (trivial) but "how does ForgeCustomer learn an account has MFA enabled at all" without either trusting a client-supplied flag naively (an attacker with just a stolen password could otherwise report "disabled" and defeat the protection) or standing up a whole new Supabase Admin API integration to independently poll `auth.mfa_factors`. The answer that shipped needs neither: `POST /v1/account/mfa-status` records the flag, but requires the caller's *own current* token already be at `aal2` to call it at all — since Supabase only issues `aal2` after a real TOTP challenge succeeds, a stolen-password-only attacker can never produce one. This repo's side of that: `account.js`'s `renderMfa()` — called on every page load and again right after any enroll/unenroll — compares the real Supabase factor count against `GET /v1/account`'s `mfa_required` field and calls `forge.setMfaStatus()` to reconcile on any mismatch, fire-and-forget. A failed sync doesn't block or roll back the local Supabase-side change and doesn't stay stuck — enforcement lags only until the next time the account page is visited, not until another enroll/unenroll happens.

The RLS-policy alternative from the original draft of this section (`auth.jwt()->>'aal'` policies on BDS-owned tables) wasn't needed — the account/subscription/license data ForgeCustomer protects lives in its own Postgres, authorized in its Rust application layer, not through RLS-gated PostgREST access the way the HUD threads are.

## 10. Phase 4 scoping: operations hookup

Phase 4 was named in §12 as "Sentinel telemetry, Forge_Command operator actions," pointing at the aspirational plan's `09_SENTINEL_INTEGRATION_PLAN.md` and `10_FORGE_COMMAND_INCIDENT_EXPERIENCE.md`. Per the same rule the rest of this document follows, those describe *intended* architecture, not evidence of what `forgesentinel` or `forge_command` actually contain. This section is that verification, done directly against both repos' code (`boswell-digital-solutions/forgesentinel` @ `42f0e23`, `boswell-digital-solutions/forge_command` @ `c686cdb`), plus a scope for what's actually buildable now.

The two halves turn out to be almost entirely independent — different repos, different blockers, different payoff timelines — so this splits phase 4 into **4a** and **4b** rather than treating it as one unit.

### 4a — Sentinel telemetry ingestion of MFA events

**Current state.** `forgesentinel` is a real, tested TypeScript codebase (`package.json:1-28` — v0.1.0, zero runtime dependencies; the README claims 67 tests across 14 files) but it is **not a running or network-reachable service**. There is no HTTP server, no listener of any kind, and no Dockerfile or deployment artifact anywhere in the repo. Its own status doc says so directly: `docs/sentinel/implementation-status.md:16` marks "Forge_Command incident surface" **not started**, and line 23 marks "Production hardening" **not started**. Storage is a local append-only JSONL file (`src/spine/ledger.ts:44-61`) plus in-memory `Map`/`Set` state — there is no database.

Event ingestion exists only as an in-process method, `EventGateway.ingest(rawEvent, credential)` (`src/spine/gateway.ts:43-118`), callable from code in the same Node process or via a CLI that replays a local `.jsonl` file. **There is no endpoint for ForgeCustomer or bds_website to call over the network** — building one means adding a transport (HTTP or queue) around `ingest()` from scratch; that's foundational Sentinel-side work, not a small addition on top of something that already exists.

The event taxonomy is closer to ready than the transport is: `identity.mfa.challenged` and `identity.mfa.completed` already exist as canonical, allow-listed event types (`src/contracts/families.ts:14`), in the `identity` family, which doesn't require event-level signatures (only `billing/license/cssa/sentinel/operator/hermes/smith` do — `families.ts:28`). But **neither type is ever emitted, consumed, or given a payload schema anywhere in the repo** — they're unused placeholders. The MFA-related logic that *is* exercised end-to-end runs the other direction: Sentinel's policy engine recommending, and its mock `IdentityAuthority` executing, an **outbound** `identity.mfa.require` action against a compromised account (`src/intel/prime.ts:183,203`, `src/authority/policy.ts:33`, `src/authority/executor.ts:7-8,15,30-32,94-98,147-150`). That's a naming coincidence with 4b's operator action, not a shared implementation or an existing integration point — the executor is a mock entirely internal to this repo's own test suite; it never calls Forge_Command, ForgeCustomer, or anything outside itself. It's also not the inbound "MFA result" telemetry event this section is about — that direction has no working example anywhere in the repo.

Producer authentication is explicitly interim: HMAC-SHA256 against an in-memory `ProducerRegistry` (`src/spine/producers.ts:11-55`), with an ADR stating plainly that Ed25519 must replace it "before any non-shadow deployment" (`docs/sentinel/adrs/ADR-026-hmac-signing-for-mvp.md:1-31`). There's no persisted credential store — the only populated registry entries are six synthetic test producers with hardcoded secrets (`src/runtime.ts:24-33`), and neither `forgecustomer` nor `bds_website` is registered anywhere. Sentinel's model is also coarser than ForgeCustomer's: no concept of AAL1 vs AAL2 or TOTP specifically anywhere in the repo — MFA is modeled only as a boolean-ish per-account set the mock authority tracks.

**What this means for scope.** Shipping 4a isn't "add a `fetch()` call from bds_website or ForgeCustomer" — it's blocked on Sentinel first shipping a real network-reachable ingestion transport, a persisted producer credential store, a production signing scheme, and real payload schemas for the two placeholder event types. All four are Sentinel-side foundational work with no dependency on this repo or ForgeCustomer, and none of it exists yet. **4a is not schedulable as concrete work from this plan today.** Revisit once Sentinel's own roadmap reaches a real ingestion surface — at that point, ForgeCustomer emitting an event after each login/challenge outcome, and bds_website emitting one after each client-side enroll/verify, would be a small addition on both sides.

### 4b — Forge_Command operator "require MFA" action

**Implemented** (`forgecustomer` PR [#19](https://github.com/Boswell-Digital-Solutions/forgecustomer/pull/19), `bds_website` PR #19, `Forge_Command` PR [#203](https://github.com/Boswell-Digital-Solutions/Forge_Command/pull/203)). The analysis below is left as written pre-implementation — it's still the accurate record of why this was built the way it was — with outcomes noted inline.

**Current state (at the time this was scoped).** Unlike Sentinel, `forge_command`'s relevant surface is real and running. It already proxies operator actions to ForgeCustomer's admin API end-to-end: a Tauri command mints a scoped EdDSA token and calls `ForgeCustomerAdminClient` (`src-tauri/src/clients/forgecustomer.rs:1-13,70-168`), and the frontend renders a reason-required confirmation dialog before calling it (`src/lib/components/commerce/CustomersPanel.svelte:176-194`, `AuthorityActionDialog.svelte`). Suspend and restore are the two live examples (`src-tauri/src/commands/forgecustomer_admin.rs:414-446,448-480`), mounted today at the `/commerce` route.

The aspirational plan's assumed integration point — an "incident" card UI — exists (`src/routes/self-healing/`), but its own README says it "ships with mock data" (`src/routes/self-healing/README.md:3,45`), and the eight incidents in `incidents.ts:86-615` are all hardcoded infrastructure failures (ingestion stalls, cert rotation, Redis pressure) — no concept of a customer-security incident, no login/credential-stuffing/account-takeover event, and no real navigation (deep-dive links show a toast, not a page). **There is nothing to plug a customer-security action into there.** The real integration point is the existing Suspend/Restore button pair in `CustomersPanel.svelte` — a "Require MFA" button belongs next to them, not in the self-healing UI.

Mechanically, the Forge_Command-side addition is a near-exact clone of the suspend/restore slice — new `OperationAction` variant, new Tauri command, new client wrapper, new store action, new button reusing the existing confirmation dialog — the same handful of files the suspend/restore pattern already touches. That part is cheap.

**The blocking dependency: ForgeCustomer had no admin-triggered MFA endpoint.** The only existing MFA-status write path was `POST /v1/account/mfa-status` (§9), deliberately self-service only — it trusts the caller's own report *because* the caller must already hold an aal2 token to call it. An operator forcing MFA onto *someone else's* account is a different capability requiring its own endpoint and its own security design — Forge_Command's half being a cheap clone didn't skip that design work.

**Shipped:** `admin::set_customer_mfa_requirement()`, mirroring `admin::suspend_customer()`/`set_customer_status()` (`forgecustomer/api/src/repositories/admin.rs:154-199,244-263`) — row-locked idempotency check against `customer_profiles.mfa_required`, update, a new `customer_mfa_history` table mirroring `customer_status_history`'s shape (its own append-only ledger, not a reuse of the status one, since a boolean flag flip isn't a `status` transition) with `actor_type = 'operator'`, an outbox event (`customer_mfa_required`/`customer_mfa_not_required`), replaying as `changed: false` — exposed behind `POST /v1/admin/customers/{id}/mfa-required` (`{ "required": bool, "reason": "..." }`), gated the same way suspend/restore already are: `operator.require_role("admin")` (`forgecustomer/api/src/routes/mod.rs:2374-2400`). The route takes `required` as a bool rather than being a fixed-direction action like suspend/restore, so a future "release the requirement" affordance is a Forge_Command-side button away, not a new ForgeCustomer endpoint.

Operator identity and roles belong on the Forge_Command side of this boundary, not ForgeCustomer's: Forge_Command's Token Authority is the one thing that mints the operator JWT in the first place, so it's the only place a real `admin`-vs-`support` distinction could ever originate — ForgeCustomer can only ever enforce whatever role claim it's handed, never invent one of its own. Today Forge_Command has **no operator-role concept at all** to hand over — `TokenClaims` carries only a caller-supplied free-form `scope` string, not a roles list (`forge_command/src-tauri/src/models/token_authority.rs:46-64`), and every existing ForgeCustomer admin action mints the identical hardcoded `scope = "admin"` (`forge_command/src-tauri/src/commands/forgecustomer_admin.rs:39-41`). Forge_Command's own governance doc confirms this is a known gap, not an oversight, and already envisions the fix living exactly there: "there is no `OperatorContext`, `OperatorRole`, or `OperatorService` implementation... whoever launches the binary has access to the Tauri command surface," with a proposed future `admin`/`operator`/`viewer` taxonomy "not currently enforced in code" (`forge_command/doc/system/40_governance/20-multi-user-support.md:1-33,156,160`). Until Forge_Command builds that, the pragmatic stopgap for 4b is to gate the new endpoint identically to suspend/restore (`admin` role required) — a stopgap forced by Forge_Command's current single-role reality, not a design decision that ForgeCustomer should own the role model itself.

**A gap this action would immediately expose, traced through the current code:** what happens to a customer whose `mfa_required` becomes `true` via this new admin path while they have **zero** enrolled TOTP factors — a state today's self-service flow can never produce (only an already-aal2 caller, meaning an already-verified factor, can set the flag on themselves), but an operator-driven flag flip could produce trivially. Tracing it through the code as it stands today:

1. `bootstrapSession()`'s gate is `hasPendingChallenge()` (`src/js/forge/mfa.js:88-95`), which reads Supabase's own `nextLevel`. With zero enrolled factors, Supabase has nothing to challenge, so `nextLevel` stays `aal1` and `hasPendingChallenge()` returns `false` — **the client-side gate doesn't detect this case at all**, regardless of ForgeCustomer's flag.
2. `bootstrapSession()`'s own `forge.provision(...)` call doesn't catch it either: `POST /v1/account/provision` is handled with `AuthUserContext`, not `CustomerContext` (`forgecustomer/api/src/routes/mod.rs:613-617`), so it carries no AAL gate — provisioning succeeds and `bootstrapSession()` returns normally.
3. The user lands on the page. The first call that does use `CustomerContext` (`GET /v1/account`, or any other customer route) hits `require_active()` → `require_aal2()` and 403s with `MFA_REQUIRED`.
4. `errors.js`'s `describeForgeError` has no case for `MFA_REQUIRED` (`src/js/forge/errors.js:91-115` only special-cases `CUSTOMER_SUSPENDED` and `REVOKED` under 403) — it falls through to the generic branch, which signs the user out and redirects to `/account/closed.html`, telling them their account is **closed**.

That's a real bug this feature would have shipped with unless it was designed around: an operator using "Require MFA" on a never-enrolled account would lock that customer out with a message telling them their account was closed, not that they need to set up 2FA.

**Shipped (`bds_website` PR #19):** `describeForgeError` now has an explicit `MFA_REQUIRED` case — no redirect, no sign-out, an inline message telling the customer to go set it up. Deliberately *not* a redirect to `account.html`: on that page specifically, `renderAccount()`/`renderSubscriptions()`/`renderLicenses()`/`renderInstallations()`/`renderUsage()` all run in parallel and would each hit this same 403 before the MFA card (which never errors here — `listFactors()` is a Supabase call, not a ForgeCustomer one) gets a chance to render, so a redirect back to the same page risks a reload loop. And deliberately no sign-out: fixing this requires *staying* signed in long enough to reach enrollment. A proactive `bootstrapSession()` check (single clean redirect before any section renders, instead of the inline message potentially showing on more than one section) was considered and set aside — it would need ForgeCustomer to also expose `mfa_required` on the provision response to avoid an extra network round-trip, which was judged a bigger change than this cosmetic improvement justified on top of a fix that already closes the real bug everywhere it could occur.

### Scope & non-goals for phase 4

In scope, if/when this is picked up:

- **4b**: a new ForgeCustomer admin endpoint to set `mfa_required` on another account (role-gated, audited, idempotent, mirroring suspend/restore); the corresponding Forge_Command command/UI; and closing the zero-factor gap in bds_website's error handling — all landing together, since 4b is what makes the gap reachable. **✅ Implemented** — see above.
- **4a**: re-scope once Sentinel has a real ingestion transport — not before.

Out of scope (explicitly, for now):

- Any automated closed loop where Sentinel itself invokes "require MFA" without a human clicking a button in Forge_Command — that's Sentinel's own "unified operations" gate, marked not started in its own status doc, and a policy question (should software unilaterally change a customer's security posture?) bigger than this plan.
- A `support`-vs-`admin` role split for this action — real per-operator roles have to be built in Forge_Command (its Token Authority is the only place that could ever mint one), not invented on ForgeCustomer's side. That's Forge_Command's own already-envisioned `OperatorContext`/`OperatorRole` work (`20-multi-user-support.md`); out of scope here.
- Generated TOTP recovery codes, SMS factors, WebAuthn — unchanged from §4, still out of scope.

## 11. Security checklist

- Never expose factor existence (enrolled vs. not) to an unauthenticated request — only to the account owner's own authenticated `listFactors()` call.
- Unenrolling a factor and enrolling a *replacement* are sensitive actions — apply the same step-up/recent-auth window `07_AUTH_SESSION_CSRF_AND_ACCOUNT_SECURITY.md §6` defines for "MFA/passkey change."
- Generic, identical error copy for "wrong code" vs "expired challenge" vs "too many attempts."
- Progressive delay / lockout on repeated failed verification attempts, mirroring the existing password-attempt guidance in the same plan's §7.
- Audit-log enroll, verify, unenroll, and any support-assisted reset, with actor (self vs. support) recorded.
- No secret, QR payload, or recovery material ever logged server-side or sent to Sentinel/telemetry.

## 12. Phasing

1. **Enrollment + challenge (this repo only). ✅ Implemented.** `mfa.js`, `account.html` section, `login.js` inline challenge step, `bootstrapSession()` AAL check.
2. **Recovery path. ✅ Implemented** (the backup-authenticator half — see §7). Support-assisted removal for a total lockout stays a manual process; generated recovery codes remain a possible future escalation, not scheduled.
3. **Cross-repo enforcement. ✅ Implemented** (`forgecustomer` PR #16 — see §9). ForgeCustomer now fails closed on AAL1 for any account it's been told has MFA enabled.
4. **Operations hookup** (§10), split into two independent sub-phases. **4b — Forge_Command "require MFA" operator action. ✅ Implemented** (`forgecustomer` PR #19, `bds_website` PR #19, `Forge_Command` PR #203). **4a — Sentinel telemetry ingestion.** Still blocked on Sentinel infrastructure that doesn't exist yet — not schedulable.

## Open questions

- Is project-level MFA already enabled in the Supabase Auth dashboard for this project, or does that need to be turned on first? (Still unverified from either repo — needs a manual check against the real project.)
- Should MFA ever be mandatory (all accounts, or just accounts with an active subscription / stored payment method / Forge_Command operator role)? Product decision, not engineering default — shipped as opt-in only.
- Confirm the exact `auth.mfa` method shapes against the pinned `@supabase/supabase-js@2.45.0` release before relying on them further — this plan described the well-established API surface but wasn't checked against that exact version's changelog, and phase 1/2 shipped on that assumption.
- ~~The `POST /v1/account/mfa-status` sync (§9) is best-effort with no retry/reconciliation...~~ **Resolved.** `GET /v1/account` now echoes `mfa_required` (`forgecustomer`, small follow-on to PR #16), and `account.js`'s `renderMfa()` compares it against the real Supabase factor count on every page visit, self-healing via a fire-and-forget `setMfaStatus` call on mismatch. This also let the explicit post-enroll/post-remove sync calls in `startMfaEnrollment`/`renderMfaEnabled` be deleted — reconciliation on the `renderMfa()` call already made right after both now covers the immediate case too, not just past drift. Still not instant (only checked when the account page is visited), but no longer permanently stuck if a single sync call fails.
- Is 4a worth building at all, even once Sentinel has a real ingestion transport? ForgeCustomer already writes an audited outbox/history record for every MFA-status change and every admin action (§10). A bespoke Sentinel event is only additive once Sentinel has detection logic that would actually consume it — worth re-justifying the value, not just the mechanics, before investing in it.
- Should Sentinel's event model ever gain AAL1/AAL2 or TOTP-specific granularity, or does its existing coarse per-account boolean stay sufficient? Sentinel's own detection logic doesn't reason about AAL today, so there's no evidence yet that a finer model is needed.
- ~~4b's zero-enrolled-factor gap (§10): an operator setting `mfa_required` on an account with no factors currently 403s the user out to `/account/closed.html` with the wrong message...~~ **Resolved** (`bds_website` PR #19) — see §10.
- Forge_Command building real per-operator identity/roles (`OperatorContext`/`OperatorRole`, per its own governance doc's deferred design) is a prerequisite for any admin/support split on the ForgeCustomer admin surface generally, not just for 4b's "require MFA" action — every admin route ForgeCustomer exposes today has this same single-role limitation. That's Forge_Command's roadmap item to pick up; not something this plan or ForgeCustomer should work around.

### First steps for implementation

1. ~~Confirm the Supabase project's MFA (TOTP) feature is enabled in its Auth settings.~~ Still worth a manual check against the real project before announcing the feature — this repo can't verify that itself.
2. ~~Build `src/js/forge/mfa.js` and the `account.html` enrollment section (§5).~~ Done.
3. ~~Add the inline challenge step to `login.js` and the AAL check to `bootstrapSession()` (§6).~~ Done.
4. ~~Decide and document the §7 recovery path.~~ Done — backup authenticator, implemented.
5. ~~Coordinate with ForgeCustomer on AAL-aware enforcement (§9).~~ Done — `forgecustomer` PR #16 plus this repo's `forge.setMfaStatus` calls in `account.js`.
6. ~~Next up: phase 4 (Sentinel telemetry, Forge_Command operator actions) — lower priority until there's real usage to observe. The sync-reliability open question above is worth a look before that.~~ Done — sync-reliability resolved, phase 4 scoped and 4b implemented (§10): ForgeCustomer's `mfa-required` admin endpoint (`forgecustomer` PR #19), the Forge_Command "Require MFA" command/UI (`Forge_Command` PR #203), and the `errors.js` fix for the zero-factor gap (`bds_website` PR #19). 4a stays blocked until Sentinel ships a real ingestion transport.
