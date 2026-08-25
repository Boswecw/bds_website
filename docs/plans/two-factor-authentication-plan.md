# Account Security — Two-Factor Authentication Plan

**Status:** Proposed — no code merged yet
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

Supabase's TOTP MFA does not ship built-in one-time recovery codes as of the pinned client version — verify current behavior against the Supabase dashboard for this project before committing to a design, but plan on one of:

- **(Recommended for v1, zero new infra)** Let a user enroll a second TOTP factor as an explicit "backup authenticator" during enrollment, and support-assisted removal (a human, via existing account-support channels, calls `unenroll` after verifying identity out-of-band) as the lost-all-devices path. Log every enroll/unenroll to whatever audit trail `07_AUTH_SESSION_CSRF_AND_ACCOUNT_SECURITY.md §7` already calls for on sensitive account changes.
- **(Phase 2, more infra)** Generate a set of single-use recovery codes ourselves at enrollment time (hashed at rest, shown once), which requires a small table somewhere — either a new Supabase table in the same project (guarded by RLS to the owning user) or a ForgeCustomer-owned one. Don't build this for v1 unless support-assisted reset proves too slow in practice.

Either way, "reset a customer's MFA" should be logged and auditable — this is the same capability `10_FORGE_COMMAND_INCIDENT_EXPERIENCE.md` and `13_OPERATIONS_RUNBOOKS_AND_RECOVERY.md` already assume exists for incident response ("require MFA" / "reset 2FA enrollment"), so building it once as a real, audited support action rather than an ad hoc database edit pays for both use cases.

## 8. What the user sees, once

On successful enrollment, show (once, not stored client-side): "Keep a backup authenticator enrolled, or contact support if you lose access to your device." Don't invent a recovery-codes UI ahead of the §7 decision.

## 9. Enforcement boundary — what this repo can and can't guarantee

Everything above is a **client-side UX gate**. A modified or bypassed client could skip the challenge step entirely and still hold a valid AAL1 Supabase session — the gate is not a security boundary by itself, the same way `bootstrapSession()`'s existing auth check isn't. Real enforcement requires one of, decided and built where the trust boundary actually is:

- ForgeCustomer rejecting requests carrying an AAL1 JWT for an account it knows has MFA enabled (ForgeCustomer already independently verifies the Supabase JWT per `doc/system/09-forgecustomer-integration.md`, so it already sees the `aal` claim) — this is a ForgeCustomer change, tracked in that repo, not here.
- Supabase-project-level RLS policies keyed on `auth.jwt()->>'aal'` for any BDS-owned table an MFA-enabled user's data lives in (the same Supabase project also backs the HUD threads per `.env.example`).

Phase 1–2 here should ship regardless — the UX gate is still real defense-in-depth and is what most users will ever hit — but this repo's PR should say explicitly that authoritative enforcement is a follow-on, cross-repo item, not silently imply it's covered.

## 10. Security checklist

- Never expose factor existence (enrolled vs. not) to an unauthenticated request — only to the account owner's own authenticated `listFactors()` call.
- Unenrolling a factor and enrolling a *replacement* are sensitive actions — apply the same step-up/recent-auth window `07_AUTH_SESSION_CSRF_AND_ACCOUNT_SECURITY.md §6` defines for "MFA/passkey change."
- Generic, identical error copy for "wrong code" vs "expired challenge" vs "too many attempts."
- Progressive delay / lockout on repeated failed verification attempts, mirroring the existing password-attempt guidance in the same plan's §7.
- Audit-log enroll, verify, unenroll, and any support-assisted reset, with actor (self vs. support) recorded.
- No secret, QR payload, or recovery material ever logged server-side or sent to Sentinel/telemetry.

## 11. Phasing

1. **Enrollment + challenge (this repo only).** `mfa.js`, `account.html` section, `login.js` inline challenge step, `bootstrapSession()` AAL check. Ships independently of everything below.
2. **Recovery path.** Land whichever option §7 settles on before phase 1 is promoted from "available" to anything resembling "expected" — don't ship enrollment without a documented, working lost-device story.
3. **Cross-repo enforcement.** Coordinate with ForgeCustomer on AAL-aware request rejection (§9). Track as a ForgeCustomer-side issue linked back here.
4. **Operations hookup.** Sentinel "MFA result" event, Forge_Command "require MFA" / "reset 2FA" operator action — once phases 1–3 exist to act on.

## Open questions

- Is project-level MFA already enabled in the Supabase Auth dashboard for this project, or does that need to be turned on first?
- Recovery path: backup-factor + support reset (v1, §7) or build recovery codes now? Needs a decision before phase 2, not during it.
- Should MFA ever be mandatory (all accounts, or just accounts with an active subscription / stored payment method / Forge_Command operator role)? Product decision, not engineering default — v1 assumes opt-in only.
- Does ForgeCustomer already parse the Supabase JWT's `aal` claim for anything today, or is §9 starting from zero on that side?
- Confirm the exact `auth.mfa` method shapes against the pinned `@supabase/supabase-js@2.45.0` release before implementation — this plan describes the well-established API surface but wasn't checked against that exact version's changelog.

### First steps for implementation

1. Confirm the Supabase project's MFA (TOTP) feature is enabled in its Auth settings.
2. Build `src/js/forge/mfa.js` and the `account.html` enrollment section (§5) behind no feature flag — it's additive and opt-in by construction.
3. Add the inline challenge step to `login.js` and the AAL check to `bootstrapSession()` (§6).
4. Decide and document the §7 recovery path before announcing the feature to customers.
