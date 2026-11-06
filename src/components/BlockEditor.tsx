import { useEffect, useRef } from "react";
import type { Block, Category, Task } from "../lib/model";
import { taskDots, taskNote } from "../lib/panel";
import { blockPicker } from "../lib/tasks";
import type { CadenceActions } from "../state/useCadence";
import { ink, paper, S } from "../styles";
import { useI18n } from "../i18n/I18nProvider";

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
  const { inBlock, free, elsewhere } = blockPicker(tasks, p.id);
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
        autoFocus
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
      <div style={S.editTasks}>
        <span style={S.editTasksLabel}>{m.editor.tasks}</span>
        <div style={S.editTaskList}>
          {inBlock.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-label={m.editor.removeTask(t.name)}
              title={m.editor.removeTask(t.name)}
              onClick={() => actions.detachTask(t.id)}
              style={{ ...S.editTask, ...S.editTaskOn }}
            >
              <span aria-hidden="true">✓</span>
              <span style={{ ...S.editTaskName, ...(t.done ? S.taskNameDone : {}) }}>{t.name}</span>
            </button>
          ))}
          {free.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-label={m.editor.addTask(t.name)}
              title={m.editor.addTask(t.name)}
              onClick={() => actions.attachTask(t.id, p.id)}
              style={S.editTask}
            >
              <span aria-hidden="true">＋</span>
              <span style={S.editTaskName}>{t.name}</span>
            </button>
          ))}
          {/* already in another block: its colours and time; a tap moves it here */}
          {elsewhere.map((t) => {
            const where = taskNote(t, weeks, m.lib);
            return (
              <button
                key={t.id}
                type="button"
                aria-label={m.editor.moveTask(t.name, where)}
                title={m.editor.moveTask(t.name, where)}
                onClick={() => actions.attachTask(t.id, p.id)}
                style={{ ...S.editTask, ...S.editTaskElsewhere }}
              >
                <span aria-hidden="true">↪</span>
                <span style={S.editTaskName}>{t.name}</span>
                <span style={S.editTaskWhere}>
                  {taskDots(t, { weeks, cats }).map((c, i) => (
                    <span key={i} style={{ ...S.dot, ...S.taskDot, background: c }} aria-hidden="true" />
                  ))}
                  {where}
                </span>
              </button>
            );
          })}
          {inBlock.length === 0 && free.length === 0 && elsewhere.length === 0 && (
            <span style={S.tplEmpty}>{m.editor.noTasks}</span>
          )}
        </div>
      </div>
      <div style={S.editActions}>
        <button className="cadence-coarse-only" onClick={onDelete} style={{ ...S.editDone, background: "#b54" }}>
          {m.editor.delete}
        </button>
        <button onClick={onClose} style={S.editDone}>
          {m.editor.done}
        </button>
      </div>
    </div>
  );
}
