// S1.9: every piece of wording the pure functions in src/lib produce, in one place, so they can
// be translated. Each function takes the words as an argument, English by default (the tests
// read English); the app passes the language the person chose (src/i18n).

export type Lang = "en" | "fr";

// S1.10 neutral week descriptions (describe.ts)
export type DescribeWords = {
  /** the durations in the sentences are written the app's one way ("2.5h" / « 2,5 h ») */
  lang: Lang;
  noTicks: (name: string) => string;
  floorMet: (name: string, done: string, min: string) => string;
  floorShort: (name: string, done: string, min: string) => string;
  ceilingWithin: (name: string, done: string, max: string) => string;
  ceilingOver: (name: string, over: string, done: string, max: string) => string;
  rangeIn: (name: string, done: string, min: string, max: string) => string;
  rangeShort: (name: string, done: string, min: string, max: string) => string;
  rangeOver: (name: string, over: string, done: string, max: string) => string;
};

export const DESCRIBE_EN: DescribeWords = {
  lang: "en",
  noTicks: (n) => `No ${n} blocks were ticked.`,
  floorMet: (n, d, min) => `${n} reached at least ${min} (${d}).`,
  floorShort: (n, d, min) => `${n} was under its ${min} (${d}).`,
  ceilingWithin: (n, d, max) => `${n} stayed within its ${max} (${d}).`,
  ceilingOver: (n, o, d, max) => `${n} went ${o} over its ${max} (${d}).`,
  rangeIn: (n, d, min, max) => `${n} landed between ${min} and ${max} (${d}).`,
  rangeShort: (n, d, min, max) => `${n} was under its ${min} to ${max} (${d}).`,
  rangeOver: (n, o, d, max) => `${n} went ${o} over its ${max} (${d}).`,
};

export type LibWords = {
  lang: Lang;
  /** Mon..Sun, short */
  days: readonly [string, string, string, string, string, string, string];
  // weekly time per area (S1.2), in plain words: at least / at most / between (JP, 2026-11-07)
  limit: { floor: (h: string) => string; ceiling: (h: string) => string; range: (lo: string, hi: string) => string };
  describe: DescribeWords;
  // import / conflict summaries
  summary: {
    categories: (n: number) => string;
    blocks: (n: number) => string;
    templates: (n: number) => string;
    sessions: (n: number) => string;
    streaks: (n: number) => string;
    tasks: (n: number) => string;
    dropped: (n: number) => string;
  };
  // sync
  sync: {
    badge: { synced: string; syncing: string; offline: string; error: string };
    sentence: { synced: string; syncing: string; offline: string; error: string };
    auth: { invalid_code: string; rate_limited: string; offline: string; failed: string };
  };
  now: { left: (dur: string) => string };
  /** visual B: an area's week counted in its blocks */
  // blocks to the nearest half: 3, 1.5, 0.5
  // what's left of an area's goal, given as a duration ("3h", "1.5h"); JP: time, not blocks
  count: {
    toGo: (dur: string) => string;
    room: (dur: string) => string;
    over: (dur: string) => string;
    /** past an "at least" goal */
    above: (dur: string) => string;
    /** a finished week that fell short (Stats) */
    short: (dur: string) => string;
    atLimit: string;
    reached: string;
    inRange: string;
  };
  panel: { untitled: string; buffer: string; nextWeek: string; backFrom: (day: string) => string };
  welcome: { replaces: (n: number) => string };
  starters: {
    added: (list: string) => string;
    and: string;
    names: Record<string, { name: string; blurb: string }>;
    areas: Record<"work" | "rest" | "people" | "exercise", string>;
    labels: { windDown: string; walk: string };
  };
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "0.5 blocks", "1 block", "1.5 blocks" */

export const LIB_EN: LibWords = {
  lang: "en",
  days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  limit: {
    floor: (h) => `At least ${h}`,
    ceiling: (h) => `At most ${h}`,
    range: (lo, hi) => `Between ${lo} and ${hi}`,
  },
  describe: DESCRIBE_EN,
  summary: {
    categories: (n) => plural(n, "category", "categories"),
    blocks: (n) => `${plural(n, "block", "blocks")} across both weeks`,
    templates: (n) => plural(n, "template", "templates"),
    sessions: (n) => plural(n, "logged session", "logged sessions"),
    streaks: (n) => plural(n, "streak", "streaks"),
    tasks: (n) => plural(n, "task", "tasks"),
    dropped: (n) => `Skipped ${plural(n, "entry", "entries")} that didn't look right.`,
  },
  sync: {
    badge: { synced: "synced", syncing: "syncing…", offline: "offline", error: "sync error" },
    sentence: {
      synced: "Everything's synced.",
      syncing: "Saving changes…",
      offline: "Offline. Changes are saved on this device and will sync later.",
      error: "Couldn't reach your account. Changes are saved on this device and will sync later.",
    },
    auth: {
      invalid_code: "That code didn't work. Try again or ask for a new one.",
      rate_limited: "Too many emails for now. Try again in an hour.",
      offline: "You're offline. Connect and try again.",
      failed: "Something went wrong. Try again.",
    },
  },
  count: {
    toGo: (d) => `${d} to go`,
    room: (d) => `${d} left`,
    over: (d) => `${d} over`,
    short: (d) => `${d} short`,
    above: (d) => `${d} above`,
    atLimit: "at the limit",
    reached: "reached",
    inRange: "in range",
  },
  now: {
    left: (d) => `${d} left`,
  },
  panel: { untitled: "Untitled", buffer: "Buffer", nextWeek: "next week", backFrom: (d) => `back from ${d}` },
  welcome: {
    replaces: (n) => `It replaces the ${n === 1 ? "block" : `${n} blocks`} in Week 1.`,
  },
  starters: {
    added: (list) => `Adds ${list} to your areas.`,
    and: "and",
    names: {
      "starter-work": {
        name: "Work-heavy week",
        blurb: "A full work week that still protects evenings and a weekend afternoon.",
      },
      "starter-family": {
        name: "Family week",
        blurb: "Shorter work days, time with your people after school and on the weekend.",
      },
      "starter-recovery": {
        name: "Recovery week",
        blurb: "A lighter week to get your energy back: less work, more rest, gentle movement.",
      },
    },
    areas: { work: "Work", rest: "Rest", people: "People", exercise: "Exercise" },
    labels: { windDown: "Wind down", walk: "Walk" },
  },
};
