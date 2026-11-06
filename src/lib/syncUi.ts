// Sync UI wording and colours (SPEC "Phase 4 design: sync" → "UI"). Pure; no React.
import type { AuthResult, SyncStatus } from "../sync/engine";
import { LIB_EN, type LibWords } from "./words";

export type AuthFailure = Exclude<AuthResult, { ok: true }>["reason"];
export type SignedInStatus = Exclude<SyncStatus, "local">;

// header pill: dot colour (the label comes from the words)
const DOT: Record<SignedInStatus, string> = { synced: "#1FA98A", syncing: "#C9A227", offline: "#cabfb2", error: "#b54" };

// null when signed out ("local"): nothing to show
export const statusBadge = (s: SyncStatus, w: LibWords = LIB_EN): { label: string; dot: string } | null =>
  s === "local" ? null : { label: w.sync.badge[s], dot: DOT[s] };

// Settings, signed in. "error" has its own sentence (data is safe locally either way).
export const statusSentence = (s: SyncStatus, w: LibWords = LIB_EN): string | null =>
  s === "local" ? null : w.sync.sentence[s];

export const authErrorMessage = (reason: AuthFailure, w: LibWords = LIB_EN): string =>
  reason === "invalid_code" || reason === "rate_limited" || reason === "offline" ? w.sync.auth[reason] : w.sync.auth.failed;

// basic shape check only: something@something.tld, no spaces
export const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

// the numeric code from the email (Supabase sends 6–10 digits depending on project settings)
export const isValidCode = (code: string): boolean => /^\d{6,10}$/.test(code.trim());

// A data change that left the document clean, under a new edit time, came from the server
// (store.applyRemote). User edits bump meta.updatedAt past syncedAt; automatic changes
// (store.adjust) keep updatedAt as it was.
export const isRemoteApply = (
  prev: { data: unknown; updatedAt: number },
  nextData: unknown,
  nextMeta: { updatedAt: number; syncedAt: number | null },
) => prev.data !== nextData && nextMeta.updatedAt !== prev.updatedAt && nextMeta.syncedAt === nextMeta.updatedAt;
