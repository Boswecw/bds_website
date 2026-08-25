// Thin wrapper around Supabase's built-in TOTP MFA API. Supabase stores and
// verifies factors itself (in its own `auth` schema) — there is no factor
// state, secret, or recovery material anywhere in this repo or ForgeCustomer.
// See docs/plans/two-factor-authentication-plan.md for the design this
// implements.

import { getSupabase } from "./supabase.js";

/** Verified TOTP factors on the current account (usually 0 or 1, but a user
 *  may enroll a backup authenticator). */
export async function listFactors() {
  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) {
    throw error;
  }
  return (data?.totp ?? []).filter((factor) => factor.status === "verified");
}

/** Begin enrolling a new TOTP factor. Returns the QR code (an inline SVG
 *  `data:` URI — no QR-rendering library needed) and the manual-entry
 *  secret. The factor is not active until `verifyCode` succeeds against it. */
export async function enroll() {
  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
  if (error) {
    throw error;
  }
  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
  };
}

/** Verify a 6-digit code against a factor — used both to confirm a fresh
 *  enrollment and to complete a sign-in challenge. */
export async function verifyCode(factorId, code) {
  const supabase = await getSupabase();
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId,
  });
  if (challengeError) {
    throw challengeError;
  }
  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });
  if (verifyError) {
    throw verifyError;
  }
}

/** Remove a factor (e.g. the user disabling 2FA, or cleaning up an
 *  abandoned enrollment they didn't finish). */
export async function unenroll(factorId) {
  const supabase = await getSupabase();
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) {
    throw error;
  }
}

/** True when the session is authenticated but the account has a verified
 *  factor requiring step-up to AAL2 that hasn't happened yet this session. */
export async function hasPendingChallenge() {
  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) {
    return false;
  }
  return data.nextLevel === "aal2" && data.currentLevel !== data.nextLevel;
}
