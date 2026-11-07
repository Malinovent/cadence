import type React from "react";
import { useRef, useState, type FormEvent } from "react";
import type { Interaction } from "../interaction/useInteraction";
import type { CadenceData, Task } from "../lib/model";
import { taskDots, taskNote } from "../lib/panel";
import { doneThisWeek, openTasks } from "../lib/tasks";
import type { CadenceActions } from "../state/useCadence";
import { S } from "../styles";
import { useI18n } from "../i18n/I18nProvider";

export type TaskActions = Pick<CadenceActions, "addTask" | "toggleTask" | "removeTask">;

type Props = {
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
 * The task list in the panel: one plain list, apart from the areas (JP, 2026-11-04). Open tasks
 * in the user's order, each a drag source: drop it on a block to add it to that block's
 * checklist. A task in a block shows that block's colour dots and where it is. Finished ones
 * leave the list, behind "Show 3 done this week".
 */
export default function TaskList({ data, interaction, actions, now }: Props) {
  const { m } = useI18n();
  const [showDone, setShowDone] = useState(false);
  const open = openTasks(data.tasks);
  const done = doneThisWeek(data.tasks, now);
  return (
    <div style={S.areaTasks}>
      {/* first and big (JP, 2026-11-07): new tasks land right under it */}
      <AddTask actions={actions} />
      {open.length === 0 && done.length === 0 && <div style={S.tplEmpty}>{m.tasks.empty}</div>}
      {open.length > 0 && (
        <div style={S.panelTaskList}>
          {open.map((t) => (
            <TaskRow key={t.id} task={t} data={data} interaction={interaction} actions={actions} />
          ))}
        </div>
      )}
      {done.length > 0 && (
        <button type="button" style={S.taskDoneToggle} onClick={() => setShowDone(!showDone)} aria-expanded={showDone}>
          {showDone ? m.tasks.hideDone : m.tasks.showDone(done.length)}
        </button>
      )}
      {showDone && done.length > 0 && (
        <div style={S.panelTaskList}>
          {done.map((t) => (
            <TaskRow key={t.id} task={t} data={data} interaction={interaction} actions={actions} />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskRow({
  task: t,
  data,
  interaction,
  actions,
}: {
  task: Task;
  data: CadenceData;
  interaction: Interaction;
  actions: TaskActions;
}) {
  const { engine, state } = interaction;
  const { m } = useI18n();
  const pressed = state.press?.source.kind === "task" && state.press.source.taskId === t.id;
  const note = taskNote(t, data.weeks, m.lib);
  const dots = t.done ? [] : taskDots(t, data);
  return (
    <div
      className={t.done ? undefined : "cadence-src cadence-tray-item"}
      data-press={pressed ? "" : undefined}
      data-holding={pressed && state.press?.hold ? "" : undefined}
      onPointerDown={(e) => {
        if (t.done || (e.target as Element).closest("button")) return;
        engine.pressSource(e, e.currentTarget, { kind: "task", taskId: t.id }, { hold: true });
      }}
      onContextMenu={(e) => {
        if (engine.blocksContextMenu()) e.preventDefault();
      }}
      title={t.done ? undefined : m.tasks.dragTitle}
      style={{ ...S.panelTaskRow, ...HOLD_VARS, cursor: t.done ? "default" : "grab" }}
    >
      <span className="cadence-hold-fill" aria-hidden="true" />
      <button
        type="button"
        className="cadence-hit44"
        onClick={() => actions.toggleTask(t.id)}
        aria-label={t.done ? m.tasks.markOpen(t.name) : m.tasks.markDone(t.name)}
        aria-pressed={t.done}
        style={{ ...S.taskCheck, ...S.panelTaskCheck, ...(t.done ? S.taskCheckDone : {}) }}
      >
        {t.done ? "✓" : ""}
      </button>
      <span style={S.panelTaskText}>
        <span style={{ ...S.taskName, ...S.panelTaskName, ...(t.done ? S.taskNameDone : {}), cursor: "inherit" }}>
          {t.name}
        </span>
        {note && (
          <span style={S.panelTaskNote}>
            {/* in a block: one dot per area of that block, in its colours */}
            {dots.map((c, i) => (
              <span key={i} style={{ ...S.dot, ...S.taskDot, background: c }} aria-hidden="true" />
            ))}
            {note}
          </span>
        )}
      </span>
      <button
        className="cadence-hit44"
        onClick={() => actions.removeTask(t.id)}
        aria-label={m.tasks.dismiss(t.name)}
        style={S.catDel}
      >
        ✕
      </button>
    </div>
  );
}

function AddTask({ actions }: { actions: TaskActions }) {
  const { m } = useI18n();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  if (!adding)
    return (
      <button type="button" data-coach="add-task" style={S.taskAdd} onClick={() => setAdding(true)}>
        {m.tasks.add}
      </button>
    );
  // Enter or "Add task": add, clear, keep focus; an empty Enter, Escape, or leaving it empty closes the row
  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) {
      setAdding(false);
      return;
    }
    actions.addTask(draft);
    setDraft("");
    inputRef.current?.focus();
  };
  return (
    <form data-coach="add-task" style={S.taskAddForm} onSubmit={add}>
      <input
        ref={inputRef}
        autoFocus
        value={draft}
        enterKeyHint="done"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setDraft("");
            setAdding(false);
          }
        }}
        onBlur={() => {
          if (!draft.trim()) setAdding(false);
        }}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={m.tasks.placeholder}
        aria-label={m.tasks.newTask}
        style={S.taskAddInput}
      />
      <button type="submit" style={S.taskAddSubmit}>
        {m.tasks.addButton}
      </button>
    </form>
  );
}
