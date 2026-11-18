// The intro page (new people) waits for the sign-in page and, right after signing in, for the
// account's weeks to come down, so someone on a new device goes straight to their week. Pure.
export type IntroGate = {
  intro: boolean; // judged new on opening this device
  signInShown: boolean;
  ready: boolean; // the saved session is known
  signedIn: boolean;
  syncing: boolean; // asking about Pro or pulling the account's copy
};

export const shouldShowIntro = (g: IntroGate): boolean =>
  g.intro && !g.signInShown && g.ready && !(g.signedIn && g.syncing);
