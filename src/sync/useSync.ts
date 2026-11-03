import { useEffect, useMemo, useRef, useState } from "react";
import type { CadenceStore } from "../state/store";
import { createSyncEngine, type AuthResult, type ConflictChoice, type SyncClient, type SyncEngine, type SyncState } from "./engine";
import { syncClient } from "./supabaseClient";

export type SyncActions = {
  /** Emails a sign-in link + 6-digit code. */
  sendCode(email: string): Promise<AuthResult>;
  /** Signs in with the 6-digit code from the email. */
  verifyCode(email: string, code: string): Promise<AuthResult>;
  /** Signs this device out; local data stays. */
  signOut(): Promise<void>;
  /** Settles a first-sign-in conflict: keep this device's schedule or use the account's. */
  resolveConflict(choice: ConflictChoice): void;
};

export type UseSync = SyncState & SyncActions;

const LOCAL_ONLY: SyncState = { configured: false, ready: true, session: null, status: "local", conflict: null };
const STARTING: SyncState = { configured: true, ready: false, session: null, status: "local", conflict: null };
const NOT_CONFIGURED: AuthResult = { ok: false, reason: "failed" };

// Starts sync for the app's store when Supabase is configured; otherwise a local-only no-op.
export function useSync(store: CadenceStore, client: SyncClient | null = syncClient): UseSync {
  const engineRef = useRef<SyncEngine | null>(null);
  const [state, setState] = useState<SyncState>(client ? STARTING : LOCAL_ONLY);

  useEffect(() => {
    if (!client) return;
    const engine = createSyncEngine({
      client,
      store,
      redirectTo: `${location.origin}${import.meta.env.BASE_URL}`,
    });
    engineRef.current = engine;
    const unsub = engine.subscribe(() => setState(engine.getState()));
    const onVisibility = () => {
      if (document.visibilityState === "visible") engine.onVisible();
    };
    const onOnline = () => engine.onOnline();
    const onOffline = () => engine.onOffline();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    engine.start();
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      unsub();
      engine.stop();
      if (engineRef.current === engine) engineRef.current = null;
    };
  }, [client, store]);

  const actions = useMemo<SyncActions>(
    () => ({
      sendCode: (email) => engineRef.current?.sendCode(email) ?? Promise.resolve(NOT_CONFIGURED),
      verifyCode: (email, code) => engineRef.current?.verifyCode(email, code) ?? Promise.resolve(NOT_CONFIGURED),
      signOut: () => engineRef.current?.signOut() ?? Promise.resolve(),
      resolveConflict: (choice) => engineRef.current?.resolveConflict(choice),
    }),
    [],
  );

  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
}
