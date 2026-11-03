import { describe, expect, it } from "vitest";
import { legacyRaw, legacyStorage } from "./__fixtures__/legacy";
import { normalizeData } from "./model";
import { buildExport, exportFilename, parseImport } from "./transfer";
import html from "../../handoff/cadence-export.html?raw";

type Built = { text: string; filename: string } | null;
type Builder = (getItem?: (k: string) => string | null, now?: Date) => Built;

type Win = { localStorage?: { getItem: (k: string) => string | null }; __cadenceSnapshot?: Record<string, string | null>; __cadenceBuildExport?: Builder };

// Pull a marked block out of the handoff file and run it without a DOM
// (`document` shadowed as undefined, so the button is never mounted).
const extract = (name: string) => {
  const block = html.split(`<!-- ${name}:start -->`)[1]?.split(`<!-- ${name}:end -->`)[0] ?? "";
  return block.replace(/^\s*<script>/, "").replace(/<\/script>\s*$/, "");
};
const snapshotCode = extract("cadence-export:snapshot");
const exportCode = extract("cadence-export");
const run = (code: string, win: Win) => new Function("window", "document", code)(win, undefined);

// Simulates a page load: snapshot in <head>, then the export block at the end.
const loadPage = (store: Record<string, string>) => {
  const win: Win = { localStorage: { getItem: (k) => (k in store ? store[k] : null) } };
  run(snapshotCode, win);
  run(exportCode, win);
  return win;
};

const fakeWindow: Win = {};
run(exportCode, fakeWindow);
const build = fakeWindow.__cadenceBuildExport as Builder;

const fromStore = (store: Record<string, string>) => (k: string) => (k in store ? store[k] : null);
const now = new Date(2026, 10, 3, 9, 30);

describe("handoff/cadence-export.html", () => {
  it("contains exactly one of each marked block, snapshot before any other script", () => {
    expect(html.split("<!-- cadence-export:start -->")).toHaveLength(2);
    expect(html.split("<!-- cadence-export:snapshot:start -->")).toHaveLength(2);
    expect(html.indexOf("<!-- cadence-export:snapshot:start -->")).toBeLessThan(html.indexOf("<script"));
    expect(typeof build).toBe("function");
  });

  it("exports the same envelope as buildExport, raw values untouched", () => {
    const out = build(fromStore(legacyStorage), now);
    expect(out).not.toBeNull();
    expect(out!.filename).toBe(exportFilename(now));
    expect(out!.text).toBe(JSON.stringify({ ...buildExport(normalizeData(legacyRaw).data, now), data: legacyRaw }, null, 2));
    const r = parseImport(out!.text);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dropped).toBe(0);
    expect(r.data).toEqual(normalizeData(legacyRaw).data);
  });

  it("omits missing keys", () => {
    const { ["cadence:templates"]: _t, ...rest } = legacyStorage;
    void _t;
    const env = JSON.parse(build(fromStore(rest), now)!.text);
    expect(Object.keys(env.data)).toEqual(["cats", "weeks", "history", "streaks"]);
  });

  it("falls back to flat raw strings when a key does not parse", () => {
    const store = { ...legacyStorage, "cadence:history": "{not json" };
    const out = JSON.parse(build(fromStore(store), now)!.text);
    expect(out).toEqual(store);
    const r = parseImport(JSON.stringify(out));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dropped).toBe(1);
    expect(r.data.cats).toEqual(normalizeData(legacyRaw).data.cats);
    expect(r.data.history).toEqual([]);
  });

  it("returns null when no Cadence data exists", () => {
    expect(build(fromStore({ unrelated: "1" }), now)).toBeNull();
  });

  it("snapshots the five raw strings at load, null for missing ones", () => {
    const { ["cadence:streaks"]: _s, ...rest } = legacyStorage;
    void _s;
    const win = loadPage({ ...rest, "other:key": "x" });
    expect(win.__cadenceSnapshot).toEqual({ ...rest, "cadence:streaks": null });
  });

  it("snapshots nulls when localStorage throws", () => {
    const win: Win = {
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
      },
    };
    run(snapshotCode, win);
    expect(Object.values(win.__cadenceSnapshot!)).toEqual([null, null, null, null, null]);
  });

  it("exports from the load-time snapshot by default", () => {
    const store = { ...legacyStorage };
    const win = loadPage(store);
    store["cadence:cats"] = "[]";
    const r = parseImport(win.__cadenceBuildExport!(undefined, now)!.text);
    expect(r.ok && r.data).toEqual(normalizeData(legacyRaw).data);
  });

  it("finds no data when nothing existed at load, even after the app writes defaults", () => {
    const store: Record<string, string> = {};
    const win = loadPage(store);
    for (const k of Object.keys(legacyStorage)) store[k] = legacyStorage[k];
    expect(win.__cadenceBuildExport!(undefined, now)).toBeNull();
  });

  it("keeps an unparseable value from load even after the app replaces it", () => {
    const store = { ...legacyStorage, "cadence:weeks": "{broken" };
    const win = loadPage(store);
    store["cadence:weeks"] = "[[],[]]";
    const out = JSON.parse(win.__cadenceBuildExport!(undefined, now)!.text);
    expect(out["cadence:weeks"]).toBe("{broken");
  });
});
