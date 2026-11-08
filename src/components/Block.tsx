import { blendGradient } from "../lib/blend";
import type React from "react";
import type { InteractionEngine } from "../interaction/engine";
import { AreaIconView } from "./AreaIconView";
import { blockText, tallerThan } from "../lib/dayview";
import { blockBox, GRIP_MIN_WIDTH, GRIP_SPAN, gripZones, withAlpha } from "../lib/gesture";
import type { Block as BlockT, Category, Task } from "../lib/model";
import { fmtLeft } from "../lib/now";
import { fmtDur, fmtTime } from "../lib/time";
import type { CadenceActions } from "../state/useCadence";
import { BUFFER_COLOR } from "../lib/constants";
import { ink, nowRing, paper, S } from "../styles";
import BlockEditor from "./BlockEditor";
import { useI18n } from "../i18n/I18nProvider";

export type ResizeEdge = "top" | "bottom";

type Props = {
  block: BlockT;
  cats: Category[];
  isEditing: boolean;
  sheet?: boolean; // phone: the block opens in the sheet (App), so it isn't edited inline
  narrow?: boolean; // the phone's week: a slim column, so the area's icon (or initial) and the tick only
  dayStart?: number; // minutes: the grid's first hour (Settings → Your day)
  setEditingId: (id: string | null) => void;
  engine: InteractionEngine;
  rowH: number; // px per 30-min row
  colHeight: number; // px height of the day column (grips never reach outside it)
  pressed: boolean; // pointer is down on it (press feedback)
  lifted: boolean; // being moved: the original stays in place, faded
  tagColor: string | null; // a tray category is hovering it: dropping adds that tag
  onTap: (p: BlockT) => void; // a click/tap that was not a drag
  onContextMenu: (e: React.MouseEvent, p: BlockT) => void;
  onToggleDone: (id: string) => void;
  minsLeft: number | null; // the block is happening now: whole minutes left; otherwise null
  onMoveToDay: (p: BlockT, day: number) => void;
  actions: Pick<CadenceActions, "addTag" | "removeTag" | "updateBlock" | "removeBlock" | "attachTask" | "detachTask">;
  tasks: Task[]; // all of them: the popup lists the open ones to add
  weeks: [BlockT[], BlockT[]];
  todos: Task[]; // S1.5: the block's to-do list (empty for a single-task block: its tick is the task's)
  onToggleTask: (taskId: string) => void;
};

// Width of the touch grip strips outside a block, in its day column (the block is inset 3px
// each side): the middle GRIP_SPAN of the block, at least GRIP_MIN_WIDTH, never wider than the
// block. Same rule as gripSpan() in lib/gesture.ts, which the inside part uses.
const GRIP_ZONE_WIDTH = `min(calc(100% - 6px), max(${GRIP_MIN_WIDTH}px, calc((100% - 6px) * ${GRIP_SPAN})))`;

export default function Block({
  block: p,
  cats: allCats,
  isEditing,
  sheet = false,
  narrow = false,
  dayStart,
  setEditingId,
  engine,
  rowH,
  colHeight,
  pressed,
  lifted,
  tagColor,
  onTap,
  onContextMenu,
  onToggleDone,
  minsLeft,
  onMoveToDay,
  actions,
  todos,
  onToggleTask,
  tasks,
  weeks,
}: Props) {
  const { m, lang } = useI18n();
  const cats = p.catIds.map((id) => allCats.find((c) => c.id === id)).filter((c): c is Category => !!c);
  const buffer = p.buffer === true; // S1.2: unassigned time, grey dashed, no tick
  const colors = buffer ? [BUFFER_COLOR] : cats.length ? cats.map((c) => c.color) : ["#999"];
  const { top, height } = blockBox(p.start, p.mins, rowH, dayStart);
  const named = !!p.label;
  const baseColor = colors[0];
  const multi = colors.length > 1;
  // several areas: each area's icon in its colour, a dot for one without an icon (JP, 2026-11-08)
  const marks = (size: number, column = false) => (
    <span
      style={{ ...S.pipRow, gap: column ? 1 : 3, alignItems: "center", ...(column ? { flexDirection: "column" } : {}) }}
    >
      {cats.map((c) =>
        c.icon ? (
          <AreaIconView key={c.id} icon={c.icon} size={size} style={{ color: c.color }} />
        ) : (
          <span key={c.id} style={{ ...S.pip, background: c.color }} />
        ),
      )}
    </span>
  );
  // three states: empty -> dashed hollow | named -> solid hollow | done -> the area's tint, solid ring
  // (sprint 1: done blocks are tinted, no longer filled, so ink text stays readable on every colour)
  const done = p.done;
  const onColor = done ? ink : baseColor;
  const gradient = multi ? blendGradient(colors) : null;
  const TINT = "2e"; // ~18% of the area colour over the grid background
  const tint = (c: string) => withAlpha(c, TINT);
  const isNow = minsLeft !== null;

  // Single-type keeps plain CSS borders. Multi-type paints the gradient into
  // the border ring using mask-composite, which (unlike border-image) keeps border-radius.
  let blockStyle: React.CSSProperties;
  let ringOverlay: React.ReactNode = null;
  if (!multi) {
    blockStyle = {
      // tint over the grid colour, so slot lines never show through
      background: done ? `linear-gradient(${tint(baseColor)}, ${tint(baseColor)}), var(--c-card)` : "var(--c-card)",
      border: (done || named) && !buffer ? `1.5px solid ${baseColor}` : `1.5px dashed ${baseColor}`,
    };
  } else {
    // multi-type: gradient ring drawn by an overlay; done adds the blended tint inside
    blockStyle = {
      background: done ? `${blendGradient(colors.map(tint))}, var(--c-card)` : "var(--c-card)",
      border: "none",
    };
    // gaps punched along the ring to mimic a dashed border
    const dashMask = named || done ? null : "repeating-linear-gradient(135deg, #000 0 5px, transparent 5px 10px)";
    ringOverlay = (
      // keyed on the variant so switching dashed <-> solid remounts with a clean mask
      <div
        key={named || done ? "solid" : "dashed"}
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 4,
          padding: 1.5, // ring thickness
          background: gradient ?? undefined,
          WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          maskComposite: "exclude",
          pointerEvents: "none",
          ...(dashMask
            ? {
                WebkitMaskImage: `linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0), ${dashMask}`,
                maskImage: `linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0), ${dashMask}`,
              }
            : {}),
        }}
      />
    );
  }
  // Show description once there's room beneath the title row, time last. Thresholds are
  // the legacy px values for 26px rows, compared in rows so they scale with rowH.
  const text = blockText(height, rowH, !!p.desc);
  const inline = isEditing && !sheet; // the editor sits in the block (desktop, tablet)
  const showDesc = !inline && text.desc;
  const showTime = !inline && text.time;
  // the "Now · 38 min left" line gets its own row in blocks of an hour or more; shorter blocks
  // show it in place of the duration
  const nowRoom = tallerThan(height, rowH, 46);

  // mouse: invisible 7px edge handles (hidden on coarse pointers, see styles.ts)
  const edgeHandle = (edge: ResizeEdge) => (
    <div
      className="cadence-edge"
      style={edge === "top" ? S.resizeHandle : { ...S.resizeHandle, top: "auto", bottom: 0 }}
      onPointerDown={(e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        engine.startResize(e, e.currentTarget, p, edge, { capture: true });
      }}
      onClick={(e) => e.stopPropagation()}
    />
  );

  // touch (coarse pointers only, see styles.ts): the visible grips, and the part of their
  // hit area outside the block. The part inside is handled by engine.pressBlock. These are
  // siblings of the block in the day column so they can reach past its clipped edges.
  const zones = gripZones(top, height, colHeight);
  const gripColor = baseColor;
  const gripFade = lifted ? 0.35 : undefined;
  const outsideZone = (edge: ResizeEdge) => {
    const h = edge === "top" ? zones.outsideTop : zones.outsideBottom;
    if (h <= 0) return null;
    return (
      <div
        className="cadence-grip"
        style={{ ...S.gripZone, top: edge === "top" ? top - h : top + height, height: h, width: GRIP_ZONE_WIDTH }}
        onPointerDown={(e) => {
          e.stopPropagation();
          engine.startResize(e, e.currentTarget, p, edge, { capture: true });
        }}
      />
    );
  };

  return (
    <>
      <div
        data-block-id={p.id}
        className={inline ? "cadence-block" : "cadence-src cadence-block"}
        data-press={pressed ? "" : undefined}
        onPointerDown={(e) => {
          // the open editor's own controls must never pick the block up
          if (!isEditing) engine.pressBlock(e, e.currentTarget, p);
        }}
        onClick={() => onTap(p)}
        onContextMenu={(e) => onContextMenu(e, p)}
        title={buffer ? m.block.bufferTitle : m.block.title}
        style={{
          ...S.placedBlock,
          top,
          height,
          ...blockStyle,
          // keep text inset identical whether the ring is a real border or the masked overlay
          padding: narrow ? "2px 1px" : multi ? "6.5px 8.5px" : "5px 7px",
          color: onColor,
          cursor: inline ? "default" : "grab",
          zIndex: inline ? 20 : isNow ? 3 : 2,
          // open in the phone sheet: a double ring says which block it is
          boxShadow:
            isEditing && sheet ? `0 0 0 2px ${paper}, 0 0 0 4px ${ink}` : isNow ? nowRing : S.placedBlock.boxShadow,
          overflow: inline ? "visible" : "hidden",
          transition: "background 0.15s, transform 0.12s, opacity 0.12s",
          opacity: lifted ? 0.35 : undefined,
          outline: tagColor ? `2px solid ${tagColor}` : undefined,
        }}
      >
        {ringOverlay}
        {!inline && edgeHandle("top")}
        {narrow && !inline && (
          <div style={S.narrowBody}>
            {buffer ? null : !multi && cats[0]?.icon ? (
              <AreaIconView icon={cats[0].icon} size={13} />
            ) : multi ? (
              marks(11, true)
            ) : (
              <span style={S.narrowInitial}>{(cats[0]?.name ?? "?").slice(0, 1)}</span>
            )}
            {!buffer && tallerThan(height, rowH, 40) && (
              <button
                type="button"
                className="cadence-tick"
                aria-pressed={done}
                aria-label={done ? m.block.markOpen : m.block.markDone}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleDone(p.id);
                }}
                style={{
                  ...S.doneToggle,
                  ...S.narrowTick,
                  background: done ? ink : "transparent",
                  color: done ? paper : ink,
                }}
              >
                {done ? "✓" : ""}
              </button>
            )}
          </div>
        )}
        {!narrow && minsLeft !== null && nowRoom && (
          <div style={S.nowBadge}>
            <span style={S.nowTag}>{m.block.now}</span>
            {fmtLeft(minsLeft, m.lib)}
          </div>
        )}
        {!narrow && (
          <div style={S.placedTop}>
            <span style={S.placedNameWrap}>
              {multi && marks(12)}
              {buffer ? (
                <span style={{ ...S.placedName, ...S.bufferName }}>{m.lib.panel.buffer}</span>
              ) : (
                <span style={S.placedName}>
                  {!multi && cats[0]?.icon && (
                    <AreaIconView icon={cats[0].icon} size={12} style={{ marginRight: 4, verticalAlign: "-2px" }} />
                  )}
                  {cats.map((c) => c.name).join(" + ") || "?"}
                </span>
              )}
            </span>
            <div style={S.placedTopRight}>
              <span style={{ ...S.placedDur, color: isNow ? ink : baseColor }}>
                {minsLeft !== null && !nowRoom ? `${m.block.now} · ${fmtLeft(minsLeft, m.lib)}` : fmtDur(p.mins, lang)}
              </span>
              {!buffer && (
                <button
                  type="button"
                  className="cadence-tick cadence-hit44"
                  data-coach={`tick-${p.id}`}
                  aria-pressed={done}
                  aria-label={done ? m.block.markOpen : m.block.markDone}
                  title={done ? m.block.doneTitle : m.block.markDone}
                  // a tap on the tick never picks the block up or starts a resize
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleDone(p.id);
                  }}
                  style={{
                    ...S.doneToggle,
                    background: done ? ink : "transparent",
                    color: done ? paper : ink,
                  }}
                >
                  {done ? "✓" : ""}
                </button>
              )}
            </div>
          </div>
        )}
        {narrow && !inline ? null : inline ? (
          <BlockEditor
            block={p}
            cats={allCats}
            tasks={tasks}
            weeks={weeks}
            baseColor={baseColor}
            onClose={() => setEditingId(null)}
            onDelete={() => {
              actions.removeBlock(p.id);
              setEditingId(null);
            }}
            onMoveToDay={(day) => onMoveToDay(p, day)}
            actions={actions}
          />
        ) : (
          <>
            {p.label && <div style={S.placedLabel}>{p.label}</div>}
            {todos.length > 0 && (
              // S1.5: the block's tasks as checkboxes; they come first, the description and time make way
              <ul style={S.blockTodos} aria-label={m.block.todos}>
                {todos.map((t) => (
                  <li key={t.id} style={S.blockTodo}>
                    <button
                      type="button"
                      className="cadence-hit44"
                      aria-pressed={t.done}
                      aria-label={t.done ? m.tasks.markOpen(t.name) : m.tasks.markDone(t.name)}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleTask(t.id);
                      }}
                      style={{ ...S.blockTodoBox, borderColor: onColor, background: t.done ? ink : "transparent" }}
                    >
                      {t.done ? "✓" : ""}
                    </button>
                    <span style={{ ...S.blockTodoName, ...(t.done ? S.taskNameDone : {}) }}>{t.name}</span>
                  </li>
                ))}
              </ul>
            )}
            {showDesc && todos.length === 0 && (
              <div style={{ ...S.placedDesc, opacity: 0.75, WebkitLineClamp: text.descLines }}>{p.desc}</div>
            )}
            {showTime && todos.length === 0 && (
              <div style={{ ...S.placedTime, opacity: 0.65 }}>
                {fmtTime(p.start, lang)}–{fmtTime(p.start + p.mins, lang)}
              </div>
            )}
          </>
        )}
        {!inline && edgeHandle("bottom")}
      </div>
      {!inline && (
        <>
          {outsideZone("top")}
          {outsideZone("bottom")}
          <div
            className="cadence-grip"
            style={{ ...S.gripBar, top: top - 2, background: gripColor, opacity: gripFade }}
          />
          <div
            className="cadence-grip"
            style={{ ...S.gripBar, top: top + height - 2, background: gripColor, opacity: gripFade }}
          />
        </>
      )}
    </>
  );
}
