import { useEffect, useMemo, useRef, useState } from "react";
import type { CadenceStore } from "../state/store";
import {
  createSyncEngine,
  type AuthResult,
  type ConflictChoice,
  type OAuthProvider,
  type SyncClient,
  type SyncEngine,
  type SyncState,
} from "./engine";
import { syncClient } from "./supabaseClient";

export type SyncActions = {
  /** Signs in with an email and password. */
  signIn(email: string, password: string): Promise<AuthResult>;
  /** Creates an account; it signs in once the email is confirmed. */
  signUp(email: string, password: string): Promise<AuthResult>;
  /** Emails a link to choose a new password. */
  sendReset(email: string): Promise<AuthResult>;
  /** Saves a new password (after the reset link). */
  setPassword(password: string): Promise<AuthResult>;
  /** Google or Apple: leaves the page and comes back signed in. */
  signInWith(provider: OAuthProvider): Promise<AuthResult>;
  /** Asks again whether this email has Pro. */
  recheckPro(): void;
  /** Signs this device out; local data stays. */
  signOut(): Promise<void>;
  /** Deletes the account and its server copy; local data stays, signed out. */
  deleteAccount(): Promise<AuthResult>;
  /** Settles a first-sign-in conflict: keep this device's schedule or use the account's. */
  resolveConflict(choice: ConflictChoice): void;
};

export type UseSync = SyncState & SyncActions;

const LOCAL_ONLY: SyncState = {
  configured: false,
  ready: true,
  session: null,
  pro: null,
  status: "local",
  conflict: null,
  recovery: false,
};
const STARTING: SyncState = {
  configured: true,
  ready: false,
  session: null,
  pro: null,
  status: "local",
  conflict: null,
  recovery: false,
};
const NOT_CONFIGURED: AuthResult = { ok: false, reason: "failed" };

// Starts sync for the app's store when Supabase is configured; otherwise a local-only no-op.
export function useSync(
  store: CadenceStore,
  client: SyncClient | null = syncClient,
): UseSync {
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
      signIn: (email, password) =>
        engineRef.current?.signIn(email, password) ??
        Promise.resolve(NOT_CONFIGURED),
      signUp: (email, password) =>
        engineRef.current?.signUp(email, password) ??
        Promise.resolve(NOT_CONFIGURED),
      sendReset: (email) =>
        engineRef.current?.sendReset(email) ?? Promise.resolve(NOT_CONFIGURED),
      setPassword: (password) =>
        engineRef.current?.setPassword(password) ??
        Promise.resolve(NOT_CONFIGURED),
      signInWith: (provider) =>
        engineRef.current?.signInWith(provider) ??
        Promise.resolve(NOT_CONFIGURED),
      recheckPro: () => engineRef.current?.recheckPro(),
      signOut: () => engineRef.current?.signOut() ?? Promise.resolve(),
      deleteAccount: () =>
        engineRef.current?.deleteAccount() ?? Promise.resolve(NOT_CONFIGURED),
      resolveConflict: (choice) => engineRef.current?.resolveConflict(choice),
    }),
    [],
  );

  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
}
