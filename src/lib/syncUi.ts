// Sync UI wording and colours (SPEC "Phase 4 design: sync" → "UI"). Pure; no React.
import type { AuthResult, SyncStatus } from "../sync/engine";
import { LIB_EN, type LibWords } from "./words";

export type AuthFailure = Exclude<AuthResult, { ok: true }>["reason"];
export type SignedInStatus = Exclude<SyncStatus, "local">;

// header pill: dot colour (the label comes from the words)
const DOT: Record<SignedInStatus, string> = {
  synced: "#1FA98A",
  syncing: "#C9A227",
  offline: "#cabfb2",
  error: "#b54",
  locked: "#cabfb2",
};

// null when signed out ("local"): nothing to show
export const statusBadge = (
  s: SyncStatus,
  w: LibWords = LIB_EN,
): { label: string; dot: string } | null =>
  s === "local" ? null : { label: w.sync.badge[s], dot: DOT[s] };

// Settings, signed in. "error" has its own sentence (data is safe locally either way).
export const statusSentence = (
  s: SyncStatus,
  w: LibWords = LIB_EN,
): string | null => (s === "local" ? null : w.sync.sentence[s]);

export const authErrorMessage = (
  reason: AuthFailure,
  w: LibWords = LIB_EN,
): string => w.sync.auth[reason] ?? w.sync.auth.failed;

/**
 * Google and Apple sign-in (JP, 2026-11-17), shown only once each is set up in Supabase:
 * VITE_AUTH_PROVIDERS="google,apple" (either one, any order). Unknown names are ignored.
 */
export const authProviders = (
  v: string | undefined,
): ("google" | "apple")[] => {
  const on = new Set((v ?? "").split(",").map((s) => s.trim().toLowerCase()));
  return (["google", "apple"] as const).filter((p) => on.has(p));
};

// basic shape check only: something@something.tld, no spaces
export const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

/** Passwords: at least 8 characters (the same minimum is set in Supabase). */
export const PASSWORD_MIN = 8;
export const isValidPassword = (password: string): boolean =>
  password.length >= PASSWORD_MIN;

// A data change that left the document clean, under a new edit time, came from the server
// (store.applyRemote). User edits bump meta.updatedAt past syncedAt; automatic changes
// (store.adjust) keep updatedAt as it was.
export const isRemoteApply = (
  prev: { data: unknown; updatedAt: number },
  nextData: unknown,
  nextMeta: { updatedAt: number; syncedAt: number | null },
) =>
  prev.data !== nextData &&
  nextMeta.updatedAt !== prev.updatedAt &&
  nextMeta.syncedAt === nextMeta.updatedAt;
