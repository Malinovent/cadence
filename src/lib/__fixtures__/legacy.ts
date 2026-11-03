// Data as the legacy single-file app writes it to localStorage (five keys),
// including pre-catIds blocks, blocks without desc and history without block ids.
export const legacyRaw = {
  cats: [
    { id: "exercise", name: "Exercise", color: "#E8643C", targetMins: 240, blockMins: 120 },
    { id: "work", name: "Work", color: "#3C6FE8", targetMins: 1200, blockMins: 240 },
    { id: "learn", name: "Learn", color: "#1FA98A", targetMins: 0, blockMins: 60 },
    { id: "play", name: "", color: "#C9A227", targetMins: 240, blockMins: 120 },
    { id: "k3j2h1g0", name: "Read", color: "#9B4DCA", targetMins: 90, blockMins: 30 },
  ],
  weeks: [
    [
      { id: "a1b2c3d4", catId: "work", day: 0, start: 540, mins: 240, label: "Deep work", done: true },
      { id: "e5f6g7h8", catIds: ["exercise", "learn"], day: 2, start: 420, mins: 120, label: "", desc: "Run + podcast", done: false },
      { id: "i9j0k1l2", catIds: ["play"], day: 6, start: 1260, mins: 120, label: "Games", done: false },
    ],
    [{ id: "m3n4o5p6", catIds: ["k3j2h1g0"], day: 1, start: 1350, mins: 30, label: "", desc: "", done: false }],
  ],
  templates: [
    {
      id: "t0t0t0t0",
      name: "Template 1",
      blocks: [
        { catId: "work", day: 0, start: 540, mins: 240, label: "Deep work" },
        { catIds: ["exercise"], day: 3, start: 420, mins: 120, label: "", desc: "Gym" },
      ],
    },
  ],
  history: [
    { id: "a1b2c3d4", catId: "work", mins: 240, date: 1730000000000 },
    { catId: "learn", mins: 60, date: 1720000000000 },
  ],
  streaks: { exercise: { count: 2 }, work: { count: 0 }, learn: { count: 1, lastWeek: 45 } },
};

// the same data as raw localStorage strings
export const legacyStorage: Record<string, string> = {
  "cadence:cats": JSON.stringify(legacyRaw.cats),
  "cadence:weeks": JSON.stringify(legacyRaw.weeks),
  "cadence:templates": JSON.stringify(legacyRaw.templates),
  "cadence:history": JSON.stringify(legacyRaw.history),
  "cadence:streaks": JSON.stringify(legacyRaw.streaks),
};

// what normalizeData should make of it
export const legacyNormalized = {
  schemaVersion: 1,
  cats: legacyRaw.cats,
  weeks: [
    [
      { id: "a1b2c3d4", catIds: ["work"], day: 0, start: 540, mins: 240, label: "Deep work", desc: "", done: true },
      { id: "e5f6g7h8", catIds: ["exercise", "learn"], day: 2, start: 420, mins: 120, label: "", desc: "Run + podcast", done: false },
      { id: "i9j0k1l2", catIds: ["play"], day: 6, start: 1260, mins: 120, label: "Games", desc: "", done: false },
    ],
    [{ id: "m3n4o5p6", catIds: ["k3j2h1g0"], day: 1, start: 1350, mins: 30, label: "", desc: "", done: false }],
  ],
  templates: [
    {
      id: "t0t0t0t0",
      name: "Template 1",
      blocks: [
        { catIds: ["work"], day: 0, start: 540, mins: 240, label: "Deep work", desc: "" },
        { catIds: ["exercise"], day: 3, start: 420, mins: 120, label: "", desc: "Gym" },
      ],
    },
  ],
  history: [
    { id: "a1b2c3d4", catId: "work", mins: 240, date: 1730000000000 },
    { id: "", catId: "learn", mins: 60, date: 1720000000000 },
  ],
  streaks: { exercise: { count: 2 }, work: { count: 0 }, learn: { count: 1, lastWeek: 45 } },
};
