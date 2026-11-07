import { useEffect, useRef } from "react";
import { BUFFER_COLOR } from "../lib/constants";
import { withAlpha } from "../lib/gesture";
import type { Block, Category, Task } from "../lib/model";
import { blockWhen } from "../lib/sheet";
import type { CadenceActions } from "../state/useCadence";
import { useKeyboard } from "../state/useKeyboard";
import { ink, paper, S } from "../styles";
import { useI18n } from "../i18n/I18nProvider";
import BlockTasks from "./BlockTasks";

type Props = {
  block: Block;
  cats: Category[];
  tasks: Task[];
  weeks: [Block[], Block[]];
  onClose: () => void;
  onDelete: () => void; // undoable: "Block deleted. Undo"
  onMoveToDay: (day: number) => void;
  actions: Pick<CadenceActions, "updateBlock" | "addTag" | "removeTag" | "attachTask" | "detachTask">;
};

const Trash = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
  </svg>
);

/**
 * Phone (JP, 2026-11-07): a block opens in a floating sheet like the add window, not squeezed into
 * the block. No keyboard until a field is tapped; everything 44px tall; the day and time on top with
 * Delete (undoable) and Done beside it, so the keyboard never hides them. While typing, the sheet
 * rides above the keyboard.
 */
export default function BlockSheet({ block: p, cats, tasks, weeks, onClose, onDelete, onMoveToDay, actions }: Props) {
  const { m } = useI18n();
  const kb = useKeyboard();
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const own = p.catIds.map((id) => cats.find((c) => c.id === id)).filter((c): c is Category => !!c);
  const colors = p.buffer ? [BUFFER_COLOR] : own.length ? own.map((c) => c.color) : ["#999"];
  const base = colors[0];
  return (
    <>
      <div style={S.sheetBackdrop} onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={m.editor.sheet}
        style={{
          ...S.blockSheet,
          bottom: `calc(${kb.inset + 10}px + env(safe-area-inset-bottom))`,
          maxHeight: kb.inset ? kb.height - 20 : "85vh",
        }}
      >
        <div style={S.sheetHead}>
          <span style={S.sheetWhen}>
            {colors.map((c, i) => (
              <span key={i} style={{ ...S.dot, background: c }} aria-hidden="true" />
            ))}
            {blockWhen(p, m.lib)}
          </span>
          <button
            type="button"
            style={S.sheetIconBtn}
            onClick={onDelete}
            aria-label={m.editor.deleteBlock}
            title={m.editor.deleteBlock}
          >
            <Trash />
          </button>
          <button type="button" style={S.sheetDone} onClick={onClose}>
            {m.editor.done}
          </button>
        </div>
        <div style={S.sheetBody}>
          <input
            defaultValue={p.label}
            placeholder={m.editor.title}
            enterKeyHint="done"
            onChange={(e) => actions.updateBlock(p.id, { label: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur(); // the keyboard goes, the sheet stays
            }}
            style={{ ...S.sheetTitle, borderBottomColor: base }}
          />
          <textarea
            defaultValue={p.desc || ""}
            placeholder={m.editor.description}
            onChange={(e) => actions.updateBlock(p.id, { desc: e.target.value })}
            style={{ ...S.sheetDesc, borderColor: base }}
          />
          <div>
            <div style={S.sheetLabel}>{m.editor.areas}</div>
            <div style={S.sheetChips}>
              {cats.map((c) => {
                const on = p.catIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={on}
                    title={on ? m.editor.remove(c.name) : m.editor.add(c.name)}
                    onClick={() => (on ? actions.removeTag(p.id, c.id) : actions.addTag(p.id, c.id))}
                    style={{
                      ...S.sheetChip,
                      borderColor: c.color,
                      borderStyle: on ? "solid" : "dashed",
                      background: on ? withAlpha(c.color, "2e") : "transparent",
                    }}
                  >
                    <span aria-hidden="true" style={{ ...S.dot, background: c.color }} />
                    {c.name}
                    {on && <span aria-hidden="true">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div style={S.sheetLabel}>{m.editor.days}</div>
            <div style={S.sheetDays}>
              {m.lib.days.map((d, i) => {
                const on = p.day === i;
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={on}
                    onClick={() => onMoveToDay(i)}
                    style={{ ...S.sheetDay, background: on ? ink : "transparent", color: on ? paper : ink }}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
          <BlockTasks block={p} cats={cats} tasks={tasks} weeks={weeks} actions={actions} big />
        </div>
      </div>
    </>
  );
}
