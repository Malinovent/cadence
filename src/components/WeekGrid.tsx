import type React from "react";
import { useEffect, useRef } from "react";
import type { Interaction } from "../interaction/useInteraction";
import type { WeekIndex } from "../lib/actions";
import { BUFFER_ID, DAYS, ROW_H, STEP } from "../lib/constants";
import { DEFAULT_HOURS as DEFAULT_BOUNDS } from "../lib/dayHours";
import type { Bounds } from "../lib/placement";
import { daysWithBlocks, swipeDay } from "../lib/dayview";
import { blockBox, dropPreview, resolveDrop, slotStartAt } from "../lib/gesture";
import type { Block as BlockT, Category, Task } from "../lib/model";
import { blockTasks, singleTaskOf } from "../lib/tasks";
import { canAddAt, type SlotTap } from "../lib/slotMenu";
import { fmtClock, isNowBlock, minutesLeft, nowLineTop, nowPoint } from "../lib/now";
import { fmtTime } from "../lib/time";
import type { CadenceActions } from "../state/useCadence";
import { ink, line, paper, paper2, S } from "../styles";
import { useNow } from "../state/useNow";
import { useI18n } from "../i18n/I18nProvider";
import Block from "./Block";

// the rows: one per half hour of the hours shown (Settings → Your day)
const slotsOf = ([from, to]: Bounds): number[] => {
  const out: number[] = [];
  for (let t = from; t < to; t += STEP) out.push(t);
  return out;
};

const ALL_DAYS = DAYS.map((_, i) => i);

type Props = {
  week: WeekIndex;
  blocks: BlockT[];
  cats: Category[];
  tasks: Task[]; // S1.5: for block to-do lists and the block popup
  weeks: [BlockT[], BlockT[]]; // both weeks: the popup says where a task sits now
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  interaction: Interaction;
  armedCatId: string | null; // tap-to-place: tray category waiting for a slot tap
  onPlaced: () => void; // tap-to-place used its one placement
  actions: Pick<
    CadenceActions,
    | "placeBlock"
    | "moveBlock"
    | "addTag"
    | "removeTag"
    | "updateBlock"
    | "removeBlock"
    | "toggleDone"
    | "toggleTask"
    | "attachTask"
    | "detachTask"
  >;
  rowH?: number; // px per 30-min row (desktop ROW_H)
  days?: readonly number[]; // day indexes shown as columns, Mon = 0 (desktop: all seven)
  // phone one-day view: the day strip replaces the head row, swipes change day
  phone?: { day: number; setDay: (day: number) => void };
  /** the phone's week (JP, 2026-11-08): seven slim columns that do everything the day does */
  narrow?: boolean;
  onMoveToDay?: (p: BlockT, day: number) => void; // editor day chips (default: moveBlock)
  onEmptyTap?: (tap: SlotTap) => void; // S1.6: tap on empty time with nothing armed
  slotMark?: { day: number; start: number } | null; // S1.6: the slot the add window is for
  bounds?: Bounds; // the hours shown (Settings → Your day, widened to hold every block); 7:00–23:00
};

// x/y where a touch went down on the grid body, and whether the engine dragged/resized since
type SwipeStart = { x: number; y: number; busy: boolean };

export default function WeekGrid({
  week,
  blocks,
  cats,
  tasks,
  weeks,
  editingId,
  setEditingId,
  interaction,
  armedCatId,
  onPlaced,
  actions,
  rowH = ROW_H,
  days = ALL_DAYS,
  phone,
  narrow = false,
  onMoveToDay: onMoveToDayProp,
  onEmptyTap,
  slotMark,
  bounds = DEFAULT_BOUNDS,
}: Props) {
  const { engine, state } = interaction;
  const { m, lang } = useI18n();
  const cols = phone ? "52px 1fr" : narrow ? `26px repeat(${days.length}, minmax(0, 1fr))` : `64px repeat(${days.length}, 1fr)`;
  const slots = slotsOf(bounds);
  const colHeight = slots.length * rowH;

  // what the current drag would do: outline the landing spot, or highlight the block to tag
  const drag = state.drag;
  const intent = drag?.hit ? resolveDrop(drag.source, drag.hit) : null;
  const preview = intent ? dropPreview(blocks, cats, intent, bounds) : null;
  const tagTargetId = intent?.kind === "tag" || intent?.kind === "attach" ? intent.blockId : null;
  // the outline on the block a drop would add to: the dragged area's colour, ink for a task
  const dragCatId = drag?.source.kind === "tray" ? drag.source.catId : null;
  const tagColor = cats.find((c) => c.id === dragCatId)?.color ?? (drag?.source.kind === "task" ? ink : null);
  const liftedId = drag?.source.kind === "move" ? drag.source.id : null;
  const pressedId = state.press?.source.kind === "move" ? state.press.source.id : null;

  const onToggleDone = (id: string) => actions.toggleDone(week, id);

  // now: the block under way gets an outline and "minutes left"; a line marks the time today
  const point = nowPoint(useNow());
  const lineTop = nowLineTop(week, point, rowH, bounds);
  const today = days.includes(point.day) ? point.day : null;

  // a tap that closes the block editor (outside it) must not also open the add window
  const editorClosedAt = useRef(0);
  const prevEditing = useRef(editingId);
  useEffect(() => {
    if (prevEditing.current && !editingId) editorClosedAt.current = Date.now();
    prevEditing.current = editingId;
  }, [editingId]);

  // a tap on an empty spot: places the armed category there, or (nothing armed) opens the add window
  const onColumnClick = (e: React.MouseEvent<HTMLDivElement>, day: number) => {
    if ((e.target as Element).closest("[data-block-id]")) return; // the block handles its own tap
    const start = slotStartAt(e.clientY - e.currentTarget.getBoundingClientRect().top, rowH, bounds);
    if (!armedCatId) {
      if (!onEmptyTap || editingId || Date.now() - editorClosedAt.current < 400) return;
      if (canAddAt(blocks, day, start, bounds)) onEmptyTap({ day, start, x: e.clientX, y: e.clientY });
      return;
    }
    // a full day places nothing; stay armed so another slot can be tried
    if (!dropPreview(blocks, cats, { kind: "place", catId: armedCatId, day, start }, bounds)) return;
    actions.placeBlock(week, armedCatId, day, start);
    onPlaced();
  };

  // a tap on a block: adds the armed category, otherwise opens the editor
  const onBlockTap = (p: BlockT) => {
    if (armedCatId === BUFFER_ID) return; // a buffer isn't a tag: tap an empty slot to place it
    if (armedCatId) {
      actions.addTag(p.id, armedCatId);
      onPlaced();
    } else if (editingId !== p.id) setEditingId(p.id);
  };

  // desktop right-click deletes; a touch long-press must not
  const onBlockContextMenu = (e: React.MouseEvent, p: BlockT) => {
    e.preventDefault();
    if (engine.lastPointerType !== "mouse") return;
    engine.cancel();
    actions.removeBlock(p.id);
  };

  const onMoveToDay = onMoveToDayProp ?? ((p: BlockT, day: number) => actions.moveBlock(week, p.id, day, p.start));

  // phone: a horizontal swipe on the body changes day, unless the engine dragged or resized
  const swipe = useRef<SwipeStart | null>(null);
  const engineActive = !!(state.drag || state.resize);
  useEffect(() => {
    if (engineActive && swipe.current) swipe.current.busy = true;
  }, [engineActive]);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    swipe.current = e.touches.length === 1 && t ? { x: t.clientX, y: t.clientY, busy: engineActive } : null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = swipe.current;
    const t = e.changedTouches[0];
    swipe.current = null;
    if (!phone || !s || !t) return;
    const next = swipeDay(phone.day, t.clientX - s.x, t.clientY - s.y, s.busy || engineActive);
    if (next !== null) phone.setDay(next);
  };
  const onTouchCancel = () => {
    swipe.current = null;
  };

  return (
    <div ref={engine.setGrid} data-row-h={rowH} data-day-start={bounds[0]} data-day-end={bounds[1]} style={S.gridWrap}>
      {phone ? (
        <DayStrip day={phone.day} setDay={phone.setDay} hasBlocks={daysWithBlocks(blocks)} />
      ) : (
        <div style={{ ...S.headRow, gridTemplateColumns: cols, ...(narrow ? { minWidth: 0 } : {}) }}>
          <div style={S.corner} />
          {days.map((d) => (
            <div
              key={d}
              style={{
                ...S.dayHead,
                ...(narrow ? S.narrowHead : {}),
                ...(narrow && d === today ? { textDecoration: "underline", textUnderlineOffset: 3 } : {}),
              }}
            >
              {m.lib.days[d]}
            </div>
          ))}
        </div>
      )}
      <div
        style={
          phone
            ? { display: "grid", gridTemplateColumns: cols }
            : { ...S.bodyRow, gridTemplateColumns: cols, ...(narrow ? { minWidth: 0 } : {}) }
        }
        onTouchStart={phone ? onTouchStart : undefined}
        onTouchEnd={phone ? onTouchEnd : undefined}
        onTouchCancel={phone ? onTouchCancel : undefined}
      >
        <div style={S.timeColWrap}>
          {slots.map((t) => (
            <div
              key={t}
              style={{ ...S.timeLabel, height: rowH, opacity: t % 60 === 0 ? 1 : 0, ...(narrow ? { padding: "1px 3px" } : {}) }}
            >
              {t % 60 === 0 ? (narrow ? String(t / 60) : fmtTime(t, lang)) : ""}
            </div>
          ))}
          {lineTop !== null && today !== null && !narrow && (
            <div style={{ ...S.nowClock, top: lineTop }} aria-hidden="true">
              {fmtClock(point, lang)}
            </div>
          )}
        </div>
        {days.map((di) => (
          <div key={di} data-day={di} style={{ ...S.dayCol, height: colHeight }} onClick={(e) => onColumnClick(e, di)}>
            {slots.map((t, si) => (
              <div
                key={t}
                style={{
                  ...S.slotLine,
                  top: si * rowH,
                  height: rowH,
                  borderBottomColor: t % 60 === 30 ? line : paper2,
                }}
              />
            ))}
            {blocks
              .filter((p) => p.day === di)
              .map((p) => (
                <Block
                  key={p.id}
                  block={p}
                  cats={cats}
                  isEditing={editingId === p.id}
                  sheet={!!phone || narrow}
                  narrow={narrow}
                  dayStart={bounds[0]}
                  setEditingId={setEditingId}
                  engine={engine}
                  rowH={rowH}
                  colHeight={colHeight}
                  pressed={pressedId === p.id}
                  lifted={liftedId === p.id}
                  tagColor={tagTargetId === p.id ? tagColor : null}
                  onTap={onBlockTap}
                  onContextMenu={onBlockContextMenu}
                  onToggleDone={onToggleDone}
                  minsLeft={isNowBlock(p, week, point) ? minutesLeft(p, point) : null}
                  onMoveToDay={onMoveToDay}
                  actions={actions}
                  todos={singleTaskOf(tasks, p) ? [] : blockTasks(tasks, p.id)}
                  onToggleTask={(id) => actions.toggleTask(id)}
                  tasks={tasks}
                  weeks={weeks}
                />
              ))}
            {preview && preview.day === di && (
              <div style={{ ...S.dropPreview, ...blockBox(preview.start, preview.mins, rowH, bounds[0]) }} />
            )}
            {slotMark && slotMark.day === di && (
              <div style={{ ...S.slotMark, ...blockBox(slotMark.start, STEP, rowH, bounds[0]) }} aria-hidden="true" />
            )}
            {lineTop !== null && di === today && <div style={{ ...S.nowLine, top: lineTop - 1 }} aria-hidden="true" />}
          </div>
        ))}
      </div>
    </div>
  );
}

// phone: Mon-Sun strip in place of the head row; a dot marks days with blocks this week
function DayStrip({ day, setDay, hasBlocks }: { day: number; setDay: (d: number) => void; hasBlocks: boolean[] }) {
  const { m } = useI18n();
  return (
    <div style={S.dayStrip}>
      {m.lib.days.map((name, i) => {
        const on = i === day;
        return (
          <button
            key={name}
            onClick={() => setDay(i)}
            aria-pressed={on}
            style={{ ...S.dayStripBtn, background: on ? ink : "transparent", color: on ? paper : ink }}
          >
            {name}
            <span style={{ ...S.dayDot, background: hasBlocks[i] ? (on ? paper : "var(--c-faint)") : "transparent" }} />
          </button>
        );
      })}
    </div>
  );
}
