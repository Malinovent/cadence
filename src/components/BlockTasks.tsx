import type { Block, Category, Task } from "../lib/model";
import { taskDots, taskNote } from "../lib/panel";
import { blockPicker } from "../lib/tasks";
import type { CadenceActions } from "../state/useCadence";
import { S } from "../styles";
import { useI18n } from "../i18n/I18nProvider";

type Props = {
  block: Block;
  cats: Category[];
  tasks: Task[];
  weeks: [Block[], Block[]]; // to say where a task sits now
  actions: Pick<CadenceActions, "attachTask" | "detachTask">;
  big?: boolean; // the phone sheet: 44px rows, and the sheet scrolls instead of the list
};

/**
 * A block's tasks, and the open tasks to add to it (2026-11-06): in this block first (✓, tap to take
 * one out), then free ones (＋, tap to add), then ones in another block (↪, its colours and time;
 * tap to move it here). Shared by the desktop popup and the phone sheet.
 */
export default function BlockTasks({ block: p, cats, tasks, weeks, actions, big }: Props) {
  const { m } = useI18n();
  const { inBlock, free, elsewhere } = blockPicker(tasks, p.id);
  const row = big ? { ...S.editTask, ...S.sheetTask } : S.editTask;
  return (
    <div style={big ? undefined : S.editTasks}>
      <div style={big ? S.sheetLabel : S.editTasksLabel}>{m.editor.tasks}</div>
      <div style={big ? { ...S.editTaskList, maxHeight: "none", overflowY: "visible", gap: 6 } : S.editTaskList}>
        {inBlock.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-label={m.editor.removeTask(t.name)}
            title={m.editor.removeTask(t.name)}
            onClick={() => actions.detachTask(t.id)}
            style={{ ...row, ...S.editTaskOn }}
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
            style={row}
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
              style={{ ...row, ...S.editTaskElsewhere }}
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
  );
}
