import type React from "react";
import { useEffect, useRef } from "react";
import type { Interaction } from "../interaction/useInteraction";
import type { WeekIndex } from "../lib/actions";
import { DAY_END, DAY_START, DAYS, ROW_H, STEP } from "../lib/constants";
import { daysWithBlocks, swipeDay } from "../lib/dayview";
import { blockBox, dropPreview, resolveDrop, slotStartAt } from "../lib/gesture";
import type { Block as BlockT, Category } from "../lib/model";
import { fmtClock, isNowBlock, minutesLeft, nowLineTop, nowPoint } from "../lib/now";
import { fmtTime } from "../lib/time";
import type { CadenceActions } from "../state/useCadence";
import { ink, line, paper, paper2, S } from "../styles";
import { useNow } from "../state/useNow";
import Block from "./Block";

const SLOTS: number[] = [];
for (let t = DAY_START; t < DAY_END; t += STEP) SLOTS.push(t);

const ALL_DAYS = DAYS.map((_, i) => i);

type Props = {
  week: WeekIndex;
  blocks: BlockT[];
  cats: Category[];
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  interaction: Interaction;
  armedCatId: string | null; // tap-to-place: tray category waiting for a slot tap
  onPlaced: () => void; // tap-to-place used its one placement
  actions: Pick<
    CadenceActions,
    "placeBlock" | "moveBlock" | "addTag" | "removeTag" | "updateBlock" | "removeBlock" | "toggleDone"
  >;
  rowH?: number; // px per 30-min row (desktop ROW_H)
  days?: readonly number[]; // day indexes shown as columns, Mon = 0 (desktop: all seven)
  // phone one-day view: the day strip replaces the head row, swipes change day
  phone?: { day: number; setDay: (day: number) => void };
  onMoveToDay?: (p: BlockT, day: number) => void; // editor day chips (default: moveBlock)
};

// x/y where a touch went down on the grid body, and whether the engine dragged/resized since
type SwipeStart = { x: number; y: number; busy: boolean };

export default function WeekGrid({
  week,
  blocks,
  cats,
  editingId,
  setEditingId,
  interaction,
  armedCatId,
  onPlaced,
  actions,
  rowH = ROW_H,
  days = ALL_DAYS,
  phone,
  onMoveToDay: onMoveToDayProp,
}: Props) {
  const { engine, state } = interaction;
  const cols = phone ? "52px 1fr" : `64px repeat(${days.length}, 1fr)`;
  const colHeight = SLOTS.length * rowH;

  // what the current drag would do: outline the landing spot, or highlight the block to tag
  const drag = state.drag;
  const intent = drag?.hit ? resolveDrop(drag.source, drag.hit) : null;
  const preview = intent ? dropPreview(blocks, cats, intent) : null;
  const tagTargetId = intent?.kind === "tag" ? intent.blockId : null;
  const dragCatId = drag?.source.kind === "tray" ? drag.source.catId : null;
  const tagColor = cats.find((c) => c.id === dragCatId)?.color ?? null;
  const liftedId = drag?.source.kind === "move" ? drag.source.id : null;
  const pressedId = state.press?.source.kind === "move" ? state.press.source.id : null;

  const onToggleDone = (id: string) => actions.toggleDone(week, id);

  // now: the block under way gets an outline and "minutes left"; a line marks the time today
  const point = nowPoint(useNow());
  const lineTop = nowLineTop(week, point, rowH);
  const today = days.includes(point.day) ? point.day : null;

  // tap-to-place: a tap on an empty spot places the armed category there
  const onColumnClick = (e: React.MouseEvent<HTMLDivElement>, day: number) => {
    if (!armedCatId) return;
    if ((e.target as Element).closest("[data-block-id]")) return; // the block handles its own tap
    const start = slotStartAt(e.clientY - e.currentTarget.getBoundingClientRect().top, rowH);
    // a full day places nothing; stay armed so another slot can be tried
    if (!dropPreview(blocks, cats, { kind: "place", catId: armedCatId, day, start })) return;
    actions.placeBlock(week, armedCatId, day, start);
    onPlaced();
  };

  // a tap on a block: adds the armed category, otherwise opens the editor
  const onBlockTap = (p: BlockT) => {
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
    <div ref={engine.setGrid} data-row-h={rowH} style={S.gridWrap}>
      {phone ? (
        <DayStrip day={phone.day} setDay={phone.setDay} hasBlocks={daysWithBlocks(blocks)} />
      ) : (
        <div style={{ ...S.headRow, gridTemplateColumns: cols }}>
          <div style={S.corner} />
          {days.map((d) => (
            <div key={d} style={S.dayHead}>
              {DAYS[d]}
            </div>
          ))}
        </div>
      )}
      <div
        style={phone ? { display: "grid", gridTemplateColumns: cols } : { ...S.bodyRow, gridTemplateColumns: cols }}
        onTouchStart={phone ? onTouchStart : undefined}
        onTouchEnd={phone ? onTouchEnd : undefined}
        onTouchCancel={phone ? onTouchCancel : undefined}
      >
        <div style={S.timeColWrap}>
          {SLOTS.map((t) => (
            <div key={t} style={{ ...S.timeLabel, height: rowH, opacity: t % 60 === 0 ? 1 : 0 }}>
              {t % 60 === 0 ? fmtTime(t) : ""}
            </div>
          ))}
          {lineTop !== null && today !== null && (
            <div style={{ ...S.nowClock, top: lineTop }} aria-hidden="true">
              {fmtClock(point)}
            </div>
          )}
        </div>
        {days.map((di) => (
          <div key={di} data-day={di} style={{ ...S.dayCol, height: colHeight }} onClick={(e) => onColumnClick(e, di)}>
            {SLOTS.map((t, si) => (
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
                />
              ))}
            {preview && preview.day === di && <div style={{ ...S.dropPreview, ...blockBox(preview.start, preview.mins, rowH) }} />}
            {lineTop !== null && di === today && <div style={{ ...S.nowLine, top: lineTop - 1 }} aria-hidden="true" />}
          </div>
        ))}
      </div>
    </div>
  );
}

// phone: Mon-Sun strip in place of the head row; a dot marks days with blocks this week
function DayStrip({ day, setDay, hasBlocks }: { day: number; setDay: (d: number) => void; hasBlocks: boolean[] }) {
  return (
    <div style={S.dayStrip}>
      {DAYS.map((name, i) => {
        const on = i === day;
        return (
          <button
            key={name}
            onClick={() => setDay(i)}
            aria-pressed={on}
            style={{ ...S.dayStripBtn, background: on ? ink : "transparent", color: on ? paper : ink }}
          >
            {name}
            <span style={{ ...S.dayDot, background: hasBlocks[i] ? (on ? paper : "#9a8d7d") : "transparent" }} />
          </button>
        );
      })}
    </div>
  );
}
