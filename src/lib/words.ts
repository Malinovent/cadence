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
  floorMet: (n, d, min) => `${n} reached your floor (${d} of ${min} h).`,
  floorShort: (n, d, min) => `${n} was lighter than your floor (${d} of ${min} h).`,
  ceilingWithin: (n, d, max) => `${n} stayed under your ceiling (${d} of ${max} h).`,
  ceilingOver: (n, o, d, max) => `${n} went ${o} h past your ceiling (${d} of ${max} h).`,
  rangeIn: (n, d, min, max) => `${n} landed in your range (${d} h, ${min}–${max} h).`,
  rangeShort: (n, d, min, max) => `${n} was lighter than your range (${d} h, ${min}–${max} h).`,
  rangeOver: (n, o, d, max) => `${n} went ${o} h past your range (${d} of ${max} h).`,
};

export type LibWords = {
  lang: Lang;
  /** Mon..Sun, short */
  days: readonly [string, string, string, string, string, string, string];
  // guardrails (S1.2)
  limit: { floor: (h: string) => string; ceiling: (h: string) => string; range: (lo: string, hi: string) => string };
  balance: {
    floor: (p: string, min: string) => string;
    ceiling: (p: string, max: string) => string;
    inRange: (p: string) => string;
    rangeShort: (p: string, lo: string, hi: string) => string;
    rangeOver: (p: string, hi: string) => string;
  };
  note: {
    thisArea: string;
    short: (who: string, range: boolean) => string;
    over: (who: string, h: string, range: boolean) => string;
  };
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

export const LIB_EN: LibWords = {
  lang: "en",
  days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  limit: {
    floor: (h) => `Floor ${h} h`,
    ceiling: (h) => `Ceiling ${h} h`,
    range: (lo, hi) => `Range ${lo}–${hi} h`,
  },
  balance: {
    floor: (p, min) => `${p} of ${min} h`,
    ceiling: (p, max) => `${p} of ${max} h max`,
    inRange: (p) => `${p} h, in range`,
    rangeShort: (p, lo, hi) => `${p} of ${lo}–${hi} h`,
    rangeOver: (p, hi) => `${p} h, past ${hi} h`,
  },
  note: {
    thisArea: "This area",
    short: (who, range) => `${who} is lighter than your ${range ? "range" : "floor"} this week.`,
    over: (who, h, range) => `${who} is ${h} h past your ${range ? "range" : "ceiling"} this week.`,
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
