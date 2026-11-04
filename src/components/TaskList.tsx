import { useRef, useState, type FormEvent } from "react";
import type { Task } from "../lib/model";
import type { CadenceActions } from "../state/useCadence";
import { S } from "../styles";

type Props = {
  tasks: Task[];
  actions: Pick<CadenceActions, "addTask" | "toggleTask" | "removeTask">;
};

/** S1.4: the task list inside the areas-and-tasks panel (was the Tasks tab). Insertion order; done tasks stay put. */
export default function TaskList({ tasks, actions }: Props) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Enter or "＋": add (blank is a no-op in the action), clear, keep focus in the input
  const add = (e: FormEvent) => {
    e.preventDefault();
    actions.addTask(draft);
    setDraft("");
    inputRef.current?.focus();
  };

  return (
    <div>
      <form style={S.panelTaskAdd} onSubmit={add}>
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a task…"
          aria-label="New task"
          style={S.tplNameInput}
        />
        <button type="submit" style={S.tplApply} aria-label="Add task">
          ＋ add
        </button>
      </form>
      {tasks.length === 0 ? (
        <div style={{ ...S.tplEmpty, marginTop: 8 }}>Nothing on your list.</div>
      ) : (
        <div style={S.panelTaskList}>
          {tasks.map((t) => (
            <div key={t.id} style={S.panelTaskRow}>
              <button
                className="cadence-hit44"
                onClick={() => actions.toggleTask(t.id)}
                aria-label={t.done ? `Mark "${t.name}" not done` : `Mark "${t.name}" done`}
                aria-pressed={t.done}
                style={{
                  ...S.taskCheck,
                  ...S.panelTaskCheck,
                  ...(t.done ? S.taskCheckDone : {}),
                }}
              >
                {t.done ? "✓" : ""}
              </button>
              <span
                onClick={() => actions.toggleTask(t.id)}
                style={{
                  ...S.taskName,
                  ...S.panelTaskName,
                  ...(t.done ? S.taskNameDone : {}),
                }}
              >
                {t.name}
              </span>
              <button
                className="cadence-hit44"
                onClick={() => actions.removeTask(t.id)}
                aria-label={`Dismiss "${t.name}"`}
                style={S.catDel}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
