// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GridHit } from "../lib/gesture";
import { IDLE, InteractionEngine, type EngineEnv, type EngineState } from "./engine";

// jsdom has no PointerEvent: a MouseEvent with the pointer fields added is enough for the engine
const ptr = (
  type: string,
  x: number,
  y: number,
  o: { id?: number; kind?: string; button?: number; primary?: boolean } = {},
) => {
  const e = new MouseEvent(type, { clientX: x, clientY: y, button: o.button ?? 0, bubbles: true, cancelable: true });
  Object.defineProperties(e, {
    pointerId: { value: o.id ?? 1 },
    pointerType: { value: o.kind ?? "mouse" },
    isPrimary: { value: o.primary ?? true },
  });
  return e as unknown as PointerEvent;
};
const down = (x: number, y: number, kind = "mouse", id = 1) => {
  const e = ptr("pointerdown", x, y, { id, kind });
  window.dispatchEvent(e); // the engine's capture listener sees every pointerdown first
  return e;
};
const move = (x: number, y: number, kind = "mouse", id = 1) => window.dispatchEvent(ptr("pointermove", x, y, { id, kind }));
const up = (x: number, y: number, kind = "mouse", id = 1) => window.dispatchEvent(ptr("pointerup", x, y, { id, kind }));
const cancel = (kind = "touch", id = 1) => window.dispatchEvent(ptr("pointercancel", 0, 0, { id, kind }));
const frame = () => vi.advanceTimersByTime(16);

let states: EngineState[];
let onDrop: ReturnType<typeof vi.fn>;
let onResize: ReturnType<typeof vi.fn>;
let suppressClick: ReturnType<typeof vi.fn>;
let ghost: { moveTo: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> };
let makeGhost: ReturnType<typeof vi.fn>;
let hitAt: (x: number, y: number, grabOffsetY: number | null) => GridHit | null;
let coarse: boolean;
let engine: InteractionEngine;
let el: HTMLElement;
const last = () => states[states.length - 1] ?? IDLE;

beforeEach(() => {
  vi.useFakeTimers();
  states = [];
  onDrop = vi.fn();
  onResize = vi.fn();
  suppressClick = vi.fn();
  ghost = { moveTo: vi.fn(), remove: vi.fn() };
  makeGhost = vi.fn(() => ghost);
  hitAt = (x, y, off) => ({ day: Math.floor(x / 100), start: 420 + Math.floor((y - (off ?? 0)) / 26) * 30, blockId: null });
  coarse = false;
  window.scrollBy = vi.fn();
  Object.defineProperty(window.navigator, "vibrate", { value: vi.fn(), configurable: true });
  const env: EngineEnv = {
    win: window,
    coarse: () => coarse,
    hitAt: (_root, x, y, off) => hitAt(x, y, off),
    column: () => ({ top: 0, rowH: 26 }),
    ghost: makeGhost as unknown as EngineEnv["ghost"],
    suppressClick,
    raf: (cb) => window.setTimeout(cb, 16),
    caf: (id) => window.clearTimeout(id),
  };
  engine = new InteractionEngine({ onChange: (s) => states.push(s), onDrop, onResize }, env);
  engine.mount();
  engine.setGrid(document.createElement("div"));
  el = document.createElement("div");
  document.body.appendChild(el);
});

afterEach(() => {
  engine.unmount();
  el.remove();
  vi.useRealTimers();
});

const pressTray = (x: number, y: number, kind = "mouse", id = 1) =>
  engine.pressSource(down(x, y, kind, id), el, { kind: "tray", catId: "work" }, { hold: true });

describe("touch long-press", () => {
  it("shows hold progress, then picks up after 350ms and drops on the slot under the finger", () => {
    pressTray(150, 200, "touch");
    expect(last().press).toEqual({ source: { kind: "tray", catId: "work" }, hold: true });
    vi.advanceTimersByTime(349);
    expect(last().drag).toBeNull();
    vi.advanceTimersByTime(1);
    expect(last().press).toBeNull();
    expect(last().drag).toEqual({ source: { kind: "tray", catId: "work" }, hit: { day: 1, start: 420 + 7 * 30, blockId: null } });
    expect(window.navigator.vibrate).toHaveBeenCalledWith(10);
    expect(document.documentElement.classList.contains("cadence-dragging")).toBe(true);

    move(350, 300, "touch");
    expect(ghost.moveTo).toHaveBeenLastCalledWith(350, 300);
    frame();
    expect(last().drag?.hit).toEqual({ day: 3, start: 420 + 11 * 30, blockId: null });

    up(350, 300, "touch");
    expect(onDrop).toHaveBeenCalledWith({ kind: "tray", catId: "work" }, { day: 3, start: 750, blockId: null });
    expect(suppressClick).toHaveBeenCalledTimes(1);
    expect(ghost.remove).toHaveBeenCalled();
    expect(last()).toBe(IDLE);
    expect(document.documentElement.classList.contains("cadence-dragging")).toBe(false);
  });

  it("small jitter (< 8px) during the hold still picks up", () => {
    pressTray(150, 200, "touch");
    move(154, 205, "touch");
    vi.advanceTimersByTime(350);
    expect(last().drag).not.toBeNull();
  });

  it("moving 8px before the long-press cancels it (the page scrolls instead)", () => {
    pressTray(150, 200, "touch");
    move(150, 208, "touch");
    expect(last()).toBe(IDLE);
    vi.advanceTimersByTime(1000);
    expect(last()).toBe(IDLE);
    expect(onDrop).not.toHaveBeenCalled();
  });

  it("the browser taking the gesture (pointercancel) cancels the press", () => {
    pressTray(150, 200, "touch");
    cancel("touch");
    vi.advanceTimersByTime(1000);
    expect(last()).toBe(IDLE);
  });

  it("a quick tap is left to the click event", () => {
    pressTray(150, 200, "touch");
    vi.advanceTimersByTime(120);
    up(150, 200, "touch");
    expect(last()).toBe(IDLE);
    expect(onDrop).not.toHaveBeenCalled();
    expect(suppressClick).not.toHaveBeenCalled();
  });

  it("blocks touchmove scrolling only while dragging", () => {
    const tm = () => {
      const e = new Event("touchmove", { cancelable: true, bubbles: true });
      document.dispatchEvent(e);
      return e.defaultPrevented;
    };
    pressTray(150, 200, "touch");
    expect(tm()).toBe(false);
    vi.advanceTimersByTime(350);
    expect(tm()).toBe(true);
    up(150, 200, "touch");
    expect(tm()).toBe(false);
  });
});

describe("mouse", () => {
  it("starts the drag after 4px, with no delay and no hold progress", () => {
    pressTray(150, 200);
    expect(last().press?.hold).toBe(false);
    move(152, 202); // ~2.8px
    expect(last().drag).toBeNull();
    move(153, 203); // ~4.2px
    expect(last().drag).not.toBeNull();
    expect(window.navigator.vibrate).not.toHaveBeenCalled();
  });

  it("a click without movement is not a drag", () => {
    pressTray(150, 200);
    up(151, 200);
    expect(onDrop).not.toHaveBeenCalled();
    expect(suppressClick).not.toHaveBeenCalled();
  });

  it("ignores the right button and non-primary pointers", () => {
    engine.pressSource(ptr("pointerdown", 1, 1, { button: 2 }), el, { kind: "tray", catId: "work" });
    expect(engine.busy).toBe(false);
    engine.pressSource(ptr("pointerdown", 1, 1, { kind: "touch", id: 7, primary: false }), el, { kind: "tray", catId: "work" });
    expect(engine.busy).toBe(false);
  });

  it("dropping outside the grid changes nothing", () => {
    hitAt = () => null;
    pressTray(150, 200);
    move(160, 200);
    up(900, 50);
    expect(onDrop).not.toHaveBeenCalled();
    expect(suppressClick).toHaveBeenCalled();
  });

  it("Escape cancels the drag and swallows the click of the eventual release", () => {
    pressTray(150, 200);
    move(160, 200);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(last()).toBe(IDLE);
    expect(ghost.remove).toHaveBeenCalled();
    up(300, 300);
    expect(onDrop).not.toHaveBeenCalled();
    expect(suppressClick).toHaveBeenCalledTimes(1);
    expect(engine.busy).toBe(false);
  });

  it("a pointerdown after a release we never saw starts fresh", () => {
    pressTray(150, 200);
    move(160, 200); // dragging; mouse released outside the window, no pointerup
    pressTray(10, 10);
    expect(last().press).not.toBeNull();
    expect(last().drag).toBeNull();
  });

  it("a moved block's hit uses its grab offset; a tray item's ghost hangs off the pointer", () => {
    const calls: (number | null)[] = [];
    const base = hitAt;
    hitAt = (x, y, off) => {
      calls.push(off);
      return base(x, y, off);
    };
    el.getBoundingClientRect = () => ({ left: 120, top: 150, right: 200, bottom: 250, width: 80, height: 100, x: 120, y: 150, toJSON() {} });
    engine.pressBlock(down(150, 210), el, { id: "b1", start: 480, mins: 120 });
    move(150, 220);
    expect(makeGhost).toHaveBeenLastCalledWith(el, expect.objectContaining({ width: 80, height: 100 }), 30, 60);
    up(250, 300);
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.every((c) => c === 60)).toBe(true);
    expect(onDrop).toHaveBeenLastCalledWith({ kind: "move", id: "b1" }, { day: 2, start: 420 + 9 * 30, blockId: null });

    calls.length = 0;
    pressTray(150, 210);
    move(150, 220);
    expect(makeGhost).toHaveBeenLastCalledWith(el, expect.anything(), 8, 8);
    up(250, 300);
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.every((c) => c === null)).toBe(true);
  });

  it("moves a block: the source is reported as a move", () => {
    engine.pressBlock(down(150, 200), el, { id: "b1", start: 480, mins: 60 });
    move(150, 260);
    up(250, 260);
    // jsdom rects are all zero, so the grab offset is the pointer y at pointerdown (200)
    expect(onDrop).toHaveBeenCalledWith({ kind: "move", id: "b1" }, { day: 2, start: 420 + Math.floor(60 / 26) * 30, blockId: null });
  });

  it("remembers the last pointer type for the contextmenu decision", () => {
    down(1, 1, "mouse");
    expect(engine.lastPointerType).toBe("mouse");
    expect(engine.blocksContextMenu()).toBe(false);
    down(1, 1, "touch", 3);
    expect(engine.lastPointerType).toBe("touch");
    expect(engine.blocksContextMenu()).toBe(true);
  });
});

describe("resize", () => {
  const block = { id: "b1", start: 480, mins: 60 };

  it("reports whole-row deltas as the pointer moves, then swallows the click", () => {
    expect(engine.startResize(down(150, 100), el, block, "bottom", { capture: true })).toBe(true);
    expect(last().resize).toEqual({ id: "b1", edge: "bottom" });
    move(150, 112);
    frame();
    expect(onResize).not.toHaveBeenCalled();
    move(150, 114); // 14px > half a 26px row
    frame();
    expect(onResize).toHaveBeenLastCalledWith("b1", "bottom", 480, 60, 1);
    move(150, 100 + 26 * 3);
    frame();
    expect(onResize).toHaveBeenLastCalledWith("b1", "bottom", 480, 60, 3);
    up(150, 100 + 26 * 3);
    expect(onResize).toHaveBeenCalledTimes(2);
    expect(suppressClick).toHaveBeenCalledTimes(1);
    expect(last()).toBe(IDLE);
  });

  it("pointercancel puts the block back", () => {
    engine.startResize(down(150, 100, "touch"), el, block, "top", { capture: false });
    move(150, 48, "touch");
    frame();
    expect(onResize).toHaveBeenLastCalledWith("b1", "top", 480, 60, -2);
    cancel("touch");
    expect(onResize).toHaveBeenLastCalledWith("b1", "top", 480, 60, 0);
    expect(last()).toBe(IDLE);
  });

  it("a still tap on a grip is not a resize and its click goes through", () => {
    engine.startResize(down(150, 100, "touch"), el, block, "top", { capture: false });
    up(150, 101, "touch");
    expect(onResize).not.toHaveBeenCalled();
    expect(suppressClick).not.toHaveBeenCalled();
  });

  it("on coarse pointers a block's edge bands resize and its middle picks it up", () => {
    coarse = true;
    el.getBoundingClientRect = () => ({ left: 0, top: 100, right: 100, bottom: 200, width: 100, height: 100, x: 0, y: 100, toJSON() {} });
    engine.pressBlock(down(50, 110, "touch"), el, block); // 10px into a 100px block
    expect(last().resize).toEqual({ id: "b1", edge: "top" });
    up(50, 110, "touch");
    engine.pressBlock(down(50, 195, "touch", 2), el, block);
    expect(last().resize).toEqual({ id: "b1", edge: "bottom" });
    up(50, 195, "touch", 2);
    engine.pressBlock(down(50, 150, "touch", 3), el, block);
    expect(last().press?.source).toEqual({ kind: "move", id: "b1" });
    expect(last().press?.hold).toBe(false);
    up(50, 150, "touch", 3);
    // the edge bands only span the middle half of the width: name (left) and done toggle (right) stay free
    engine.pressBlock(down(10, 105, "touch", 4), el, block);
    expect(last().press?.source).toEqual({ kind: "move", id: "b1" });
    up(10, 105, "touch", 4);
    engine.pressBlock(down(90, 105, "touch", 5), el, block);
    expect(last().resize).toBeNull();
  });

  it("autoscrolls near the viewport edge while resizing", () => {
    const h = window.innerHeight;
    engine.startResize(down(150, h - 100), el, block, "bottom", { capture: true });
    move(150, h - 5);
    frame();
    expect(window.scrollBy).toHaveBeenCalledWith(0, 15);
  });
});
