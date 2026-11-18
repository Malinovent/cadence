// SyncClient backed by supabase-js: email + password and Google / Apple auth, the cadence_state row, the push_state RPC.
import {
  isAuthApiError,
  isAuthRetryableFetchError,
  type Session,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { parsePro } from "../lib/earlyBird";
import type { CadenceData } from "../lib/model";
import { supabase } from "./client";
import {
  SyncError,
  type RawRow,
  type SyncClient,
  type SyncErrorKind,
  type SyncSession,
} from "./engine";

const toSession = (s: Session | null): SyncSession | null =>
  s ? { userId: s.user.id, email: s.user.email ?? null } : null;

const RATE_LIMITS = ["over_email_send_rate_limit", "over_request_rate_limit"];
const KNOWN: Record<string, SyncErrorKind> = {
  invalid_credentials: "bad_credentials",
  email_not_confirmed: "not_confirmed",
  weak_password: "weak_password",
};

/** What a supabase-js auth error means for the person (exported for tests). */
export const authError = (e: unknown): SyncError => {
  const message = e instanceof Error ? e.message : String(e);
  if (isAuthRetryableFetchError(e)) return new SyncError("network", message);
  if (isAuthApiError(e)) {
    if (e.status === 429 || RATE_LIMITS.includes(e.code ?? ""))
      return new SyncError("rate_limited", message);
    const kind = KNOWN[e.code ?? ""];
    if (kind) return new SyncError(kind, message);
  }
  return new SyncError("failed", message);
};

// PostgREST reports a failed fetch as status 0
const dbError = (error: { message: string }, status: number): SyncError =>
  new SyncError(status === 0 ? "network" : "failed", error.message);

const toRow = (r: unknown): RawRow => {
  const rec = (typeof r === "object" && r !== null ? r : {}) as {
    data?: unknown;
    updated_at?: unknown;
  };
  const updatedAt =
    typeof rec.updated_at === "string" ? Date.parse(rec.updated_at) : NaN;
  if (!Number.isFinite(updatedAt))
    throw new SyncError("failed", "sync: server row has no valid updated_at");
  return { data: rec.data, updatedAt };
};

export function createSupabaseSyncClient(sb: SupabaseClient): SyncClient {
  return {
    async getSession() {
      const { data, error } = await sb.auth.getSession();
      if (error) throw authError(error);
      return toSession(data.session);
    },
    onAuthChange(cb) {
      // supabase-js advises against awaiting its own calls inside this callback; defer instead
      const { data } = sb.auth.onAuthStateChange((event, s) => {
        setTimeout(() => cb(toSession(s), event === "PASSWORD_RECOVERY"), 0);
      });
      return () => data.subscription.unsubscribe();
    },
    async signInPassword(email, password) {
      const { data, error } = await sb.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw authError(error);
      const s = toSession(data.session);
      if (!s)
        throw new SyncError("failed", "sync: no session after signing in");
      return s;
    },
    async signUp(email, password, redirectTo) {
      // with "Confirm email" on, no session yet; an email that already has an account gets the
      // same answer (Supabase sends nothing), so the form can't be used to find out who has one
      const { error } = await sb.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) throw authError(error);
    },
    async sendReset(email, redirectTo) {
      const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (error) throw authError(error);
    },
    async setPassword(password) {
      const { error } = await sb.auth.updateUser({ password });
      if (error) throw authError(error);
    },
    async signInWith(provider, redirectTo) {
      // leaves the page; supabase-js reads the session from the URL when the provider sends us back
      const { error } = await sb.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });
      if (error) throw authError(error);
    },
    async isPro() {
      // read-own RLS: the only row this can see is the signed-in email's
      const { data, error, status } = await sb
        .from("entitlements")
        .select("*")
        .maybeSingle();
      // no entitlements table yet (supabase/schema.sql not run since Pro): the server doesn't ask
      // for Pro either, so sync carries on as before rather than stopping for everyone
      if (error && (error.code === "PGRST205" || error.code === "42P01"))
        return true;
      if (error) throw dbError(error, status);
      return parsePro(data);
    },
    async signOut() {
      // local scope: works offline, only this device signs out
      const { error } = await sb.auth.signOut({ scope: "local" });
      if (error) throw authError(error);
    },
    async deleteAccount() {
      const { error, status } = await sb.rpc("delete_my_account");
      if (error) throw dbError(error, status);
    },
    async pull(userId) {
      const { data, error, status } = await sb
        .from("cadence_state")
        .select("data, updated_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw dbError(error, status);
      return data ? toRow(data) : null;
    },
    async push(data: CadenceData, updatedAt) {
      const res = await sb.rpc("push_state", {
        p_data: data,
        p_updated_at: new Date(updatedAt).toISOString(),
      });
      if (res.error) throw dbError(res.error, res.status);
      const rows: unknown[] = Array.isArray(res.data) ? res.data : [res.data];
      if (!rows[0])
        throw new SyncError("failed", "sync: push_state returned no row");
      return toRow(rows[0]);
    },
  };
}

// null when Supabase isn't configured (local-only build)
export const syncClient: SyncClient | null = supabase
  ? createSupabaseSyncClient(supabase)
  : null;
