// Sign-in first (JP, 2026-11-17): when opening the app shows the sign-in page. Pure.
export type SignInGate = {
  configured: boolean; // accounts exist in this build (Supabase set up)
  ready: boolean; // the saved session is known: no flash before it is
  signedIn: boolean;
  skipped: boolean; // "Continue without an account" on this device
  recovery: boolean; // arrived from a "choose a new password" link
};

export const shouldShowSignIn = (g: SignInGate): boolean =>
  g.configured && g.ready && (g.recovery || (!g.signedIn && !g.skipped));
