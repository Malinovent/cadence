import { useRef, useState, type FormEvent } from "react";
import type { Task } from "../lib/model";
import type { CadenceActions } from "../state/useCadence";
import { S } from "../styles";

type Props = {
  tasks: Task[];
  actions: Pick<CadenceActions, "addTask" | "toggleTask" | "removeTask">;
};

export default function TasksView({ tasks, actions }: Props) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Enter or "＋ Add": add (blank is a no-op in the action), clear, keep focus in the input
  const add = (e: FormEvent) => {
    e.preventDefault();
    actions.addTask(draft);
    setDraft("");
    inputRef.current?.focus();
  };

  return (
    <div style={S.catBody}>
      <h2 style={S.statsTitle}>Tasks</h2>
      <p style={S.catIntro}>The little things that don't need a slot on the grid.</p>
      <form style={S.taskAddRow} onSubmit={add}>
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a task…"
          aria-label="New task"
          style={S.tplNameInput}
        />
        <button type="submit" style={{ ...S.catAdd, marginTop: 0 }}>
          ＋ Add
        </button>
      </form>
      {tasks.length === 0 ? (
        <div style={{ ...S.tplEmpty, marginTop: 16 }}>Nothing on your list.</div>
      ) : (
        <div style={S.taskList}>
          {tasks.map((t) => (
            <div key={t.id} style={S.taskRow}>
              <button
                className="cadence-hit44"
                onClick={() => actions.toggleTask(t.id)}
                aria-label={t.done ? "Mark not done" : "Mark done"}
                aria-pressed={t.done}
                style={{ ...S.taskCheck, ...(t.done ? S.taskCheckDone : {}) }}
              >
                {t.done ? "✓" : ""}
              </button>
              <span onClick={() => actions.toggleTask(t.id)} style={{ ...S.taskName, ...(t.done ? S.taskNameDone : {}) }}>
                {t.name}
              </span>
              <button className="cadence-hit44" onClick={() => actions.removeTask(t.id)} aria-label="Dismiss" style={S.catDel}>
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
