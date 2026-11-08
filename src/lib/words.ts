// S1.9: every piece of wording the pure functions in src/lib produce, in one place, so they can
// be translated. Each function takes the words as an argument, English by default (the tests
// read English); the app passes the language the person chose (src/i18n).

export type Lang = "en" | "fr";

// S1.10 neutral week descriptions (describe.ts)
export type DescribeWords = {
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
  noTicks: (n) => `No ${n} blocks were ticked.`,
  floorMet: (n, d, min) => `${n} reached at least ${min} h (${d} h).`,
  floorShort: (n, d, min) => `${n} was under its ${min} h (${d} h).`,
  ceilingWithin: (n, d, max) => `${n} stayed within its ${max} h (${d} h).`,
  ceilingOver: (n, o, d, max) => `${n} went ${o} h over its ${max} h (${d} h).`,
  rangeIn: (n, d, min, max) => `${n} landed between ${min} and ${max} h (${d} h).`,
  rangeShort: (n, d, min, max) => `${n} was under its ${min} to ${max} h (${d} h).`,
  rangeOver: (n, o, d, max) => `${n} went ${o} h over its ${max} h (${d} h).`,
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
  now: { left: (h: number, m: number) => string };
  /** visual B: an area's week counted in its blocks */
  // blocks to the nearest half: 3, 1.5, 0.5
  count: {
    toGo: (n: number) => string;
    room: (n: number) => string;
    over: (n: number) => string;
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
const enBlocks = (n: number): string => `${n} ${n === 1 ? "block" : "blocks"}`;

export const LIB_EN: LibWords = {
  lang: "en",
  days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  limit: {
    floor: (h) => `At least ${h} h`,
    ceiling: (h) => `At most ${h} h`,
    range: (lo, hi) => `Between ${lo} and ${hi} h`,
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
    toGo: (n) => `${n} more ${n === 1 ? "block" : "blocks"}`,
    room: (n) => `${enBlocks(n)} left`,
    over: (n) => `${enBlocks(n)} over`,
    atLimit: "at the limit",
    reached: "reached",
    inRange: "in range",
  },
  now: {
    left: (h, m) => (!h ? `${m} min left` : m ? `${h} h ${String(m).padStart(2, "0")} left` : `${h} h left`),
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
