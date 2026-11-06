import { S } from "../styles";
import { useI18n } from "../i18n/I18nProvider";

/** Audit item 7: after a week is replaced. It waits for the person: no timer, gone at the next change. */
export default function UndoBar({
  text,
  onUndo,
  onDismiss,
}: {
  text: string;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  const { m } = useI18n();
  return (
    <div style={S.undoBar} role="status">
      <span>{text}</span>
      <button type="button" onClick={onUndo} style={S.undoBtn}>
        {m.undo.action}
      </button>
      <button
        type="button"
        className="cadence-hit44"
        onClick={onDismiss}
        aria-label={m.undo.dismiss}
        style={S.undoClose}
      >
        ✕
      </button>
    </div>
  );
}
