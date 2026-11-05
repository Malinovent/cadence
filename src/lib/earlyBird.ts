// S1.11 Early-bird badge: when the signed-in email has `early_bird = true` in the
// `entitlements` table (set by the pre-sale webhook, read-own RLS), show a small badge and a
// thank-you in Settings. No feature gating yet.
//
// The answer is remembered on the device for that email, so the badge shows offline and
// doesn't flicker on launch; a fresh answer from the server always wins.

/** The entitlements row as PostgREST returns it, or null when there is none. */
export const parseEarlyBird = (row: unknown): boolean =>
  typeof row === "object" && row !== null && (row as { early_bird?: unknown }).early_bird === true;

/** Emails are stored lower-cased in `entitlements`. */
export const entitlementEmail = (email: string): string => email.trim().toLowerCase();

/** The remembered answer applies only to the same email. */
export const cachedEarlyBird = (cachedEmail: string | null, email: string | null): boolean =>
  !!email && !!cachedEmail && cachedEmail === entitlementEmail(email);
