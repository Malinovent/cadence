// S1.7 Welcome back: after 7+ days without an edit, offer to start this week fresh from a
// template. One tap builds the week; "Not now" leaves everything as it was.
//
// "Without an edit" is judged from the last edit time this device knew when the app opened
// (or a later one pulled from the account: an edit on another device counts), never from
// automatic changes made after opening, such as tasks coming back from blocks that ended.

export const WELCOME_DAYS = 7;
const DAY_MS = 86_400_000;

export type WelcomeInput = {
  lastEdit: number; // ms epoch; 0 = never edited (a new user, nothing to welcome back to)
  now: number;
  dismissedFor: number | null; // the lastEdit the prompt was last answered for, on this device
  templates: number; // the person's templates plus the built-in starter weeks (S1.8)
};

export const shouldWelcome = ({ lastEdit, now, dismissedFor, templates }: WelcomeInput): boolean =>
  lastEdit > 0 && now - lastEdit >= WELCOME_DAYS * DAY_MS && dismissedFor !== lastEdit && templates > 0;

/** Honest about what a tap replaces: "It replaces the 4 blocks in Week 1." (nothing when it's empty) */
export const replaceNote = (blocksInWeek1: number): string | null =>
  blocksInWeek1 === 0
    ? null
    : `It replaces the ${blocksInWeek1 === 1 ? "block" : `${blocksInWeek1} blocks`} in Week 1.`;
