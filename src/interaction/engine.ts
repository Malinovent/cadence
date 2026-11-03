// Pointer Events interaction engine: press -> (long-press | 4px move) -> drag -> drop,
// and edge resizes. One gesture at a time. Framework-free; the React side
// (useInteraction) mirrors `EngineState` into state and wires the callbacks.
//
// Sources call in from their React onPointerDown:
//   pressSource(e, el, source)   tray item (or anything draggable)
//   pressBlock(e, el, block)     placed block; on coarse pointers its edge bands resize instead
//   startResize(e, el, block, edge, { capture })   explicit grips / mouse edge handles
//
// Touch: a press becomes a drag after LONG_PRESS_MS with < TOUCH_SLOP px of movement; moving
// earlier ends the press and leaves the gesture to the browser (page scroll). Mouse/pen: the
// drag starts after MOUSE_SLOP px. While a drag or resize runs, a non-passive document
// touchmove listener calls preventDefault so the page does not scroll; for iOS that only works
// because a non-passive window touchmove listener is registered at mount (see mount()).
import {
  autoscrollSpeed,
  edgeAt,
  exceedsSlop,
  ghostOffset,
  LONG_PRESS_MS,
  MOUSE_SLOP,
  resizeDeltaSlots,
  TOUCH_SLOP,
  type DragSource,
  type GridHit,
} from "../lib/gesture";
import { columnOf, createGhost, gridHitAt, isCoarsePointer, suppressNextClick, type Ghost } from "./dom";

export type ResizeEdge = "top" | "bottom";

export type EngineState = {
  press: { source: DragSource; hold: boolean } | null; // pointer down on a source, not yet dragging
  drag: { source: DragSource; hit: GridHit | null } | null; // hit = what is under the pointer (null: outside the grid)
  resize: { id: string; edge: ResizeEdge } | null;
};
export const IDLE: EngineState = { press: null, drag: null, resize: null };

export type EngineCallbacks = {
  onChange: (state: EngineState) => void;
  onDrop: (source: DragSource, hit: GridHit) => void;
  onResize: (id: string, edge: ResizeEdge, origStart: number, origMins: number, deltaSlots: number) => void;
};

// the PointerEvent fields the engine reads (React's synthetic events fit too)
export type PointerLike = {
  pointerId: number;
  pointerType: string;
  clientX: number;
  clientY: number;
  button: number;
  isPrimary: boolean;
};

export type BlockGeom = { id: string; start: number; mins: number };

// everything that touches the browser, injectable for tests
export type EngineEnv = {
  win: Window;
  coarse: () => boolean;
  hitAt: (root: HTMLElement, x: number, y: number, grabOffsetY: number | null) => GridHit | null;
  column: (el: Element) => { top: number; rowH: number } | null;
  ghost: (el: HTMLElement, size: { width: number; height: number }, offsetX: number, offsetY: number) => Ghost;
  suppressClick: () => void;
  raf: (cb: () => void) => number;
  caf: (id: number) => void;
};

export const domEnv = (win: Window): EngineEnv => ({
  win,
  coarse: () => isCoarsePointer(win),
  hitAt: gridHitAt,
  column: columnOf,
  ghost: createGhost,
  suppressClick: () => suppressNextClick(win),
  raf: (cb) => (win.requestAnimationFrame ? win.requestAnimationFrame(cb) : win.setTimeout(cb, 16)),
  caf: (id) => (win.cancelAnimationFrame ? win.cancelAnimationFrame(id) : win.clearTimeout(id)),
});

type Press = {
  type: "press";
  pointerId: number;
  touch: boolean;
  source: DragSource;
  el: HTMLElement;
  rect: DOMRect; // the source as it was at pointerdown (before the press scale)
  startX: number;
  startY: number;
  x: number;
  y: number;
  timer: number | null;
};
type Drag = {
  type: "drag";
  pointerId: number;
  touch: boolean;
  source: DragSource;
  el: HTMLElement;
  x: number;
  y: number;
  ghost: Ghost;
  grabOffsetY: number | null; // moved block: px from its top to the pointer; tray: null
  hit: GridHit | null;
};
type Resize = {
  type: "resize";
  pointerId: number;
  touch: boolean;
  id: string;
  edge: ResizeEdge;
  origStart: number;
  origMins: number;
  el: HTMLElement;
  startX: number;
  startY: number;
  x: number;
  y: number;
  startYInCol: number;
  rowH: number;
  delta: number;
  moved: boolean;
};
// after Escape / blur: the gesture is over, but this pointer's remaining events are swallowed
type Void = { type: "void"; pointerId: number };
type Session = Press | Drag | Resize | Void;

const sameHit = (a: GridHit | null, b: GridHit | null) =>
  a === b || (!!a && !!b && a.day === b.day && a.start === b.start && a.blockId === b.blockId);

const noop = () => {};

export class InteractionEngine {
  private s: Session | null = null;
  private state: EngineState = IDLE;
  private grid: HTMLElement | null = null;
  private frame: number | null = null;
  private listening = false;
  private mounted = false;
  private lastType = "mouse";
  private readonly cb: EngineCallbacks;
  private readonly env: EngineEnv;

  constructor(cb: EngineCallbacks, env: EngineEnv) {
    this.cb = cb;
    this.env = env;
  }

  // ---- lifecycle ----
  mount(): void {
    if (this.mounted) return;
    this.mounted = true;
    const { win } = this.env;
    // iOS Safari decides at touchstart whether touchmoves of that touch can be cancelled,
    // based on the non-passive touch listeners that exist at that moment. A listener added
    // only once the long-press fires would be too late, so keep one registered all along.
    win.addEventListener("touchmove", noop, { passive: false });
    win.addEventListener("pointerdown", this.onAnyDown, true);
  }

  unmount(): void {
    this.cancel();
    this.mounted = false;
    const { win } = this.env;
    win.removeEventListener("touchmove", noop);
    win.removeEventListener("pointerdown", this.onAnyDown, true);
  }

  // React ref callback for the grid root (see dom.ts for the data-* contract)
  setGrid = (el: HTMLElement | null): void => {
    this.grid = el;
  };

  // pointerType of the latest pointerdown anywhere ("mouse" | "touch" | "pen")
  get lastPointerType(): string {
    return this.lastType;
  }

  get busy(): boolean {
    return this.s !== null;
  }

  // contextmenu during a press, or from a touch/pen long-press, must not open a menu
  blocksContextMenu(): boolean {
    return this.s !== null || this.lastType !== "mouse";
  }

  // ---- entry points (from React onPointerDown) ----
  pressSource(e: PointerLike, el: HTMLElement, source: DragSource, opts: { hold?: boolean } = {}): void {
    if (this.s || !e.isPrimary) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const touch = e.pointerType === "touch";
    this.s = {
      type: "press",
      pointerId: e.pointerId,
      touch,
      source,
      el,
      rect: el.getBoundingClientRect(),
      startX: e.clientX,
      startY: e.clientY,
      x: e.clientX,
      y: e.clientY,
      timer: touch ? this.env.win.setTimeout(this.pickup, LONG_PRESS_MS) : null,
    };
    this.listen();
    this.set({ press: { source, hold: touch && !!opts.hold }, drag: null, resize: null });
  }

  pressBlock(e: PointerLike, el: HTMLElement, block: BlockGeom): void {
    if (this.s || !e.isPrimary) return;
    if (this.env.coarse()) {
      const r = el.getBoundingClientRect();
      const edge = edgeAt(e.clientX - r.left, e.clientY - r.top, r.width, r.height);
      // no capture: a tap here still clicks what is under the finger (done toggle, block)
      if (edge) return void this.startResize(e, el, block, edge, { capture: false });
    }
    this.pressSource(e, el, { kind: "move", id: block.id });
  }

  startResize(e: PointerLike, el: HTMLElement, block: BlockGeom, edge: ResizeEdge, opts: { capture: boolean }): boolean {
    if (this.s || !e.isPrimary) return false;
    if (e.pointerType === "mouse" && e.button !== 0) return false;
    const col = this.env.column(el);
    if (!col) return false;
    if (opts.capture) capture(el, e.pointerId);
    this.s = {
      type: "resize",
      pointerId: e.pointerId,
      touch: e.pointerType === "touch",
      id: block.id,
      edge,
      origStart: block.start,
      origMins: block.mins,
      el,
      startX: e.clientX,
      startY: e.clientY,
      x: e.clientX,
      y: e.clientY,
      startYInCol: e.clientY - col.top,
      rowH: col.rowH,
      delta: 0,
      moved: false,
    };
    this.listen();
    this.lockPage();
    this.startFrames();
    this.set({ press: null, drag: null, resize: { id: block.id, edge } });
    return true;
  }

  // drop everything: no change to the data (a resize is put back)
  cancel(): void {
    const s = this.s;
    if (!s) return;
    if (s.type === "resize" && s.delta !== 0) this.cb.onResize(s.id, s.edge, s.origStart, s.origMins, 0);
    this.end();
  }

  // ---- internals ----
  private set(next: EngineState) {
    if (next === IDLE && this.state === IDLE) return;
    this.state = next;
    this.cb.onChange(next);
  }

  private pickup = () => {
    const s = this.s;
    if (!s || s.type !== "press") return;
    if (s.timer !== null) this.env.win.clearTimeout(s.timer);
    // a moved block keeps its grab point (and lands where its ghost is); a tray ghost hangs off the pointer
    const off = ghostOffset(s.source, s.startX, s.startY, s.rect);
    const ghost = this.env.ghost(s.el, s.rect, off.x, off.y);
    ghost.moveTo(s.x, s.y);
    if (s.touch) {
      try {
        this.env.win.navigator.vibrate?.(10);
      } catch {
        // vibration is best-effort
      }
    } else capture(s.el, s.pointerId);
    this.s = {
      type: "drag",
      pointerId: s.pointerId,
      touch: s.touch,
      source: s.source,
      el: s.el,
      x: s.x,
      y: s.y,
      ghost,
      grabOffsetY: s.source.kind === "move" ? off.y : null,
      hit: null,
    };
    this.lockPage();
    this.updateHit(true);
    this.startFrames();
  };

  private updateHit(force = false) {
    const s = this.s;
    if (!s || s.type !== "drag") return;
    const hit = this.grid ? this.env.hitAt(this.grid, s.x, s.y, s.grabOffsetY) : null;
    if (!force && sameHit(hit, s.hit)) return;
    s.hit = hit;
    this.set({ press: null, drag: { source: s.source, hit }, resize: null });
  }

  private updateResize() {
    const s = this.s;
    if (!s || s.type !== "resize") return;
    const col = this.env.column(s.el);
    if (!col) return;
    const delta = resizeDeltaSlots(s.startYInCol, s.y - col.top, s.rowH);
    if (delta === s.delta) return;
    s.delta = delta;
    this.cb.onResize(s.id, s.edge, s.origStart, s.origMins, delta);
  }

  // Escape / blur: undo, then ignore the rest of this pointer's gesture (and its click)
  private abort() {
    const s = this.s;
    if (!s || s.type === "void") return;
    const pointerId = s.pointerId;
    this.cancel();
    this.s = { type: "void", pointerId };
    this.listen();
  }

  private end() {
    const s = this.s;
    if (!s) return;
    if (s.type === "press" && s.timer !== null) this.env.win.clearTimeout(s.timer);
    if (s.type === "drag") {
      s.ghost.remove();
      release(s.el, s.pointerId);
    }
    if (s.type === "resize") release(s.el, s.pointerId);
    this.s = null;
    this.unlockPage();
    this.stopFrames();
    this.unlisten();
    this.set(IDLE);
  }

  // ---- window listeners while a gesture runs ----
  private listen() {
    if (this.listening) return;
    this.listening = true;
    const { win } = this.env;
    win.addEventListener("pointermove", this.onMove);
    win.addEventListener("pointerup", this.onUp);
    win.addEventListener("pointercancel", this.onCancel);
    win.addEventListener("keydown", this.onKey);
    win.addEventListener("blur", this.onBlur);
  }

  private unlisten() {
    if (!this.listening) return;
    this.listening = false;
    const { win } = this.env;
    win.removeEventListener("pointermove", this.onMove);
    win.removeEventListener("pointerup", this.onUp);
    win.removeEventListener("pointercancel", this.onCancel);
    win.removeEventListener("keydown", this.onKey);
    win.removeEventListener("blur", this.onBlur);
  }

  // capture phase, before any source handler: remember the pointer type, and clear a
  // gesture whose pointerup we never saw (released outside the window, or after Escape)
  private onAnyDown = (e: PointerEvent) => {
    this.lastType = e.pointerType || "mouse";
    const s = this.s;
    if (s && (s.type === "void" || s.pointerId === e.pointerId)) this.cancel();
  };

  private onMove = (e: PointerEvent) => {
    const s = this.s;
    if (!s || s.type === "void" || e.pointerId !== s.pointerId) return;
    s.x = e.clientX;
    s.y = e.clientY;
    if (s.type === "press") {
      if (!exceedsSlop(s.x - s.startX, s.y - s.startY, s.touch ? TOUCH_SLOP : MOUSE_SLOP)) return;
      if (s.touch) this.end(); // moved before the long-press: a scroll, leave it to the browser
      else this.pickup();
      return;
    }
    if (s.type === "drag") {
      s.ghost.moveTo(s.x, s.y);
      this.updateHit(); // re-renders only when the slot / block under the pointer changes
      return;
    }
    if (!s.moved && exceedsSlop(s.x - s.startX, s.y - s.startY, s.touch ? TOUCH_SLOP : MOUSE_SLOP)) s.moved = true;
    this.updateResize();
  };

  private onUp = (e: PointerEvent) => {
    const s = this.s;
    if (!s || e.pointerId !== s.pointerId) return;
    if (s.type === "void") {
      this.end();
      this.env.suppressClick();
      return;
    }
    if (s.type === "press") {
      this.end(); // a tap: the click that follows does the work
      return;
    }
    s.x = e.clientX;
    s.y = e.clientY;
    if (s.type === "drag") {
      const hit = this.grid ? this.env.hitAt(this.grid, s.x, s.y, s.grabOffsetY) : null;
      const source = s.source;
      this.end();
      this.env.suppressClick();
      if (hit) this.cb.onDrop(source, hit);
      return;
    }
    this.updateResize();
    const changed = s.moved || s.delta !== 0;
    this.end();
    if (changed) this.env.suppressClick(); // a still tap on a grip still clicks through
  };

  private onCancel = (e: PointerEvent) => {
    const s = this.s;
    if (!s || e.pointerId !== s.pointerId) return;
    this.cancel();
  };

  private onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") this.abort();
  };

  private onBlur = () => this.abort();

  // ---- page lock: no scrolling, no text selection while dragging/resizing ----
  private preventTouch = (e: TouchEvent) => {
    if (e.cancelable) e.preventDefault();
  };

  private lockPage() {
    const doc = this.env.win.document;
    doc.addEventListener("touchmove", this.preventTouch, { passive: false });
    doc.documentElement.classList.add("cadence-dragging");
  }

  private unlockPage() {
    const doc = this.env.win.document;
    doc.removeEventListener("touchmove", this.preventTouch);
    doc.documentElement.classList.remove("cadence-dragging");
  }

  // ---- per-frame work: autoscroll near the viewport edges (then hit / resize again, since
  // the grid moved under a still pointer) ----
  private startFrames() {
    if (this.frame !== null) return;
    this.frame = this.env.raf(this.tick);
  }

  private stopFrames() {
    if (this.frame !== null) this.env.caf(this.frame);
    this.frame = null;
  }

  private tick = () => {
    this.frame = null;
    const s = this.s;
    if (!s || (s.type !== "drag" && s.type !== "resize")) return;
    const { win } = this.env;
    const v = autoscrollSpeed(s.y, win.innerHeight);
    if (v !== 0) {
      const before = win.scrollY;
      win.scrollBy(0, v);
      if (win.scrollY !== before) {
        if (s.type === "drag") this.updateHit();
        else this.updateResize();
      }
    }
    if (this.s === s) this.frame = this.env.raf(this.tick);
  };
}

const capture = (el: HTMLElement, pointerId: number) => {
  try {
    el.setPointerCapture?.(pointerId);
  } catch {
    // the pointer may already be gone
  }
};

const release = (el: HTMLElement, pointerId: number) => {
  try {
    if (el.hasPointerCapture?.(pointerId)) el.releasePointerCapture(pointerId);
  } catch {
    // nothing to release
  }
};
