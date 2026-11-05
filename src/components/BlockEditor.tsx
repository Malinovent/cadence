import { useEffect, useRef } from "react";
import type { Block, Category } from "../lib/model";
import type { CadenceActions } from "../state/useCadence";
import { ink, paper, S } from "../styles";
import { useI18n } from "../i18n/I18nProvider";

type Props = {
  block: Block;
  cats: Category[];
  baseColor: string;
  onClose: () => void;
  onDelete: () => void; // touch only: there is no right-click
  onMoveToDay: (day: number) => void; // touch only: day chips
  actions: Pick<CadenceActions, "updateBlock" | "addTag" | "removeTag">;
};

export default function BlockEditor({ block: p, cats, baseColor, onClose, onDelete, onMoveToDay, actions }: Props) {
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
