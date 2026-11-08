import { useEffect, useRef } from "react";
import type { Block, Category, Task } from "../lib/model";
import type { CadenceActions } from "../state/useCadence";
import { ink, paper, S } from "../styles";
import { useI18n } from "../i18n/I18nProvider";
import BlockTasks from "./BlockTasks";

// the title takes the cursor only with a mouse: on touch that would open the keyboard at once (JP)
const finePointer = (): boolean => typeof window !== "undefined" && !!window.matchMedia?.("(pointer: fine)").matches;

type Props = {
  block: Block;
  cats: Category[];
  tasks: Task[];
  weeks: [Block[], Block[]]; // to say where a task sits now
  baseColor: string;
  onClose: () => void;
  onDelete: () => void; // touch only: there is no right-click
  onMoveToDay: (day: number) => void; // touch only: day chips
  actions: Pick<CadenceActions, "updateBlock" | "addTag" | "removeTag" | "attachTask" | "detachTask">;
};

export default function BlockEditor({
  block: p,
  cats,
  tasks,
  weeks,
  baseColor,
  onClose,
  onDelete,
  onMoveToDay,
  actions,
}: Props) {
  const { m } = useI18n();
  const editorRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  // ---- close the inline editor when clicking anywhere outside it ----
  useEffect(() => {
    const onDocDown = (e: PointerEvent) => {
      if (editorRef.current && !editorRef.current.contains(e.target as Node)) closeRef.current();
    };
    // pointerdown fires before click, so the editor closes even if the click
    // lands on another block (that block's own onClick then opens it instead)
    document.addEventListener("pointerdown", onDocDown, true);
    return () => document.removeEventListener("pointerdown", onDocDown, true);
  }, []);

  return (
    <div ref={editorRef} onClick={(e) => e.stopPropagation()} style={S.editWrap}>
      <input
        autoFocus={finePointer()}
        defaultValue={p.label}
        placeholder={m.editor.title}
        onChange={(e) => actions.updateBlock(p.id, { label: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === "Enter") onClose();
          if (e.key === "Escape") onClose();
        }}
        style={{ ...S.inlineInput, borderBottomColor: baseColor }}
      />
      <textarea
        defaultValue={p.desc || ""}
        placeholder={m.editor.description}
        onChange={(e) => actions.updateBlock(p.id, { desc: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
        style={{ ...S.inlineArea, borderColor: baseColor }}
      />
      <div style={S.chipRow}>
        {cats.map((c) => {
          const on = p.catIds.includes(c.id);
          return (
            <button
              key={c.id}
              onClick={() => (on ? actions.removeTag(p.id, c.id) : actions.addTag(p.id, c.id))}
              title={on ? m.editor.remove(c.name) : m.editor.add(c.name)}
              style={{
                ...S.chip,
                background: on ? c.color : "transparent",
                borderColor: c.color,
                color: on ? "#fff" : c.color,
              }}
            >
              {c.name}
              {on && p.catIds.length > 1 ? " ×" : ""}
            </button>
          );
        })}
      </div>
      {/* touch only (cadence-coarse-only): move to another day at the same start */}
      <div className="cadence-coarse-only" style={S.chipRow}>
        {m.lib.days.map((d, i) => {
          const on = p.day === i;
          return (
            <button
              key={d}
              onClick={() => onMoveToDay(i)}
              style={{ ...S.chip, borderColor: ink, background: on ? ink : "transparent", color: on ? paper : ink }}
            >
              {d}
            </button>
          );
        })}
      </div>
      {/* the block's tasks, and the open tasks to add to it */}
      <BlockTasks block={p} cats={cats} tasks={tasks} weeks={weeks} actions={actions} />
      <div style={S.editActions}>
        <button
          className="cadence-coarse-only"
          onClick={onDelete}
          style={{ ...S.editDone, background: "var(--c-danger)" }}
        >
          {m.editor.delete}
        </button>
        <button onClick={onClose} style={S.editDone}>
          {m.editor.done}
        </button>
      </div>
    </div>
  );
}
