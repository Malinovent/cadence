// S1.8 Starter templates: three realistic, under-filled weeks (work-heavy, family, recovery),
// each with floors for rest and people and a work ceiling, and a buffer every day.
//
// JP (2026-11-04): applying one adds the areas it needs that the person doesn't have (matched
// by name, case and spaces ignored), with the starter's guardrail; areas the person already has
// keep their own limits, and the starter's blocks go into them. Built in, never stored or synced:
// they're not in `templates`, so nothing changes in the saved shape.
import { BUFFER_MINS, PALETTE } from "./constants";
import type { Limit } from "./guardrail";
import { legacyTarget } from "./guardrail";
import type { Block, CadenceData, Category, Weeks } from "./model";
import { releaseRemoved } from "./tasks";
import { uid as defaultUid } from "./uid";
import { LIB_EN, type Lang, type LibWords } from "./words";
import { LIB_FR } from "./words.fr";

type Deps = { uid?: () => string; lang?: Lang }; // lang: names the areas it adds and the block labels
type WeekIndex = 0 | 1;

export type StarterAreaKey = "work" | "rest" | "people" | "exercise";
export type StarterArea = { key: StarterAreaKey; name: string; blockMins: number; limit: Limit };
/** A block in a starter: an area key, or null for the day's buffer. */
export type StarterBlock = { area: StarterAreaKey | null; day: number; start: number; mins: number; label?: "windDown" | "walk" };
export type Starter = { id: string; name: string; blurb: string; areas: StarterArea[]; blocks: StarterBlock[] };

const h = (n: number) => Math.round(n * 60);
const at = (hh: number, mm = 0) => hh * 60 + mm;
const WEEKDAYS = [0, 1, 2, 3, 4];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

const repeat = (
  days: number[],
  area: StarterAreaKey | null,
  start: number,
  mins: number,
  label?: StarterBlock["label"],
): StarterBlock[] => days.map((day) => ({ area, day, start, mins, ...(label ? { label } : {}) }));
const buffers = (weekdayStart: number, weekendStart: number): StarterBlock[] => [
  ...repeat(WEEKDAYS, null, weekdayStart, BUFFER_MINS),
  ...repeat([5, 6], null, weekendStart, BUFFER_MINS),
];

export const STARTERS: readonly Starter[] = [
  {
    id: "starter-work",
    name: "Work-heavy week",
    blurb: "A full work week that still protects evenings and a weekend afternoon.",
    areas: [
      { key: "work", name: "Work", blockMins: h(3), limit: { kind: "ceiling", max: h(40) } },
      { key: "rest", name: "Rest", blockMins: h(1), limit: { kind: "floor", min: h(8) } },
      { key: "people", name: "People", blockMins: h(1.5), limit: { kind: "floor", min: h(4) } },
      { key: "exercise", name: "Exercise", blockMins: h(1), limit: { kind: "floor", min: h(2.5) } },
    ],
    blocks: [
      ...repeat(WEEKDAYS, "work", at(9), h(3)),
      ...repeat(WEEKDAYS, "work", at(13), h(3)),
      ...repeat(WEEKDAYS, "rest", at(21), h(1), "windDown"),
      { area: "rest", day: 5, start: at(14), mins: h(2) },
      { area: "people", day: 2, start: at(19), mins: h(1.5) },
      { area: "people", day: 5, start: at(18), mins: h(2) },
      ...repeat([1, 3], "exercise", at(7, 30), h(1)),
      ...buffers(at(12), at(16)),
    ],
  },
  {
    id: "starter-family",
    name: "Family week",
    blurb: "Shorter work days, time with your people after school and on the weekend.",
    areas: [
      { key: "work", name: "Work", blockMins: h(2.5), limit: { kind: "ceiling", max: h(32) } },
      { key: "rest", name: "Rest", blockMins: h(1), limit: { kind: "floor", min: h(6) } },
      { key: "people", name: "People", blockMins: h(1.5), limit: { kind: "floor", min: h(14) } },
      { key: "exercise", name: "Exercise", blockMins: h(1), limit: { kind: "floor", min: h(2.5) } },
    ],
    blocks: [
      ...repeat(WEEKDAYS, "work", at(9), h(3)),
      ...repeat(WEEKDAYS, "work", at(13), h(2.5)),
      ...repeat(WEEKDAYS, "people", at(17, 30), h(1.5)),
      { area: "people", day: 5, start: at(10), mins: h(3) },
      { area: "people", day: 6, start: at(10), mins: h(2) },
      ...repeat([1, 3], "rest", at(21), h(1)),
      { area: "rest", day: 6, start: at(15), mins: h(2) },
      { area: "exercise", day: 1, start: at(7, 30), mins: h(1) },
      { area: "exercise", day: 5, start: at(8), mins: h(1) },
      ...buffers(at(15, 30), at(13, 30)),
    ],
  },
  {
    id: "starter-recovery",
    name: "Recovery week",
    blurb: "A lighter week to get your energy back: less work, more rest, gentle movement.",
    areas: [
      { key: "work", name: "Work", blockMins: h(2), limit: { kind: "ceiling", max: h(25) } },
      { key: "rest", name: "Rest", blockMins: h(1.5), limit: { kind: "floor", min: h(14) } },
      { key: "people", name: "People", blockMins: h(1.5), limit: { kind: "floor", min: h(4) } },
      { key: "exercise", name: "Exercise", blockMins: h(0.5), limit: { kind: "floor", min: h(2) } },
    ],
    blocks: [
      ...repeat([0, 1, 2, 3], "work", at(9, 30), h(3)),
      ...repeat([0, 1, 2, 3], "work", at(13, 30), h(2)),
      ...repeat(ALL_DAYS, "rest", at(20, 30), h(1.5)),
      { area: "rest", day: 5, start: at(13), mins: h(2) },
      { area: "people", day: 2, start: at(18), mins: h(1.5) },
      { area: "people", day: 6, start: at(11), mins: h(2) },
      ...repeat([0, 2, 4], "exercise", at(8), h(0.5), "walk"),
      ...buffers(at(12, 30), at(16)),
    ],
  },
];

/** The colour an added area gets when nobody uses it yet. */
const STARTER_COLORS: Record<StarterAreaKey, string> = {
  work: "#3C6FE8",
  rest: "#9B4DCA",
  people: "#0CA678",
  exercise: "#E8643C",
};

const norm = (s: string) => s.trim().toLowerCase();

/** The person's area for a starter area: same name, case and spaces ignored. */
export const matchArea = (cats: readonly Category[], area: StarterArea): Category | undefined => {
  // the same name in English or French (S1.9), case and spaces ignored
  const names = new Set([area.name, LIB_EN.starters.areas[area.key], LIB_FR.starters.areas[area.key]].map(norm));
  return cats.find((c) => names.has(norm(c.name)));
};

/** A starter's name and one-line description in the person's language. */
export const starterText = (st: Starter, w: LibWords = LIB_EN): { name: string; blurb: string } =>
  w.starters.names[st.id] ?? { name: st.name, blurb: st.blurb };

/** A starter area's name in the person's language. */
export const areaName = (a: StarterArea, w: LibWords = LIB_EN): string => w.starters.areas[a.key] ?? a.name;

/** The starter's areas the person doesn't have yet (applying adds them). */
export const missingAreas = (cats: readonly Category[], starter: Starter): StarterArea[] =>
  starter.areas.filter((a) => !matchArea(cats, a));

/** "Adds Rest and People to your areas." — or null when nothing is added. */
export const addedNote = (names: string[], w: LibWords = LIB_EN): string | null => {
  if (names.length === 0) return null;
  const list =
    names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} ${w.starters.and} ${names[names.length - 1]}`;
  return w.starters.added(list);
};

/**
 * Week `week` becomes the starter: missing areas are added (with the starter's guardrail and a
 * colour the person isn't using yet), existing ones are used as they are, and the week's
 * blocks are replaced (their tasks go back to the list, like applying a template).
 */
export function applyStarter(data: CadenceData, week: WeekIndex, starterId: string, deps: Deps = {}): CadenceData {
  const starter = STARTERS.find((s) => s.id === starterId);
  if (!starter) return data;
  const makeId = deps.uid ?? defaultUid;
  const w = deps.lang === "fr" ? LIB_FR : LIB_EN;
  const cats = [...data.cats];
  const used = new Set(cats.map((c) => c.color.toLowerCase()));
  // each area's own calm colour when free, else the first palette colour not in use (never the
  // raspberry: it reads too close to red, and nothing in Cadence is ever red)
  const pickColor = (key: StarterAreaKey) => {
    const order = [STARTER_COLORS[key], ...PALETTE.filter((p) => p !== "#D6336C")];
    const free = order.find((p) => !used.has(p.toLowerCase())) ?? STARTER_COLORS[key];
    used.add(free.toLowerCase());
    return free;
  };
  const idOf = new Map<StarterAreaKey, string>();
  for (const a of starter.areas) {
    const have = matchArea(cats, a);
    if (have) {
      idOf.set(a.key, have.id);
      continue;
    }
    const cat: Category = {
      id: makeId(),
      name: areaName(a, w),
      color: pickColor(a.key),
      targetMins: legacyTarget(a.limit),
      blockMins: a.blockMins,
      limit: a.limit,
    };
    cats.push(cat);
    idOf.set(a.key, cat.id);
  }
  const blocks: Block[] = starter.blocks.map((b) => {
    const base = {
      id: makeId(),
      day: b.day,
      start: b.start,
      mins: b.mins,
      label: b.label ? w.starters.labels[b.label] : "",
      desc: "",
      done: false,
    };
    return b.area === null ? { ...base, catIds: [], buffer: true as const } : { ...base, catIds: [idOf.get(b.area)!] };
  });
  const weeks: Weeks = [data.weeks[0], data.weeks[1]];
  weeks[week] = blocks;
  return releaseRemoved(data, { ...data, cats, weeks });
}
