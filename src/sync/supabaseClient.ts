// SyncClient backed by supabase-js: email OTP auth, the cadence_state row, the push_state RPC.
import { isAuthApiError, isAuthRetryableFetchError, type Session, type SupabaseClient } from "@supabase/supabase-js";
import type { CadenceData } from "../lib/model";
import { supabase } from "./client";
import { SyncError, type RawRow, type SyncClient, type SyncSession } from "./engine";

const toSession = (s: Session | null): SyncSession | null =>
  s ? { userId: s.user.id, email: s.user.email ?? null } : null;

// `invalid` is what a 4xx means for this call (a bad code when verifying, a bad email when sending)
const authError = (e: unknown, invalid: "invalid_code" | "failed"): SyncError => {
  const message = e instanceof Error ? e.message : String(e);
  if (isAuthRetryableFetchError(e)) return new SyncError("network", message);
  if (isAuthApiError(e)) {
    if (e.status === 429 || e.code === "over_email_send_rate_limit") return new SyncError("rate_limited", message);
    if (e.status >= 400 && e.status < 500) return new SyncError(invalid, message);
  }
  return new SyncError("failed", message);
};

// PostgREST reports a failed fetch as status 0
const dbError = (error: { message: string }, status: number): SyncError =>
  new SyncError(status === 0 ? "network" : "failed", error.message);

const toRow = (r: unknown): RawRow => {
  const rec = (typeof r === "object" && r !== null ? r : {}) as { data?: unknown; updated_at?: unknown };
  const updatedAt = typeof rec.updated_at === "string" ? Date.parse(rec.updated_at) : NaN;
  if (!Number.isFinite(updatedAt)) throw new SyncError("failed", "sync: server row has no valid updated_at");
  return { data: rec.data, updatedAt };
};

export function createSupabaseSyncClient(sb: SupabaseClient): SyncClient {
  return {
    async getSession() {
      const { data, error } = await sb.auth.getSession();
      if (error) throw authError(error, "failed");
      return toSession(data.session);
    },
    onAuthChange(cb) {
      // supabase-js advises against awaiting its own calls inside this callback; defer instead
      const { data } = sb.auth.onAuthStateChange((_event, s) => {
        setTimeout(() => cb(toSession(s)), 0);
      });
      return () => data.subscription.unsubscribe();
    },
    async sendCode(email, redirectTo) {
      const { error } = await sb.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
      });
      if (error) throw authError(error, "failed");
    },
    async verifyCode(email, code) {
      const { data, error } = await sb.auth.verifyOtp({ email, token: code, type: "email" });
      if (error) throw authError(error, "invalid_code");
      const s = toSession(data.session);
      if (!s) throw new SyncError("failed", "sync: no session after verifying the code");
      return s;
    },
    async signOut() {
      // local scope: works offline, only this device signs out
      const { error } = await sb.auth.signOut({ scope: "local" });
      if (error) throw authError(error, "failed");
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
      const res = await sb.rpc("push_state", { p_data: data, p_updated_at: new Date(updatedAt).toISOString() });
      if (res.error) throw dbError(res.error, res.status);
      const rows: unknown[] = Array.isArray(res.data) ? res.data : [res.data];
      if (!rows[0]) throw new SyncError("failed", "sync: push_state returned no row");
      return toRow(rows[0]);
    },
  };
}

// null when Supabase isn't configured (local-only build)
export const syncClient: SyncClient | null = supabase ? createSupabaseSyncClient(supabase) : null;
