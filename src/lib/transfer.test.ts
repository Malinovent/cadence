import { describe, expect, it } from "vitest";
import { legacyNormalized, legacyRaw, legacyStorage } from "./__fixtures__/legacy";
import { normalizeData } from "./model";
import { buildExport, exportFilename, NEWER_VERSION, NOT_A_BACKUP, parseImport } from "./transfer";

const data = normalizeData(legacyRaw).data;

describe("export", () => {
  it("builds the envelope", () => {
    const env = buildExport(data, new Date("2026-03-04T05:06:07.000Z"));
    expect(env).toEqual({
      app: "cadence",
      schemaVersion: 1,
      exportedAt: "2026-03-04T05:06:07.000Z",
      data: { cats: data.cats, weeks: data.weeks, templates: data.templates, history: data.history, streaks: data.streaks, tasks: data.tasks },
    });
    expect("schemaVersion" in env.data).toBe(false);
  });

  it("names the file with the local date", () => {
    expect(exportFilename(new Date(2026, 0, 5, 23, 59))).toBe("cadence-backup-2026-01-05.json");
    expect(exportFilename(new Date(2026, 10, 30, 0, 1))).toBe("cadence-backup-2026-11-30.json");
  });
});

describe("parseImport", () => {
  it("round trips the export losslessly", () => {
    const r = parseImport(JSON.stringify(buildExport(data)));
    expect(r).toEqual({
      ok: true,
      data,
      dropped: 0,
      summary: { categories: 5, blocks: 4, templates: 1, sessions: 2, streaks: 2, tasks: 0 },
    });
  });

  it("round trips tasks through the export", () => {
    const tasks = [
      { id: "t1", name: "Call mum", done: false, createdAt: 10 },
      { id: "t2", name: "Buy milk", done: true, createdAt: 20 },
    ];
    const withTasks = { ...data, tasks };
    const env = buildExport(withTasks);
    expect(env.data.tasks).toEqual(tasks);
    const r = parseImport(JSON.stringify(env));
    expect(r.ok && r.data).toEqual(withTasks);
    expect(r.ok && r.dropped).toBe(0);
    expect(r.ok && r.summary.tasks).toBe(2);
  });

  it("imports an older export without tasks with zero drops and an empty task list", () => {
    const env = buildExport(data);
    const { tasks: _t, ...oldData } = env.data;
    void _t;
    const r = parseImport(JSON.stringify({ ...env, data: oldData }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dropped).toBe(0);
    expect(r.data).toEqual({ ...data, tasks: [] });
    expect(r.summary.tasks).toBe(0);
  });

  it("accepts cadence:tasks in a flat legacy-key file", () => {
    const tasks = [{ id: "t1", name: "Call mum", done: false, createdAt: 10 }];
    const r = parseImport(JSON.stringify({ ...legacyStorage, "cadence:tasks": JSON.stringify(tasks) }));
    expect(r.ok && r.data.tasks).toEqual(tasks);
    expect(r.ok && r.dropped).toBe(0);
  });

  it("accepts a flat legacy-key file with JSON string values", () => {
    const r = parseImport(JSON.stringify(legacyStorage));
    expect(r.ok && r.data).toEqual(legacyNormalized);
    expect(r.ok && r.dropped).toBe(0);
  });

  it("accepts a flat legacy-key file with parsed values, missing keys default", () => {
    const r = parseImport(JSON.stringify({ "cadence:weeks": legacyRaw.weeks, "cadence:cats": legacyRaw.cats }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.weeks).toEqual(legacyNormalized.weeks);
    expect(r.data.history).toEqual([]);
    expect(r.summary.blocks).toBe(4);
  });

  it("counts an unparseable string value as dropped", () => {
    const r = parseImport(JSON.stringify({ ...legacyStorage, "cadence:history": "{nope" }));
    expect(r.ok && r.dropped).toBe(1);
    expect(r.ok && r.data.history).toEqual([]);
  });

  it("reports drops from normalization", () => {
    const env = buildExport(data);
    const bad = { ...env, data: { ...env.data, history: [...env.data.history, { catId: 1 }] } };
    const r = parseImport(JSON.stringify(bad));
    expect(r.ok && r.dropped).toBe(1);
  });

  it("rejects garbage", () => {
    for (const text of ["not json", "[]", "42", "null", '"str"', "{}", '{"foo":1}', '{"app":"other","data":{"cats":[]}}', '{"app":"cadence","data":[]}', '{"app":"cadence","data":{}}']) {
      expect(parseImport(text)).toEqual({ ok: false, error: NOT_A_BACKUP });
    }
  });

  it("rejects a newer schema version", () => {
    const env = { ...buildExport(data), schemaVersion: 2 };
    expect(parseImport(JSON.stringify(env))).toEqual({ ok: false, error: NEWER_VERSION });
  });
});
