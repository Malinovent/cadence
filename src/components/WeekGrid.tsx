import type React from "react";
import { useCallback, useEffect, useRef } from "react";
import type { WeekIndex } from "../lib/actions";
import { DAY_END, DAY_START, DAYS, ROW_H, STEP } from "../lib/constants";
import type { Block as BlockT, Category } from "../lib/model";
import { fmtTime } from "../lib/time";
import type { CadenceActions } from "../state/useCadence";
import { line, paper2, S } from "../styles";
import Block, { type ResizeEdge } from "./Block";
import type { DragRef } from "./drag";

const SLOTS: number[] = [];
for (let t = DAY_START; t < DAY_END; t += STEP) SLOTS.push(t);

const COLS = `64px repeat(7, 1fr)`;

type Props = {
  week: WeekIndex;
  blocks: BlockT[];
  cats: Category[];
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  dragRef: DragRef;
  actions: Pick<
    CadenceActions,
    "placeBlock" | "moveBlock" | "resize" | "addTag" | "removeTag" | "updateBlock" | "removeBlock" | "toggleDone"
  >;
};

type Listeners = { move: (e: MouseEvent) => void; up: () => void };

export default function WeekGrid({ week, blocks, cats, editingId, setEditingId, dragRef, actions }: Props) {
  // ---- resize by dragging top/bottom edge ----
  // refs keep the window listeners on the current week and let us remove the exact same functions
  const weekRef = useRef(week);
  const resizeFn = useRef(actions.resize);
  useEffect(() => {
    weekRef.current = week;
    resizeFn.current = actions.resize;
  }, [week, actions.resize]);
  const listeners = useRef<Listeners | null>(null);

  const stopResize = useCallback(() => {
    const l = listeners.current;
    if (!l) return;
    window.removeEventListener("mousemove", l.move);
    window.removeEventListener("mouseup", l.up);
    listeners.current = null;
  }, []);
  useEffect(() => stopResize, [stopResize]);

  const startResize = (e: React.MouseEvent, p: BlockT, edge: ResizeEdge) => {
    e.preventDefault();
    e.stopPropagation();
    stopResize();
    const r = { id: p.id, edge, startY: e.clientY, origStart: p.start, origMins: p.mins };
    const move = (ev: MouseEvent) => {
      const deltaSlots = Math.round((ev.clientY - r.startY) / ROW_H);
      resizeFn.current(weekRef.current, r.id, r.edge, r.origStart, r.origMins, deltaSlots);
    };
    listeners.current = { move, up: stopResize };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", stopResize);
  };

  // drop onto a day column — derive start time from cursor Y within the column
  const onDropColumn = (e: React.DragEvent<HTMLDivElement>, day: number) => {
    e.preventDefault();
    const d = dragRef.current;
    if (!d) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const slotIdx = Math.max(0, Math.min(SLOTS.length - 1, Math.floor(y / ROW_H)));
    const start = DAY_START + slotIdx * STEP;
    if (d.type === "tray") actions.placeBlock(week, d.catId, day, start);
    else if (d.type === "move") actions.moveBlock(week, d.id, day, start);
    dragRef.current = null;
  };

  const onToggleDone = (id: string) => actions.toggleDone(week, id);

  return (
    <div style={S.gridWrap}>
      <div style={{ ...S.headRow, gridTemplateColumns: COLS }}>
        <div style={S.corner} />
        {DAYS.map((d) => (
          <div key={d} style={S.dayHead}>
            {d}
          </div>
        ))}
      </div>
      <div style={{ ...S.bodyRow, gridTemplateColumns: COLS }}>
        <div style={S.timeColWrap}>
          {SLOTS.map((t) => (
            <div key={t} style={{ ...S.timeLabel, height: ROW_H, opacity: t % 60 === 0 ? 1 : 0 }}>
              {t % 60 === 0 ? fmtTime(t) : ""}
            </div>
          ))}
        </div>
        {DAYS.map((_, di) => (
          <div
            key={di}
            style={{ ...S.dayCol, height: SLOTS.length * ROW_H }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDropColumn(e, di)}
          >
            {SLOTS.map((t, si) => (
              <div
                key={t}
                style={{
                  ...S.slotLine,
                  top: si * ROW_H,
                  height: ROW_H,
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
                  dragRef={dragRef}
                  startResize={startResize}
                  onToggleDone={onToggleDone}
                  actions={actions}
                />
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
