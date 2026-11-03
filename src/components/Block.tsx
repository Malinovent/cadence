import type React from "react";
import { DAY_START, STEP, ROW_H } from "../lib/constants";
import type { Block as BlockT, Category } from "../lib/model";
import { fmtDur, fmtTime } from "../lib/time";
import type { CadenceActions } from "../state/useCadence";
import { S } from "../styles";
import BlockEditor from "./BlockEditor";
import type { DragRef } from "./drag";

export type ResizeEdge = "top" | "bottom";

type Props = {
  block: BlockT;
  cats: Category[];
  isEditing: boolean;
  setEditingId: (id: string | null) => void;
  dragRef: DragRef;
  startResize: (e: React.MouseEvent, p: BlockT, edge: ResizeEdge) => void;
  onToggleDone: (id: string) => void;
  actions: Pick<CadenceActions, "addTag" | "removeTag" | "updateBlock" | "removeBlock">;
};

// Soft blend of the tagged category colors. Each color sits at a single stop
// and CSS interpolates between them; stops are inset (15%..85%) so each color
// reads solidly at its own end before the transition begins.
const blendGradient = (colors: string[]): string =>
  `linear-gradient(135deg, ${colors
    .map((c, i) => {
      const pct = colors.length === 1 ? 50 : Math.round(15 + (i / (colors.length - 1)) * 70);
      return `${c} ${pct}%`;
    })
    .join(", ")})`;

export default function Block({ block: p, cats: allCats, isEditing, setEditingId, dragRef, startResize, onToggleDone, actions }: Props) {
  const cats = p.catIds.map((id) => allCats.find((c) => c.id === id)).filter((c): c is Category => !!c);
  const colors = cats.length ? cats.map((c) => c.color) : ["#999"];
  const top = ((p.start - DAY_START) / STEP) * ROW_H;
  const height = (p.mins / STEP) * ROW_H - 4;
  const named = !!p.label;
  const baseColor = colors[0];
  const multi = colors.length > 1;
  // three states: empty -> dashed hollow | named -> solid hollow | done -> filled
  const solidFill = p.done;
  const onColor = solidFill ? "#fff" : baseColor;
  const gradient = multi ? blendGradient(colors) : null;

  // Single-type keeps plain CSS borders. Multi-type paints the gradient into
  // the border ring using mask-composite, which (unlike border-image) keeps border-radius.
  let blockStyle: React.CSSProperties;
  let ringOverlay: React.ReactNode = null;
  if (!multi) {
    blockStyle = {
      background: solidFill ? baseColor : "transparent",
      border: p.done ? `1px solid ${baseColor}` : named ? `1.5px solid ${baseColor}` : `1.5px dashed ${baseColor}`,
    };
  } else if (solidFill) {
    // done: interior filled with the gradient
    blockStyle = { background: gradient ?? undefined, border: "1px solid transparent" };
  } else {
    // hollow multi-type: transparent interior, gradient ring drawn by an overlay
    blockStyle = { background: "transparent", border: "none" };
    // gaps punched along the ring to mimic a dashed border
    const dashMask = named ? null : "repeating-linear-gradient(135deg, #000 0 5px, transparent 5px 10px)";
    ringOverlay = (
      // keyed on the variant so switching dashed <-> solid remounts with a clean mask
      <div
        key={named ? "solid" : "dashed"}
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 4,
          padding: 1.5, // ring thickness
          background: gradient ?? undefined,
          WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          maskComposite: "exclude",
          pointerEvents: "none",
          ...(dashMask
            ? {
                WebkitMaskImage: `linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0), ${dashMask}`,
                maskImage: `linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0), ${dashMask}`,
              }
            : {}),
        }}
      />
    );
  }
  // 30-min row = 26px, so a 1h block is ~48px. Show description
  // once there's room beneath the title row, time last.
  const showDesc = !isEditing && p.desc && height > 44;
  const showTime = !isEditing && height > (p.desc ? 74 : 46);

  return (
    <div
      draggable={!isEditing}
      onDragStart={(e) => {
        dragRef.current = { type: "move", id: p.id };
        e.dataTransfer.effectAllowed = "move";
        e.stopPropagation();
      }}
      onDragOver={(e) => {
        if (dragRef.current?.type === "tray") {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      // drop a tray category directly ONTO a block -> adds a second type
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const d = dragRef.current;
        if (d && d.type === "tray") actions.addTag(p.id, d.catId);
        dragRef.current = null;
      }}
      onClick={() => {
        if (!isEditing) setEditingId(p.id);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        actions.removeBlock(p.id);
      }}
      title="Click to edit · drag a category onto me to add a type · right-click to delete"
      style={{
        ...S.placedBlock,
        top,
        height,
        ...blockStyle,
        // keep text inset identical whether the ring is a real border or the masked overlay
        padding: multi && !solidFill ? "6.5px 8.5px" : "5px 7px",
        color: onColor,
        cursor: isEditing ? "default" : "grab",
        zIndex: isEditing ? 20 : 2,
        overflow: isEditing ? "visible" : "hidden",
      }}
    >
      {ringOverlay}
      {!isEditing && (
        <div style={S.resizeHandle} onMouseDown={(e) => startResize(e, p, "top")} onClick={(e) => e.stopPropagation()} />
      )}
      <div style={S.placedTop}>
        <span style={S.placedNameWrap}>
          {multi && (
            <span style={S.pipRow}>
              {colors.map((col, i) => (
                <span key={i} style={{ ...S.pip, background: col }} />
              ))}
            </span>
          )}
          <span style={S.placedName}>{cats.map((c) => c.name).join(" + ") || "?"}</span>
        </span>
        <div style={S.placedTopRight}>
          <span style={{ ...S.placedDur, color: solidFill ? "rgba(255,255,255,0.85)" : baseColor }}>{fmtDur(p.mins)}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleDone(p.id);
            }}
            style={{
              ...S.doneToggle,
              background: solidFill ? "rgba(255,255,255,0.25)" : "transparent",
              borderColor: solidFill ? "transparent" : baseColor,
              color: solidFill ? "#fff" : baseColor,
            }}
          >
            {p.done ? "✓" : "○"}
          </button>
        </div>
      </div>
      {isEditing ? (
        <BlockEditor block={p} cats={allCats} baseColor={baseColor} onClose={() => setEditingId(null)} actions={actions} />
      ) : (
        <>
          {p.label && <div style={S.placedLabel}>{p.label}</div>}
          {showDesc && (
            <div style={{ ...S.placedDesc, opacity: solidFill ? 0.85 : 0.75, WebkitLineClamp: height > 78 ? 2 : 1 }}>
              {p.desc}
            </div>
          )}
          {showTime && (
            <div style={{ ...S.placedTime, opacity: solidFill ? 0.8 : 0.65 }}>
              {fmtTime(p.start)}–{fmtTime(p.start + p.mins)}
            </div>
          )}
        </>
      )}
      {!isEditing && (
        <div
          style={{ ...S.resizeHandle, top: "auto", bottom: 0 }}
          onMouseDown={(e) => startResize(e, p, "bottom")}
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>
  );
}
