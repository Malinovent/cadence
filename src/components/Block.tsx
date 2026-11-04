import type React from "react";
import type { InteractionEngine } from "../interaction/engine";
import { blockText } from "../lib/dayview";
import { blockBox, GRIP_MIN_WIDTH, GRIP_SPAN, gripZones } from "../lib/gesture";
import type { Block as BlockT, Category } from "../lib/model";
import { fmtDur, fmtTime } from "../lib/time";
import type { CadenceActions } from "../state/useCadence";
import { S } from "../styles";
import BlockEditor from "./BlockEditor";

export type ResizeEdge = "top" | "bottom";

type Props = {
  block: BlockT;
  cats: Category[];
  isEditing: boolean;
  setEditingId: (id: string | null) => void;
  engine: InteractionEngine;
  rowH: number; // px per 30-min row
  colHeight: number; // px height of the day column (grips never reach outside it)
  pressed: boolean; // pointer is down on it (press feedback)
  lifted: boolean; // being moved: the original stays in place, faded
  tagColor: string | null; // a tray category is hovering it: dropping adds that tag
  onTap: (p: BlockT) => void; // a click/tap that was not a drag
  onContextMenu: (e: React.MouseEvent, p: BlockT) => void;
  onToggleDone: (id: string) => void;
  onMoveToDay: (p: BlockT, day: number) => void;
  actions: Pick<CadenceActions, "addTag" | "removeTag" | "updateBlock" | "removeBlock">;
};

// Width of the touch grip strips outside a block, in its day column (the block is inset 3px
// each side): the middle GRIP_SPAN of the block, at least GRIP_MIN_WIDTH, never wider than the
// block. Same rule as gripSpan() in lib/gesture.ts, which the inside part uses.
const GRIP_ZONE_WIDTH = `min(calc(100% - 6px), max(${GRIP_MIN_WIDTH}px, calc((100% - 6px) * ${GRIP_SPAN})))`;

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

export default function Block({
  block: p,
  cats: allCats,
  isEditing,
  setEditingId,
  engine,
  rowH,
  colHeight,
  pressed,
  lifted,
  tagColor,
  onTap,
  onContextMenu,
  onToggleDone,
  onMoveToDay,
  actions,
}: Props) {
  const cats = p.catIds.map((id) => allCats.find((c) => c.id === id)).filter((c): c is Category => !!c);
  const colors = cats.length ? cats.map((c) => c.color) : ["#999"];
  const { top, height } = blockBox(p.start, p.mins, rowH);
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
      background: solidFill ? baseColor : "#fbf6ec",
      border: p.done ? `1px solid ${baseColor}` : named ? `1.5px solid ${baseColor}` : `1.5px dashed ${baseColor}`,
    };
  } else if (solidFill) {
    // done: interior filled with the gradient
    blockStyle = { background: gradient ?? undefined, border: "1px solid transparent" };
  } else {
    // hollow multi-type: grid-coloured interior, gradient ring drawn by an overlay
    blockStyle = { background: "#fbf6ec", border: "none" };
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
  // Show description once there's room beneath the title row, time last. Thresholds are
  // the legacy px values for 26px rows, compared in rows so they scale with rowH.
  const text = blockText(height, rowH, !!p.desc);
  const showDesc = !isEditing && text.desc;
  const showTime = !isEditing && text.time;

  // mouse: invisible 7px edge handles (hidden on coarse pointers, see styles.ts)
  const edgeHandle = (edge: ResizeEdge) => (
    <div
      className="cadence-edge"
      style={edge === "top" ? S.resizeHandle : { ...S.resizeHandle, top: "auto", bottom: 0 }}
      onPointerDown={(e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        engine.startResize(e, e.currentTarget, p, edge, { capture: true });
      }}
      onClick={(e) => e.stopPropagation()}
    />
  );

  // touch (coarse pointers only, see styles.ts): the visible grips, and the part of their
  // hit area outside the block. The part inside is handled by engine.pressBlock. These are
  // siblings of the block in the day column so they can reach past its clipped edges.
  const zones = gripZones(top, height, colHeight);
  const gripColor = solidFill ? "#fff" : baseColor;
  const gripFade = lifted ? 0.35 : undefined;
  const outsideZone = (edge: ResizeEdge) => {
    const h = edge === "top" ? zones.outsideTop : zones.outsideBottom;
    if (h <= 0) return null;
    return (
      <div
        className="cadence-grip"
        style={{ ...S.gripZone, top: edge === "top" ? top - h : top + height, height: h, width: GRIP_ZONE_WIDTH }}
        onPointerDown={(e) => {
          e.stopPropagation();
          engine.startResize(e, e.currentTarget, p, edge, { capture: true });
        }}
      />
    );
  };

  return (
    <>
      <div
        data-block-id={p.id}
        className={isEditing ? "cadence-block" : "cadence-src cadence-block"}
        data-press={pressed ? "" : undefined}
        onPointerDown={(e) => {
          // the open editor's own controls must never pick the block up
          if (!isEditing) engine.pressBlock(e, e.currentTarget, p);
        }}
        onClick={() => onTap(p)}
        onContextMenu={(e) => onContextMenu(e, p)}
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
          transition: "background 0.15s, transform 0.12s, opacity 0.12s",
          opacity: lifted ? 0.35 : undefined,
          outline: tagColor ? `2px solid ${tagColor}` : undefined,
        }}
      >
        {ringOverlay}
        {!isEditing && edgeHandle("top")}
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
          <BlockEditor
            block={p}
            cats={allCats}
            baseColor={baseColor}
            onClose={() => setEditingId(null)}
            onDelete={() => {
              actions.removeBlock(p.id);
              setEditingId(null);
            }}
            onMoveToDay={(day) => onMoveToDay(p, day)}
            actions={actions}
          />
        ) : (
          <>
            {p.label && <div style={S.placedLabel}>{p.label}</div>}
            {showDesc && (
              <div style={{ ...S.placedDesc, opacity: solidFill ? 0.85 : 0.75, WebkitLineClamp: text.descLines }}>
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
        {!isEditing && edgeHandle("bottom")}
      </div>
      {!isEditing && (
        <>
          {outsideZone("top")}
          {outsideZone("bottom")}
          <div className="cadence-grip" style={{ ...S.gripBar, top: top - 2, background: gripColor, opacity: gripFade }} />
          <div className="cadence-grip" style={{ ...S.gripBar, top: top + height - 2, background: gripColor, opacity: gripFade }} />
        </>
      )}
    </>
  );
}
