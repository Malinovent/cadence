import type React from "react";
import { useRef, useState, type FormEvent } from "react";
import type { Interaction } from "../interaction/useInteraction";
import type { Category, CadenceData, Task } from "../lib/model";
import { taskNote } from "../lib/panel";
import { doneThisWeek, openTasks } from "../lib/tasks";
import type { CadenceActions } from "../state/useCadence";
import { S } from "../styles";

export type TaskActions = Pick<CadenceActions, "addTask" | "toggleTask" | "removeTask" | "setTaskArea">;

type Props = {
  catId: string | null; // null = Unsorted
  data: CadenceData;
  interaction: Interaction;
  actions: TaskActions;
  now: Date;
};

// press / hold-progress colours for the shared tray-item CSS (styles.ts FONT_IMPORT), in ink
const HOLD_VARS = {
  "--cadence-hover": "rgba(43, 38, 34, 0.05)",
  "--cadence-press": "rgba(43, 38, 34, 0.1)",
  "--cadence-hold": "rgba(43, 38, 34, 0.16)",
} as React.CSSProperties;

/**
 * S1.5: one area's tasks (or the Unsorted ones) in the panel. Open tasks in the user's order,
 * each a drag source (drop on a block to add it there, on empty time to give it its own block);
 * finished ones leave the list, behind "Show 3 done this week". Areas get an add row; Unsorted
 * rows get "Move to…" instead. No estimates (JP, 2026-11-04).
 */
export default function AreaTasks({ catId, data, interaction, actions, now }: Props) {
  const [showDone, setShowDone] = useState(false);
  const open = openTasks(data.tasks, catId);
  const done = doneThisWeek(data.tasks, catId, now);
  return (
    <div style={S.areaTasks}>
      {open.length > 0 && (
        <div style={S.panelTaskList}>
          {open.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              data={data}
              interaction={interaction}
              actions={actions}
              cats={catId === null ? data.cats : null}
            />
          ))}
        </div>
      )}
      {done.length > 0 && (
        <button type="button" style={S.taskDoneToggle} onClick={() => setShowDone(!showDone)} aria-expanded={showDone}>
          {showDone ? "Hide done" : `Show ${done.length} done this week`}
        </button>
      )}
      {showDone && done.length > 0 && (
        <div style={S.panelTaskList}>
          {done.map((t) => (
            <TaskRow key={t.id} task={t} data={data} interaction={interaction} actions={actions} cats={null} />
          ))}
        </div>
      )}
      {catId !== null && <AddTask catId={catId} actions={actions} />}
    </div>
  );
}

function TaskRow({
  task: t,
  data,
  interaction,
  actions,
  cats,
}: {
  task: Task;
  data: CadenceData;
  interaction: Interaction;
  actions: TaskActions;
  cats: Category[] | null; // Unsorted: the areas it can move to
}) {
  const { engine, state } = interaction;
  const pressed = state.press?.source.kind === "task" && state.press.source.taskId === t.id;
  const note = taskNote(t, data.weeks);
  const scheduled = t.blockId !== undefined && !t.done;
  return (
    <div
      className={t.done ? undefined : "cadence-src cadence-tray-item"}
      data-press={pressed ? "" : undefined}
      data-holding={pressed && state.press?.hold ? "" : undefined}
      onPointerDown={(e) => {
        if (t.done || (e.target as Element).closest("button, select")) return;
        engine.pressSource(e, e.currentTarget, { kind: "task", taskId: t.id }, { hold: true });
      }}
      onContextMenu={(e) => {
        if (engine.blocksContextMenu()) e.preventDefault();
      }}
      title={t.done ? undefined : "Drag onto a block to add it there, or onto empty time to give it its own block"}
      style={{
        ...S.panelTaskRow,
        ...(scheduled ? S.panelTaskScheduled : {}),
        ...HOLD_VARS,
        cursor: t.done ? "default" : "grab",
      }}
    >
      <span className="cadence-hold-fill" aria-hidden="true" />
      <button
        type="button"
        className="cadence-hit44"
        onClick={() => actions.toggleTask(t.id)}
        aria-label={t.done ? `Mark "${t.name}" not done` : `Mark "${t.name}" done`}
        aria-pressed={t.done}
        style={{ ...S.taskCheck, ...S.panelTaskCheck, ...(t.done ? S.taskCheckDone : {}) }}
      >
        {t.done ? "✓" : ""}
      </button>
      <span style={S.panelTaskText}>
        <span style={{ ...S.taskName, ...S.panelTaskName, ...(t.done ? S.taskNameDone : {}), cursor: "inherit" }}>
          {t.name}
        </span>
        {note && <span style={S.panelTaskNote}>{note}</span>}
      </span>
      {cats && (
        <select
          aria-label={`Move "${t.name}" to an area`}
          value=""
          onChange={(e) => e.target.value && actions.setTaskArea(t.id, e.target.value)}
          style={S.taskMoveSelect}
        >
          <option value="">Move to…</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name || "Untitled"}
            </option>
          ))}
        </select>
      )}
      <button
        className="cadence-hit44"
        onClick={() => actions.removeTask(t.id)}
        aria-label={`Dismiss "${t.name}"`}
        style={S.catDel}
      >
        ✕
      </button>
    </div>
  );
}

function AddTask({ catId, actions }: { catId: string; actions: TaskActions }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  if (!adding)
    return (
      <button type="button" style={S.taskDoneToggle} onClick={() => setAdding(true)}>
        ＋ Add a task
      </button>
    );
  // Enter or "＋": add under this area (blank is a no-op in the action), clear, keep focus
  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) {
      setAdding(false); // an empty Enter closes the row
      return;
    }
    actions.addTask(draft, { catId });
    setDraft("");
    inputRef.current?.focus();
  };
  return (
    <form style={S.panelTaskAdd} onSubmit={add}>
      <input
        ref={inputRef}
        autoFocus
        value={draft}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setDraft("");
            setAdding(false);
          }
        }}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Add a task…"
        aria-label="New task"
        style={S.tplNameInput}
      />
      <button type="submit" style={S.tplApply} aria-label="Add task">
        ＋
      </button>
    </form>
  );
}
