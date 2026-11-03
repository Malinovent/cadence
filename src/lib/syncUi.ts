// Sync UI wording and colours (SPEC "Phase 4 design: sync" → "UI"). Pure; no React.
import type { AuthResult, SyncStatus } from "../sync/engine";

export type AuthFailure = Exclude<AuthResult, { ok: true }>["reason"];
export type SignedInStatus = Exclude<SyncStatus, "local">;

// header pill: label + dot colour
export const STATUS_BADGE: Record<SignedInStatus, { label: string; dot: string }> = {
  synced: { label: "synced", dot: "#1FA98A" },
  syncing: { label: "syncing…", dot: "#C9A227" },
  offline: { label: "offline", dot: "#cabfb2" },
  error: { label: "sync error", dot: "#b54" },
};

// null when signed out ("local"): nothing to show
export const statusBadge = (s: SyncStatus): { label: string; dot: string } | null =>
  s === "local" ? null : STATUS_BADGE[s];

// Settings, signed in. "error" has no sentence in the SPEC; it reuses the offline one (data is safe locally either way).
export const statusSentence = (s: SyncStatus): string | null => {
  switch (s) {
    case "synced":
      return "Everything's synced.";
    case "syncing":
      return "Saving changes…";
    case "offline":
      return "Offline. Changes are saved on this device and will sync later.";
    case "error":
      return "Couldn't reach your account. Changes are saved on this device and will sync later.";
    default:
      return null;
  }
};

export const authErrorMessage = (reason: AuthFailure): string => {
  switch (reason) {
    case "invalid_code":
      return "That code didn't work. Try again or ask for a new one.";
    case "rate_limited":
      return "Too many emails for now. Try again in an hour.";
    case "offline":
      return "You're offline. Connect and try again.";
    default:
      return "Something went wrong. Try again.";
  }
};

// basic shape check only: something@something.tld, no spaces
export const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

// the 6-digit code from the email
export const isValidCode = (code: string): boolean => /^\d{6}$/.test(code.trim());

// A data change that left the document clean came from the server (store.applyRemote), not a user edit:
// user edits always bump meta.updatedAt past syncedAt.
export const isRemoteApply = (prevData: unknown, nextData: unknown, nextMeta: { updatedAt: number; syncedAt: number | null }) =>
  prevData !== nextData && nextMeta.syncedAt === nextMeta.updatedAt;
