import { describe, expect, it } from "vitest";
import { advanceWeek, applyTemplate, removeBlock, removeCat, saveTemplate, toggleDone } from "./actions";
import { defaultData, normalizeData, type Block, type CadenceData, type Task } from "./model";
import { loadData, needsTaskMigration, PREMIGRATION_KEYS, saveData, type StorageLike } from "./storage";
import {
  addTask,
  attachTask,
  blockPicker,
  blockTasks,
  detachTask,
  doneThisWeek,
  openTasks,
  removeTask,
  returnEnded,
  singleTaskOf,
  toggleTask,
} from "./tasks";
import { buildExport, parseImport } from "./transfer";

const blk = (id: string, over: Partial<Block> = {}): Block => ({
  id,
  catIds: ["work"],
  day: 1, // Tue
  start: 540,
  mins: 60,
  label: "",
  desc: "",
  done: false,
  ...over,
});
const task = (id: string, over: Partial<Task> = {}): Task => ({
  id,
  name: id,
  catId: "work",
  done: false,
  order: 0,
  createdAt: 1,
  ...over,
});
const base = (over: Partial<CadenceData> = {}): CadenceData => {
  const d = { ...defaultData(), weeks: [[blk("b1")], [blk("n1", { day: 3 })]] as CadenceData["weeks"], ...over };
  return { ...d, tasks: d.tasks.map((t, i) => ({ ...t, order: i })) };
};
const deps = { uid: () => "new", now: () => 5000 };
const t = (d: CadenceData, id: string) => d.tasks.find((x) => x.id === id)!;

class FakeStorage implements StorageLike {
  map = new Map<string, string>();
  constructor(init: Record<string, string> = {}) {
    for (const [k, v] of Object.entries(init)) this.map.set(k, v);
  }
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
}

describe("schema 2 migration", () => {
  // the shape the app saved before S1.5 (schema 1)
  const v1Tasks = [
    { id: "a", name: "Call the dentist", done: false, createdAt: 10 },
    { id: "b", name: "Buy stamps", done: true, createdAt: 20 },
    { id: "c", name: "Renew passport", done: false, createdAt: 30 },
  ];

  it("puts schema 1 tasks in Unsorted, keeping every task and its order", () => {
    const { data, dropped } = normalizeData({ tasks: v1Tasks });
    expect(dropped).toBe(0);
    expect(data.tasks).toEqual([
      { id: "a", name: "Call the dentist", catId: null, done: false, order: 0, createdAt: 10 },
      { id: "b", name: "Buy stamps", catId: null, done: true, order: 1, createdAt: 20 },
      { id: "c", name: "Renew passport", catId: null, done: false, order: 2, createdAt: 30 },
    ]);
  });

  it("keeps an untouched copy before migrating stored tasks, once, and the copy imports back", () => {
    const s = new FakeStorage({ "cadence:tasks": JSON.stringify(v1Tasks) });
    const now = new Date("2026-11-20T12:00:00Z");
    const loaded = loadData(s, now);
    const copy = s.getItem(PREMIGRATION_KEYS.tasks)!;
    expect(JSON.parse(copy).data.tasks).toEqual(v1Tasks);
    const back = parseImport(copy);
    expect(back.ok && back.data.tasks).toEqual(loaded.tasks);
    // saved in the new shape: no second copy, and it loads the same
    saveData(loaded, s);
    expect(needsTaskMigration(JSON.parse(s.getItem("cadence:tasks")!))).toBe(false);
    s.setItem(PREMIGRATION_KEYS.tasks, "kept");
    expect(loadData(s, now)).toEqual(loaded);
    expect(s.getItem(PREMIGRATION_KEYS.tasks)).toBe("kept");
  });

  it("makes no copy for new users", () => {
    const s = new FakeStorage();
    loadData(s);
    expect(s.getItem(PREMIGRATION_KEYS.tasks)).toBeNull();
    expect(needsTaskMigration([])).toBe(false);
  });

  it("round trips schema 2 tasks and block links through save, export and import", () => {
    const d = normalizeData({
      ...base(),
      weeks: [[blk("b1", { sourceTaskId: "a", label: "a" })], []],
      tasks: [
        task("a", { blockId: "b1" }),
        task("b", { catId: null, done: true, doneAt: 99, order: 1 }),
        task("c", { returnedFrom: 2, order: 2 }),
      ],
    }).data;
    const s = new FakeStorage();
    saveData(d, s);
    expect(loadData(s)).toEqual(d);
    const r = parseImport(JSON.stringify(buildExport(d)));
    expect(r.ok && r.data).toEqual(d);
    expect(r.ok && r.dropped).toBe(0);
  });

  it("repairs links: a missing block unlinks, a missing area goes Unsorted, a missing task frees the block", () => {
    const { data, dropped } = normalizeData({
      ...base(),
      weeks: [[blk("b1", { sourceTaskId: "gone" })], []],
      tasks: [
        task("a", { blockId: "nope", catId: "deleted" }),
        task("a", { name: "dup" }),
        task("x", { returnedFrom: 9 }),
      ],
    });
    expect(data.tasks[0]).toEqual({ id: "a", name: "a", catId: null, done: false, order: 0, createdAt: 1 });
    expect(data.tasks[1]).toEqual({ id: "x", name: "x", catId: "work", done: false, order: 1, createdAt: 1 });
    expect(data.weeks[0][0].sourceTaskId).toBeUndefined();
    expect(dropped).toBe(1); // the duplicate id
  });

  it("ignores an estimate field (tasks have none)", () => {
    const { data, dropped } = normalizeData({ tasks: [{ ...task("a"), estMins: 45 }] });
    expect(data.tasks[0]).toEqual(task("a"));
    expect(dropped).toBe(0);
  });

  it("follows the stored order", () => {
    const { data } = normalizeData({ tasks: [task("b", { order: 1 }), task("a", { order: 0 })] });
    expect(data.tasks.map((x) => x.id)).toEqual(["a", "b"]);
  });
});

describe("list edits", () => {
  it("adds to the one list, with no area", () => {
    const d = addTask(base(), "  Write report ", deps);
    expect(d.tasks).toEqual([{ id: "new", name: "Write report", catId: null, done: false, order: 0, createdAt: 5000 }]);
    const blank = base();
    expect(addTask(blank, "  ", deps)).toBe(blank);
  });
  it("keeps an area given to a task earlier, though nothing shows it", () => {
    const d = normalizeData({ ...base(), tasks: [task("a", { catId: "learn" })] }).data;
    expect(t(d, "a").catId).toBe("learn");
    expect(openTasks(d.tasks).map((x) => x.id)).toEqual(["a"]);
  });
  it("ticks with a time, unticks without, and finished tasks leave the open list", () => {
    const d = base({ tasks: [task("a", { returnedFrom: 1 }), task("b")] });
    const done = toggleTask(d, "a", deps);
    expect(t(done, "a")).toEqual({ ...task("a"), done: true, doneAt: 5000 });
    expect(openTasks(done.tasks).map((x) => x.id)).toEqual(["b"]);
    expect(t(toggleTask(done, "a"), "a")).toEqual({ ...task("a"), done: false });
  });
  it("removes a task and forgets it on a block made from it", () => {
    const d = base({ weeks: [[blk("b1", { sourceTaskId: "a" })], []], tasks: [task("a"), task("b", { order: 1 })] });
    const out = removeTask(d, "a");
    expect(out.tasks).toEqual([task("b")]);
    expect(out.weeks[0][0].sourceTaskId).toBeUndefined();
  });
  it("lists this week's finished tasks", () => {
    const now = new Date(2026, 10, 4, 12); // Wed
    const monday = new Date(2026, 10, 2).getTime();
    const tasks = [
      task("a", { done: true, doneAt: monday + 1 }),
      task("b", { done: true, doneAt: monday - 1 }),
      task("c"),
      task("d", { blockId: "b1" }),
      task("e"),
    ];
    expect(doneThisWeek(tasks, now).map((x) => x.id)).toEqual(["a"]);
  });
});

describe("tasks and blocks", () => {
  it("drops a task on a block: it joins the block's to-do list", () => {
    const d = base({ tasks: [task("a", { returnedFrom: 2 })] });
    const out = attachTask(d, "a", "b1", deps);
    expect(t(out, "a")).toEqual(task("a", { blockId: "b1", attachedAt: 5000 }));
    expect(blockTasks(out.tasks, "b1").map((x) => x.id)).toEqual(["a"]);
    expect(attachTask(d, "a", "missing")).toBe(d);
    expect(attachTask(out, "a", "b1")).toBe(out);
  });
  it("a block made from a single task (before tasks lost their area) has one tick", () => {
    const d = base({
      weeks: [[blk("b1"), blk("mine", { day: 2, label: "a", sourceTaskId: "a" })], []],
      tasks: [task("a", { blockId: "mine" })],
    });
    expect(singleTaskOf(d.tasks, d.weeks[0][1])?.id).toBe("a");
    const ticked = toggleDone(d, 0, "mine", deps);
    expect(t(ticked, "a")).toMatchObject({ done: true, doneAt: 5000, blockId: "mine" });
    const unticked = toggleDone(ticked, 0, "mine", deps);
    expect(t(unticked, "a")).toMatchObject({ done: false, blockId: "mine" });
    expect(t(unticked, "a").doneAt).toBeUndefined();
    // a second task in it makes it an ordinary block with a checklist
    const two = attachTask(base({ ...d, tasks: [...d.tasks, task("b", { order: 1 })] }), "b", "mine");
    expect(singleTaskOf(two.tasks, two.weeks[0][1])).toBeNull();
  });
  it("ticking a block sends its unticked tasks back, 'back from Tue'; ticked ones stay in it", () => {
    let d = base({ tasks: [task("a"), task("b", { order: 1 })] });
    d = attachTask(attachTask(d, "a", "b1"), "b", "b1");
    d = toggleTask(d, "b", deps);
    const out = toggleDone(d, 0, "b1", deps);
    expect(t(out, "a")).toEqual(task("a", { returnedFrom: 1 }));
    expect(t(out, "b")).toMatchObject({ done: true, blockId: "b1" });
    expect(out.tasks.map((x) => x.id)).toEqual(["a", "b"]); // nothing reorders
  });
  it("a block that ends unticked sends its tasks back; later ones and next week's stay", () => {
    let d = base({
      weeks: [[blk("b1"), blk("later", { day: 1, start: 900 })], [blk("n1", { day: 0 })]],
      tasks: [task("a"), task("b", { order: 1 }), task("c", { order: 2 })],
    });
    const monMorning = { now: () => new Date(2026, 10, 2, 8).getTime() };
    d = attachTask(attachTask(attachTask(d, "a", "b1", monMorning), "b", "later", monMorning), "c", "n1", monMorning);
    const tue1030 = new Date(2026, 10, 3, 10, 30);
    const out = returnEnded(d, tue1030);
    expect(t(out, "a")).toEqual(task("a", { returnedFrom: 1 }));
    expect(t(out, "b").blockId).toBe("later");
    expect(t(out, "c").blockId).toBe("n1");
    expect(returnEnded(out, tue1030)).toBe(out);
    expect(returnEnded(d, new Date(2026, 10, 3, 9, 59))).toBe(d); // still running
  });
  it("a task put into a block that's already over stays there (logging after the fact)", () => {
    const wedEvening = { now: () => new Date(2026, 10, 4, 19).getTime() };
    const d = attachTask(base({ tasks: [task("a")] }), "a", "b1", wedEvening); // b1 was Tue 9–10
    expect(returnEnded(d, new Date(2026, 10, 4, 19, 30))).toBe(d);
    // ticking the block still sends it back unless it's ticked too
    expect(t(toggleDone(d, 0, "b1", deps), "a").returnedFrom).toBe(1);
  });
  it("sorts the block popup's list: in this block, free, already in another block", () => {
    const list = [
      task("here", { blockId: "b1" }),
      task("gone", { blockId: "b2" }),
      task("free"),
      task("doneHere", { blockId: "b1", done: true }),
      task("doneElsewhere", { blockId: "b2", done: true }),
    ];
    const p = blockPicker(list, "b1");
    expect(p.inBlock.map((t) => t.id)).toEqual(["here", "doneHere"]);
    expect(p.free.map((t) => t.id)).toEqual(["free"]);
    expect(p.elsewhere.map((t) => t.id)).toEqual(["gone"]);
  });
  it("moving a task to another block, or out of it by hand", () => {
    const d = attachTask(base({ tasks: [task("a")] }), "a", "b1");
    expect(t(attachTask(d, "a", "n1"), "a").blockId).toBe("n1");
    expect(t(detachTask(d, "a"), "a")).toEqual(task("a"));
    expect(t(attachTask(d, "a", "n1"), "a").attachedAt).toEqual(expect.any(Number));
  });
  it("deleting, replacing or rolling away a block frees its tasks; done ones just unlink", () => {
    let d = base({ tasks: [task("a"), task("b", { order: 1 }), task("c", { order: 2 })] });
    d = attachTask(attachTask(attachTask(d, "a", "b1"), "b", "b1"), "c", "n1");
    d = toggleTask(d, "b", deps);
    const removed = removeBlock(d, "b1");
    expect(t(removed, "a")).toEqual(task("a", { returnedFrom: 1 }));
    expect(t(removed, "b")).toEqual({ ...task("b", { order: 1 }), done: true, doneAt: 5000 });
    // roll forward: week 1 goes, week 2's blocks keep their tasks
    const rolled = advanceWeek(d);
    expect(t(rolled, "a").returnedFrom).toBe(1);
    expect(t(rolled, "c").blockId).toBe("n1");
    // applying a template replaces the week: tasks never come with it
    const made = {
      ...d,
      weeks: [d.weeks[0], [...d.weeks[1], blk("mine", { day: 5, sourceTaskId: "a" })]] as CadenceData["weeks"],
    };
    const withTpl = saveTemplate(made, 1, "T", { uid: () => "tpl" });
    expect(withTpl.templates[0].blocks.every((b) => !("sourceTaskId" in b))).toBe(true);
    const applied = applyTemplate(withTpl, 1, "tpl", { uid: () => "copy" });
    expect(applied.tasks.every((x) => x.blockId !== "n1")).toBe(true);
    expect(t(applied, "c").returnedFrom).toBe(3);
  });
  it("deleting an area clears it from tasks that had it", () => {
    const d = base({ tasks: [task("a"), task("l", { catId: "learn", order: 1 })] });
    const out = removeCat(d, "work");
    expect(out.tasks.map((x) => x.catId)).toEqual([null, "learn"]);
    expect(out.tasks).toHaveLength(2);
  });
});
