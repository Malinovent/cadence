// Browser side of the interaction engine: measuring the grid, the drag ghost,
// swallowing the click that follows a drag, and the coarse-pointer query.
//
// DOM contract with the grid (WeekGrid today, the phone day view in task 9):
//   grid root (the scroll container)  ref={engine.setGrid}  data-row-h={rowH}
//   each day column                   data-day={dayIndex}   (Mon = 0)
//   each placed block                 data-block-id={id}
import { ROW_H } from "../lib/constants";
import { hitTest, type GridHit, type Rect } from "../lib/gesture";

export type Ghost = { moveTo(x: number, y: number): void; remove(): void };

const toRect = (r: DOMRect): Rect => ({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });

const rowHOf = (el: Element | null): number => {
  const root = el?.closest<HTMLElement>("[data-row-h]");
  const v = Number(root?.dataset.rowH);
  return v > 0 ? v : ROW_H;
};

// what is under viewport point (x, y) inside the grid root (grabOffsetY: see hitTest)
export const gridHitAt = (root: HTMLElement, x: number, y: number, grabOffsetY: number | null = null): GridHit | null => {
  const cols = Array.from(root.querySelectorAll<HTMLElement>("[data-day]"), (el) => ({
    day: Number(el.dataset.day),
    rect: toRect(el.getBoundingClientRect()),
  }));
  const blocks = Array.from(root.querySelectorAll<HTMLElement>("[data-block-id]"), (el) => ({
    id: el.dataset.blockId ?? "",
    rect: toRect(el.getBoundingClientRect()),
  }));
  return hitTest(x, y, toRect(root.getBoundingClientRect()), cols, blocks, rowHOf(root), grabOffsetY);
};

// the day column an element sits in: its current viewport top and the grid's row height
export const columnOf = (el: Element): { top: number; rowH: number } | null => {
  const col = el.closest<HTMLElement>("[data-day]");
  if (!col) return null;
  return { top: col.getBoundingClientRect().top, rowH: rowHOf(col) };
};

const TRANSIENT_ATTRS = ["data-press", "data-holding", "data-block-id", "data-day", "id"];

// A static copy of `source`, `size` big (measured at pointerdown, before any press scale),
// that follows the pointer (pointer-events none) with the pointer `offsetX/Y` inside it.
export const createGhost = (
  source: HTMLElement,
  size: { width: number; height: number },
  offsetX: number,
  offsetY: number,
): Ghost => {
  const doc = source.ownerDocument;
  const r = size;
  const cs = doc.defaultView?.getComputedStyle(source);
  const wrap = doc.createElement("div");
  wrap.className = "cadence-ghost";
  wrap.setAttribute("aria-hidden", "true");
  Object.assign(wrap.style, {
    position: "fixed",
    left: "0",
    top: "0",
    width: `${r.width}px`,
    height: `${r.height}px`,
    pointerEvents: "none",
    zIndex: "1000",
    opacity: "0.95",
    willChange: "transform",
    fontFamily: cs?.fontFamily ?? "",
    color: cs?.color ?? "",
  });
  const clone = source.cloneNode(true) as HTMLElement;
  for (const el of [clone, ...Array.from(clone.querySelectorAll("*"))]) {
    for (const a of TRANSIENT_ATTRS) el.removeAttribute(a);
  }
  Object.assign(clone.style, {
    position: "relative",
    top: "0",
    left: "0",
    right: "auto",
    bottom: "auto",
    width: "100%",
    height: "100%",
    margin: "0",
    transform: "none",
    transition: "none",
    opacity: "1",
    outline: "none",
    boxShadow: "3px 3px 0 rgba(0,0,0,0.2)",
  });
  wrap.appendChild(clone);
  doc.body.appendChild(wrap);
  return {
    moveTo(x, y) {
      wrap.style.transform = `translate(${x - offsetX}px, ${y - offsetY}px) rotate(-1.5deg)`;
    },
    remove() {
      wrap.remove();
    },
  };
};

// Swallow the click the browser sends after a drag/resize ends, so it does not open the
// editor, arm the tray or place a block. Capture phase on window runs before React's root
// listener. Gives up after `ms` so a later real click is never eaten.
export const suppressNextClick = (win: Window, ms = 400): void => {
  const swallow = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    done();
  };
  const done = () => {
    win.removeEventListener("click", swallow, true);
    win.clearTimeout(timer);
  };
  win.addEventListener("click", swallow, true);
  const timer = win.setTimeout(done, ms);
};

export const isCoarsePointer = (win: Window): boolean => win.matchMedia?.("(pointer: coarse)").matches ?? false;

// S1.4: the phone dock (areas and tasks tray) is fixed to the bottom and covers the grid there.
// Its top is the bottom of what the user can drop on; innerHeight when there is no dock.
export const DOCK_ATTR = "data-cadence-dock";
export const dockTop = (win: Window): number => {
  const dock = win.document.querySelector(`[${DOCK_ATTR}]`);
  const top = dock?.getBoundingClientRect().top;
  return top !== undefined && top > 0 && top < win.innerHeight ? top : win.innerHeight;
};
