import type React from "react";
import type { Interaction } from "../interaction/useInteraction";
import type { WeekIndex } from "../lib/actions";
import { DAY_END, DAY_START, DAYS, ROW_H, STEP } from "../lib/constants";
import { blockBox, dropPreview, resolveDrop, slotStartAt } from "../lib/gesture";
import type { Block as BlockT, Category } from "../lib/model";
import { fmtTime } from "../lib/time";
import type { CadenceActions } from "../state/useCadence";
import { line, paper2, S } from "../styles";
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
};

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
}: Props) {
  const { engine, state } = interaction;
  const cols = `64px repeat(${days.length}, 1fr)`;
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

  const onMoveToDay = (p: BlockT, day: number) => actions.moveBlock(week, p.id, day, p.start);

  return (
    <div ref={engine.setGrid} data-row-h={rowH} style={S.gridWrap}>
      <div style={{ ...S.headRow, gridTemplateColumns: cols }}>
        <div style={S.corner} />
        {days.map((d) => (
          <div key={d} style={S.dayHead}>
            {DAYS[d]}
          </div>
        ))}
      </div>
      <div style={{ ...S.bodyRow, gridTemplateColumns: cols }}>
        <div style={S.timeColWrap}>
          {SLOTS.map((t) => (
            <div key={t} style={{ ...S.timeLabel, height: rowH, opacity: t % 60 === 0 ? 1 : 0 }}>
              {t % 60 === 0 ? fmtTime(t) : ""}
            </div>
          ))}
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
                  onMoveToDay={onMoveToDay}
                  actions={actions}
                />
              ))}
            {preview && preview.day === di && <div style={{ ...S.dropPreview, ...blockBox(preview.start, preview.mins, rowH) }} />}
          </div>
        ))}
      </div>
    </div>
  );
}
