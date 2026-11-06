import type React from "react";

// ============================================================
//  STYLES — warm paper / editorial aesthetic (ported verbatim from legacy)
// ============================================================
export const FONT_IMPORT = `
* { box-sizing: border-box; }
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-thumb { background: #cabfb2; border-radius: 4px; }
/* the panel hide/show text button: hover underline + 44px touch target on coarse pointers */
.cadence-tray-toggle { padding: 9px 0 9px 12px; margin: -9px 0; }
.cadence-tray-toggle:hover { text-decoration: underline; }
@media (pointer: coarse) { .cadence-tray-toggle { padding: 15px 0 15px 16px; margin: -15px 0; } }
/* reduced motion: nothing slides, grows or scales; state changes appear at once */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition: none !important; animation: none !important; scroll-behavior: auto !important; }
  .cadence-tray-item[data-press], .cadence-block[data-press] { transform: none !important; }
}
/* S1.6 add window: a quick, small entrance (off under reduced motion, above) */
@keyframes cadence-pop { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: none; } }
@keyframes cadence-rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
.cadence-slot-pick:not(:disabled):hover { background-color: var(--cadence-hover) !important; }
/* no double-tap zoom (pinch zoom stays) */
html, body { touch-action: manipulation; }
/* drag sources: long-press must not select text or open the iOS callout; vertical/horizontal pan still scrolls */
.cadence-src { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; touch-action: manipulation; }
.cadence-dragging, .cadence-dragging * { -webkit-user-select: none !important; user-select: none !important; }
/* tray item: press feedback and the touch hold-progress fill (colours come from --cadence-* set inline) */
.cadence-tray-item { position: relative; isolation: isolate; overflow: hidden; transition: transform 120ms, background-color 120ms; }
.cadence-tray-item[data-press] { transform: scale(0.97); }
.cadence-tray-item[data-press]:not([data-armed]) { background-color: var(--cadence-press) !important; }
.cadence-hold-fill { position: absolute; inset: 0; z-index: -1; pointer-events: none; background: var(--cadence-hold); transform: scaleX(0); transform-origin: left center; }
.cadence-tray-item[data-holding] > .cadence-hold-fill { transform: scaleX(1); transition: transform 350ms linear; }
.cadence-block[data-press] { transform: scale(0.98); }
@media (hover: hover) {
  .cadence-tray-item:not([data-armed]):not([data-press]):hover { background-color: var(--cadence-hover) !important; }
}
/* touch: visible resize grips instead of the invisible mouse edges; 16px inputs so iOS does not zoom on focus */
@media (pointer: coarse) {
  .cadence-edge { display: none !important; }
  input, textarea { font-size: 16px !important; }
}
@media not all and (pointer: coarse) {
  .cadence-grip, .cadence-coarse-only { display: none !important; }
}
/* block tick: bigger on touch */
@media (pointer: coarse) {
  .cadence-tick { width: 24px !important; height: 24px !important; font-size: 14px !important; }
}
/* small round/text buttons (task check, dismiss): 44px hit area on touch without changing the layout */
.cadence-hit44 { position: relative; }
@media (pointer: coarse) {
  .cadence-hit44::after { content: ""; position: absolute; left: 50%; top: 50%; width: 44px; height: 44px; transform: translate(-50%, -50%); }
}
`;
export const ink = "#2b2622";
export const paper = "#f4ede1";
export const paper2 = "#ece2d2";
export const line = "#d8cbb8";
// the block happening now: heavier ink outline drawn as a box-shadow (keeps its layout)
export const nowRing = `0 0 0 2px ${ink}`;
export const S = {
  root: {
    fontFamily: "'Fraunces Variable', 'Fraunces', Georgia, serif",
    background: paper,
    color: ink,
    minHeight: "100%",
    padding: "max(20px, env(safe-area-inset-top)) max(20px, env(safe-area-inset-right)) max(20px, env(safe-area-inset-bottom)) max(20px, env(safe-area-inset-left))",
    backgroundImage: "radial-gradient(#e6dcc9 0.5px, transparent 0.5px)",
    backgroundSize: "14px 14px"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottom: `2px solid ${ink}`,
    paddingBottom: 14,
    marginBottom: 20,
    flexWrap: "wrap",
    gap: 12
  },
  logo: {
    fontSize: 40,
    fontWeight: 900,
    margin: 0,
    letterSpacing: "-0.02em",
    lineHeight: 1
  },
  tagline: {
    margin: "4px 0 0",
    fontStyle: "italic",
    color: "#7a6e5e",
    fontSize: 14
  },
  nav: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap"
  },
  navBtn: {
    fontFamily: "'Spline Sans Mono', monospace",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    padding: "8px 14px",
    border: `1.5px solid ${ink}`,
    background: "transparent",
    color: ink,
    cursor: "pointer",
    borderRadius: 2
  },
  navBtnActive: {
    background: ink,
    color: paper
  },
  // Phase 4: nav with the sync status line under it, right-aligned (SPEC "Phase 4 design: sync" → "UI")
  navStack: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 6
  },
  syncStatus: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: 0,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontFamily: "'Spline Sans Mono', monospace",
    fontSize: 10,
    color: "#9a8d7d",
    textTransform: "uppercase",
    letterSpacing: "0.08em"
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    flexShrink: 0
  },
  // Phase 4: first-sign-in conflict strip above the calendar body
  conflictBanner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
    background: paper2,
    border: `1.5px solid ${ink}`,
    borderRadius: 4,
    padding: "10px 14px",
    marginBottom: 20,
    fontFamily: "'Fraunces Variable', 'Fraunces', serif",
    fontSize: 14
  },
  // S1.8 starter weeks: a template row with a short description
  starterRow: {
    alignItems: "flex-start"
  },
  starterText: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 2
  },
  starterBlurb: {
    fontSize: 12,
    color: "#7a6e5e",
    lineHeight: 1.35
  },
  starterNote: {
    fontFamily: "'Spline Sans Mono', monospace",
    fontSize: 10,
    color: "#7a6e5e"
  },
  // S1.7 welcome back: a calm card above the calendar
  welcomeCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    background: paper2,
    border: `1.5px solid ${ink}`,
    borderRadius: 4,
    padding: "12px 16px",
    marginBottom: 20,
    fontFamily: "'Fraunces Variable', 'Fraunces', serif",
    fontSize: 15
  },
  welcomeText: {
    display: "flex",
    flexDirection: "column",
    gap: 2
  },
  welcomeTitle: {
    fontWeight: 700
  },
  welcomeNote: {
    fontFamily: "'Spline Sans Mono', monospace",
    fontSize: 11,
    color: "#7a6e5e"
  },
  welcomeActions: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10
  },
  welcomeStarters: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    fontSize: 13,
    color: "#7a6e5e"
  },
  welcomeStarter: {
    minHeight: 36,
    padding: "6px 10px",
    border: `1.5px solid ${ink}`,
    background: "transparent",
    color: ink,
    borderRadius: 3,
    cursor: "pointer",
    fontFamily: "'Fraunces Variable', 'Fraunces', serif",
    fontWeight: 600,
    fontSize: 13
  },
  welcomeUse: {
    minHeight: 40,
    padding: "8px 14px",
    border: "none",
    background: ink,
    color: paper,
    borderRadius: 3,
    cursor: "pointer",
    fontFamily: "'Fraunces Variable', 'Fraunces', serif",
    fontWeight: 600,
    fontSize: 14
  },
  // Phase 4: borderless text button ("Use a different email", "Choose which to keep →")
  textBtn: {
    padding: 0,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    color: ink,
    fontFamily: "'Fraunces Variable', 'Fraunces', serif",
    fontSize: 14,
    fontWeight: 600
  },
  body: {
    display: "grid",
    gridTemplateColumns: "300px 1fr",
    gap: 20,
    alignItems: "start"
  },
  sidebar: {
    display: "flex",
    flexDirection: "column",
    gap: 14
  },
  weekToggle: {
    display: "flex",
    gap: 0,
    border: `1.5px solid ${ink}`,
    borderRadius: 3,
    overflow: "hidden"
  },
  weekBtn: {
    flex: 1,
    padding: "10px 0",
    border: "none",
    background: "transparent",
    fontFamily: "'Fraunces Variable', 'Fraunces', serif",
    fontWeight: 600,
    fontSize: 15,
    cursor: "pointer",
    color: ink
  },
  weekBtnActive: {
    background: ink,
    color: paper
  },
  panelLabel: {
    fontFamily: "'Spline Sans Mono', monospace",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: "#9a8d7d",
    marginTop: 4
  },
  tray: {
    display: "flex",
    flexDirection: "column",
    gap: 6
  },
  trayBlock: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 12px",
    borderRadius: 4,
    background: "transparent",
    fontWeight: 600,
    cursor: "grab",
    fontSize: 14
  },
  trayMins: {
    fontFamily: "'Spline Sans Mono', monospace",
    fontSize: 11,
    opacity: 0.85
  },
  quotaList: {
    display: "flex",
    flexDirection: "column",
    gap: 8
  },
  quotaRow: {
    display: "flex",
    alignItems: "center",
    gap: 8
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    flexShrink: 0
  },
  quotaName: {
    fontSize: 13,
    width: 58,
    flexShrink: 0
  },
  quotaBarWrap: {
    flex: 1,
    height: 7,
    background: paper2,
    borderRadius: 4,
    overflow: "hidden"
  },
  quotaBar: {
    height: "100%",
    transition: "width 0.3s"
  },
  quotaCount: {
    fontFamily: "'Spline Sans Mono', monospace",
    fontSize: 10,
    width: 70,
    textAlign: "right",
    flexShrink: 0
  },
  // S1.2 guardrail balance (replaces the quota rows): name, kind, partial credit, then the bar
  balanceList: {
    display: "flex",
    flexDirection: "column",
    gap: 10
  },
  balanceHead: {
    display: "flex",
    alignItems: "baseline",
    gap: 6,
    marginBottom: 4
  },
  balanceName: {
    fontSize: 13,
    fontWeight: 600,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  },
  balanceKind: {
    fontFamily: "'Spline Sans Mono', monospace",
    fontSize: 9,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#7a6e5e",
    whiteSpace: "nowrap"
  },
  balanceCount: {
    marginLeft: "auto",
    fontFamily: "'Spline Sans Mono', monospace",
    fontSize: 10,
    color: ink,
    whiteSpace: "nowrap"
  },
  balanceTrack: {
    position: "relative",
    height: 7,
    background: paper2,
    borderRadius: 4
  },
  balanceFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 4,
    transition: "width 0.3s"
  },
  // "still to plan": the gap up to a floor or range, in grey, never red
  balanceGap: {
    position: "absolute",
    top: 0,
    bottom: 0,
    background: "#cabfb2"
  },
  balanceBand: {
    position: "absolute",
    top: 0,
    bottom: 0,
    background: line
  },
  balanceMark: {
    position: "absolute",
    top: -3,
    width: 2,
    height: 13,
    marginLeft: -1,
    background: ink
  },
  balanceNotes: {
    background: paper2,
    borderRadius: 4,
    padding: "8px 10px",
    marginTop: 12,
    fontSize: 12,
    lineHeight: 1.45,
    display: "flex",
    flexDirection: "column",
    gap: 4
  },
  completionCard: {
    background: ink,
    color: paper,
    padding: "14px 16px",
    borderRadius: 4,
    textAlign: "center"
  },
  completionPct: {
    fontSize: 38,
    fontWeight: 900,
    lineHeight: 1
  },
  completionLabel: {
    fontSize: 11,
    fontFamily: "'Spline Sans Mono', monospace",
    opacity: 0.8,
    marginTop: 4
  },
  // S1.3 balanced weeks card: the season's count and one square per week
  seasonCard: {
    background: ink,
    color: paper,
    padding: "14px 16px",
    borderRadius: 4,
    display: "flex",
    alignItems: "center",
    gap: 14
  },
  seasonNum: {
    fontSize: 44,
    fontWeight: 900,
    lineHeight: 1,
    minWidth: 30,
    textAlign: "center"
  },
  seasonLabel: {
    fontSize: 14,
    lineHeight: 1.25
  },
  seasonSquares: {
    display: "flex",
    flexWrap: "wrap",
    gap: 4,
    margin: "6px 0 4px"
  },
  seasonSquare: {
    width: 12,
    height: 12,
    borderRadius: 2,
    boxSizing: "border-box"
  },
  seasonLegend: {
    fontFamily: "'Spline Sans Mono', monospace",
    fontSize: 9,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    opacity: 0.8
  },
  tplSection: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    borderTop: `1px dashed ${line}`,
    paddingTop: 12
  },
  tplSave: {
    padding: "8px",
    border: `1.5px dashed ${ink}`,
    background: "transparent",
    cursor: "pointer",
    borderRadius: 3,
    fontFamily: "'Fraunces Variable', 'Fraunces', serif",
    fontWeight: 500,
    color: ink
  },
  tplNameRow: {
    display: "flex",
    alignItems: "center",
    gap: 5
  },
  tplNameInput: {
    flex: 1,
    padding: "7px 8px",
    border: `1.5px solid ${ink}`,
    borderRadius: 3,
    fontFamily: "'Fraunces Variable', 'Fraunces', serif",
    fontSize: 13,
    background: "#fff",
    color: ink,
    minWidth: 0
  },
  tplSaveConfirm: {
    padding: "7px 12px",
    border: "none",
    background: "#1FA98A",
    color: "#fff",
    borderRadius: 3,
    cursor: "pointer",
    fontFamily: "'Spline Sans Mono', monospace",
    fontSize: 11,
    flexShrink: 0
  },
  tplEmpty: {
    fontSize: 12,
    color: "#9a8d7d",
    fontStyle: "italic"
  },
  tplRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: paper2,
    padding: "6px 8px",
    borderRadius: 3
  },
  tplName: {
    flex: 1,
    fontSize: 13
  },
  tplApply: {
    fontSize: 11,
    padding: "3px 8px",
    border: "none",
    background: ink,
    color: paper,
    borderRadius: 2,
    cursor: "pointer",
    fontFamily: "'Spline Sans Mono', monospace"
  },
  tplDel: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    color: "#b54",
    fontSize: 13
  },
  advanceBtn: {
    marginTop: 6,
    padding: "11px",
    border: "none",
    background: "#1FA98A",
    color: "#fff",
    borderRadius: 4,
    cursor: "pointer",
    fontFamily: "'Fraunces Variable', 'Fraunces', serif",
    fontWeight: 600,
    fontSize: 13,
    boxShadow: "2px 2px 0 rgba(0,0,0,0.18)"
  },
  gridWrap: {
    overflowX: "auto",
    border: `1.5px solid ${ink}`,
    borderRadius: 4,
    background: "#fbf6ec"
  },
  headRow: {
    display: "grid",
    minWidth: 700,
    borderBottom: `1.5px solid ${ink}`
  },
  bodyRow: {
    display: "grid",
    minWidth: 700
  },
  corner: {
    borderRight: `1px solid ${line}`
  },
  dayHead: {
    padding: "10px 4px",
    textAlign: "center",
    fontWeight: 600,
    borderRight: `1px solid ${line}`,
    fontSize: 14
  },
  // Phase 3: phone day strip, replaces headRow (SPEC "Phone layout")
  dayStrip: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    borderBottom: `1.5px solid ${ink}`
  },
  dayStripBtn: {
    minHeight: 44,
    padding: "6px 0",
    border: "none",
    background: "transparent",
    color: ink,
    fontFamily: "'Fraunces Variable', 'Fraunces', serif",
    fontWeight: 600,
    fontSize: "clamp(11px, 3.5vw, 14px)",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 3
  },
  dayDot: {
    width: 4,
    height: 4,
    borderRadius: "50%"
  },
  timeColWrap: {
    position: "relative",
    borderRight: `1px solid ${line}`
  },
  timeLabel: {
    fontFamily: "'Spline Sans Mono', monospace",
    fontSize: 10,
    color: "#9a8d7d",
    padding: "2px 4px",
    textAlign: "right",
    borderBottom: `1px solid ${paper2}`,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "flex-end"
  },
  dayCol: {
    position: "relative",
    borderRight: `1px solid ${line}`
  },
  slotLine: {
    position: "absolute",
    left: 0,
    right: 0,
    borderBottom: `1px solid ${paper2}`,
    pointerEvents: "none"
  },
  placedBlock: {
    position: "absolute",
    left: 3,
    right: 3,
    borderRadius: 4,
    padding: "5px 7px",
    cursor: "grab",
    overflow: "hidden",
    boxShadow: "1px 1px 0 rgba(0,0,0,0.12)",
    zIndex: 2,
    transition: "background 0.15s"
  },
  resizeHandle: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 7,
    cursor: "ns-resize",
    zIndex: 3
  },
  // Phase 3: where a drag would land (SPEC "Interaction engine")
  dropPreview: {
    position: "absolute",
    left: 3,
    right: 3,
    border: `1.5px dashed ${ink}`,
    borderRadius: 4,
    pointerEvents: "none",
    zIndex: 4
  },
  // Phase 3: touch resize grip, the part of the hit area outside the block (below other blocks);
  // centred on the block, width set in Block.tsx from the grip span
  gripZone: {
    position: "absolute",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 1,
    touchAction: "none"
  },
  // Phase 3: visible touch grip, centred on a block edge
  gripBar: {
    position: "absolute",
    left: "50%",
    width: 22,
    height: 4,
    marginLeft: -11,
    borderRadius: 2,
    pointerEvents: "none",
    zIndex: 3
  },
  placedTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 4
  },
  placedNameWrap: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    minWidth: 0
  },
  pipRow: {
    display: "flex",
    gap: 2,
    flexShrink: 0
  },
  pip: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    display: "block"
  },
  placedTopRight: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    flexShrink: 0
  },
  placedDur: {
    fontFamily: "'Spline Sans Mono', monospace",
    fontSize: 9,
    fontWeight: 500
  },
  // S1.2 buffer blocks: "BUFFER" in the mono label style
  bufferName: {
    fontFamily: "'Spline Sans Mono', monospace",
    fontWeight: 500,
    fontSize: 10,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "#7a6e5e"
  },
  placedName: {
    fontWeight: 600,
    fontSize: 11,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  },
  placedLabel: {
    fontSize: 11,
    fontStyle: "italic",
    opacity: 0.95,
    marginTop: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  },
  placedDesc: {
    fontSize: 10,
    marginTop: 2,
    lineHeight: 1.25,
    overflow: "hidden",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical"
  },
  placedTime: {
    fontFamily: "'Spline Sans Mono', monospace",
    fontSize: 9,
    marginTop: 2
  },
  editWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
    marginTop: 3,
    background: paper,
    border: `1.5px solid ${ink}`,
    borderRadius: 4,
    padding: 7,
    boxShadow: "3px 3px 0 rgba(0,0,0,0.2)",
    minWidth: 190,
    position: "relative",
    zIndex: 30
  },
  inlineInput: {
    width: "100%",
    background: "transparent",
    border: "none",
    borderBottom: "1px solid",
    outline: "none",
    fontFamily: "'Fraunces Variable', 'Fraunces', serif",
    fontStyle: "italic",
    fontSize: 12,
    padding: "1px 0",
    color: ink
  },
  inlineArea: {
    width: "100%",
    background: "#fff",
    border: "1px solid",
    borderRadius: 3,
    outline: "none",
    fontFamily: "'Fraunces Variable', 'Fraunces', serif",
    fontSize: 11,
    padding: "4px 5px",
    resize: "vertical",
    minHeight: 34,
    color: ink
  },
  chipRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 3
  },
  chip: {
    fontFamily: "'Spline Sans Mono', monospace",
    fontSize: 9,
    padding: "2px 5px",
    borderRadius: 10,
    border: "1.5px solid",
    cursor: "pointer",
    lineHeight: 1.4
  },
  // block popup: the tasks in this block, and open tasks to add to it
  editTasks: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    borderTop: `1px dashed ${line}`,
    paddingTop: 5
  },
  editTasksLabel: {
    fontFamily: "'Spline Sans Mono', monospace",
    fontSize: 9,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#7a6e5e"
  },
  editTaskList: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    maxHeight: 132,
    overflowY: "auto"
  },
  editTask: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    width: "100%",
    minHeight: 26,
    padding: "3px 6px",
    border: `1px solid ${line}`,
    borderRadius: 4,
    background: "#fbf6ec",
    color: ink,
    cursor: "pointer",
    textAlign: "left",
    fontFamily: "'Fraunces Variable', 'Fraunces', serif",
    fontSize: 12,
    lineHeight: 1.2
  },
  editTaskOn: {
    background: paper2,
    borderColor: ink
  },
  editTaskName: {
    flex: 1,
    minWidth: 0,
    overflowWrap: "anywhere"
  },
  // Phase 3: right-aligned row holding (touch-only) "delete" and "done"
  editActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 5
  },
  editDone: {
    alignSelf: "flex-end",
    fontFamily: "'Spline Sans Mono', monospace",
    fontSize: 10,
    padding: "3px 10px",
    border: "none",
    borderRadius: 3,
    background: ink,
    color: paper,
    cursor: "pointer"
  },
  // Sprint 1 "A tick on every block": round tick, ink ring; done = filled ink with a white check.
  // 16px with the mouse (fits a 30-min block), 24px on touch (FONT_IMPORT .cadence-tick), 44px hit area on touch.
  doneToggle: {
    border: `1.5px solid ${ink}`,
    width: 16,
    height: 16,
    borderRadius: "50%",
    cursor: "pointer",
    fontSize: 10,
    fontWeight: 700,
    lineHeight: 1,
    padding: 0,
    flexShrink: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    zIndex: 4
  },
  // the block happening now ("Now · 38 min left", ring = nowRing below) and the current-time line
  nowBadge: {
    fontFamily: "'Spline Sans Mono', monospace",
    fontSize: 9,
    fontWeight: 500,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: ink,
    display: "flex",
    alignItems: "center",
    gap: 5,
    marginBottom: 2,
    whiteSpace: "nowrap",
    overflow: "hidden"
  },
  nowTag: {
    background: ink,
    color: paper,
    padding: "1px 4px",
    borderRadius: 2
  },
  nowLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 0,
    borderTop: `2px solid ${ink}`,
    pointerEvents: "none",
    zIndex: 4 // above the blocks (JP, 2026-11-04), under an open block editor (20)
  },
  nowClock: {
    position: "absolute",
    right: 2,
    transform: "translateY(-50%)",
    fontFamily: "'Spline Sans Mono', monospace",
    fontSize: 10,
    background: ink,
    color: paper,
    padding: "1px 4px",
    borderRadius: 2,
    pointerEvents: "none",
    zIndex: 5
  },
  statsBody: {
    maxWidth: 760
  },
  statsHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
    flexWrap: "wrap",
    gap: 10
  },
  statsTitle: {
    fontSize: 28,
    fontWeight: 900,
    margin: 0
  },
  rangeToggle: {
    display: "flex",
    gap: 0,
    border: `1.5px solid ${ink}`,
    borderRadius: 3,
    overflow: "hidden"
  },
  rangeBtn: {
    padding: "7px 16px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontFamily: "'Spline Sans Mono', monospace",
    fontSize: 12,
    textTransform: "uppercase",
    color: ink
  },
  rangeBtnActive: {
    background: ink,
    color: paper
  },
  streakRow: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 26
  },
  streakCard: {
    flex: "1 1 120px",
    background: "#fbf6ec",
    border: `1.5px solid ${line}`,
    borderRadius: 4,
    padding: "14px",
    textAlign: "center"
  },
  streakFlame: {
    fontSize: 22
  },
  streakNum: {
    fontSize: 30,
    fontWeight: 900,
    lineHeight: 1
  },
  streakName: {
    fontSize: 11,
    fontFamily: "'Spline Sans Mono', monospace",
    color: "#9a8d7d",
    marginTop: 2
  },
  barChart: {
    display: "flex",
    flexDirection: "column",
    gap: 14
  },
  barRow: {
    display: "flex",
    alignItems: "center",
    gap: 12
  },
  barName: {
    width: 90,
    fontSize: 15,
    fontWeight: 500,
    flexShrink: 0
  },
  barTrack: {
    flex: 1,
    background: paper2,
    borderRadius: 4,
    height: 32,
    overflow: "hidden"
  },
  barFill: {
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingRight: 8,
    minWidth: 40,
    transition: "width 0.4s",
    borderRadius: 4
  },
  barVal: {
    color: "#fff",
    fontFamily: "'Spline Sans Mono', monospace",
    fontSize: 12,
    fontWeight: 500
  },
  barSessions: {
    width: 90,
    fontSize: 12,
    color: "#9a8d7d",
    fontFamily: "'Spline Sans Mono', monospace",
    flexShrink: 0
  },
  // Undo after a week is replaced, above the phone dock
  undoBar: {
    position: "fixed",
    left: "50%",
    bottom: "calc(14px + env(safe-area-inset-bottom))",
    transform: "translateX(-50%)",
    zIndex: 30,
    display: "flex",
    alignItems: "center",
    gap: 12,
    maxWidth: "calc(100vw - 24px)",
    padding: "8px 10px 8px 14px",
    borderRadius: 6,
    background: ink,
    color: paper,
    fontSize: 14,
    whiteSpace: "nowrap",
    boxShadow: "0 6px 18px rgba(43, 38, 34, 0.25)"
  },
  undoBtn: {
    minHeight: 32,
    padding: "4px 10px",
    border: `1.5px solid ${paper}`,
    borderRadius: 3,
    background: "transparent",
    color: paper,
    cursor: "pointer",
    fontFamily: "'Fraunces Variable', 'Fraunces', serif",
    fontWeight: 600,
    fontSize: 14
  },
  undoClose: {
    border: "none",
    background: "transparent",
    color: paper,
    cursor: "pointer",
    fontSize: 13
  },
  // S1.11 early bird: a small badge by the logo, and a thank-you in Settings
  earlyBadge: {
    display: "inline-block",
    marginLeft: 10,
    padding: "2px 7px",
    verticalAlign: "middle",
    border: `1.5px solid ${ink}`,
    borderRadius: 999,
    fontFamily: "'Spline Sans Mono', monospace",
    fontSize: 10,
    fontWeight: 500,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: ink,
    background: "#fbf6ec"
  },
  earlyThanks: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    background: paper2,
    borderRadius: 4,
    padding: "12px 14px",
    margin: "24px 0 8px",
    fontSize: 14,
    lineHeight: 1.45
  },
  // S1.10 last week in words
  weekWords: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    background: paper2,
    borderRadius: 4,
    padding: "12px 14px",
    marginBottom: 24
  },
  weekWord: {
    display: "flex",
    gap: 8,
    fontSize: 14,
    lineHeight: 1.4
  },
  statsNote: {
    marginTop: 24,
    fontStyle: "italic",
    color: "#9a8d7d",
    fontSize: 13
  },
  resetRow: {
    marginTop: 28,
    paddingTop: 18,
    borderTop: `1px dashed ${line}`,
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap"
  },
  resetBtn: {
    padding: "8px 14px",
    border: `1.5px solid #b54`,
    background: "transparent",
    color: "#b54",
    borderRadius: 3,
    cursor: "pointer",
    fontFamily: "'Spline Sans Mono', monospace",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.06em"
  },
  resetWarn: {
    fontSize: 13,
    color: "#b54",
    fontStyle: "italic"
  },
  resetConfirm: {
    padding: "8px 16px",
    border: "none",
    background: "#b54",
    color: "#fff",
    borderRadius: 3,
    cursor: "pointer",
    fontFamily: "'Fraunces Variable', 'Fraunces', serif",
    fontWeight: 600,
    fontSize: 13
  },
  resetCancel: {
    padding: "8px 14px",
    border: `1.5px solid ${line}`,
    background: "transparent",
    color: ink,
    borderRadius: 3,
    cursor: "pointer",
    fontFamily: "'Fraunces Variable', 'Fraunces', serif",
    fontSize: 13
  },
  catBody: {
    maxWidth: 720
  },
  catIntro: {
    color: "#7a6e5e",
    fontSize: 14,
    marginTop: 4
  },
  catList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    marginTop: 16
  },
  catRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "#fbf6ec",
    padding: "12px 14px",
    borderRadius: 4,
    flexWrap: "wrap"
  },
  catNameInput: {
    flex: "1 1 140px",
    fontFamily: "'Fraunces Variable', 'Fraunces', serif",
    fontSize: 16,
    fontWeight: 600,
    border: "none",
    borderBottom: `1.5px solid ${line}`,
    background: "transparent",
    color: ink,
    padding: "4px 2px"
  },
  catField: {
    display: "flex",
    flexDirection: "column",
    fontSize: 10,
    fontFamily: "'Spline Sans Mono', monospace",
    color: "#9a8d7d",
    textTransform: "uppercase",
    gap: 2
  },
  catNum: {
    width: 64,
    fontFamily: "'Spline Sans Mono', monospace",
    fontSize: 14,
    border: `1.5px solid ${line}`,
    borderRadius: 3,
    padding: "5px",
    background: "#fff",
    color: ink
  },
  // S1.2 guardrail picker in the category row: Floor | Ceiling | Range, then the hours
  catGuard: {
    display: "flex",
    flexDirection: "column",
    gap: 4
  },
  kindGroup: {
    display: "inline-flex",
    border: `1.5px solid ${ink}`,
    borderRadius: 3,
    overflow: "hidden"
  },
  kindBtn: {
    fontFamily: "'Fraunces Variable', 'Fraunces', serif",
    fontSize: 12,
    fontWeight: 600,
    padding: "4px 10px",
    minHeight: 28,
    border: "none",
    background: "transparent",
    color: ink,
    cursor: "pointer"
  },
  kindBtnActive: {
    background: ink,
    color: paper
  },
  catGuardHint: {
    fontSize: 11,
    fontStyle: "italic",
    color: "#7a6e5e"
  },
  catColor: {
    width: 38,
    height: 38,
    border: "none",
    background: "none",
    cursor: "pointer",
    padding: 0
  },
  catDel: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    color: "#b54",
    fontSize: 16
  },
  catAdd: {
    marginTop: 16,
    padding: "10px 18px",
    border: `1.5px dashed ${ink}`,
    background: "transparent",
    cursor: "pointer",
    borderRadius: 4,
    fontFamily: "'Fraunces Variable', 'Fraunces', serif",
    fontWeight: 500,
    fontSize: 14,
    color: ink
  },
  // ---- S1.4 one panel for areas and tasks ----
  bodySolo: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    gap: 12,
    alignItems: "start"
  },
  mainCol: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    minWidth: 0
  },
  panelHead: {
    fontFamily: "'Spline Sans Mono', monospace",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: "#9a8d7d",
    marginTop: 4,
    display: "flex",
    alignItems: "center",
    gap: 8
  },
  panelToggle: {
    fontFamily: "inherit",
    fontSize: "inherit",
    textTransform: "inherit",
    letterSpacing: "inherit",
    color: "inherit",
    lineHeight: "14px",
    background: "none",
    border: "none",
    cursor: "pointer",
    flexShrink: 0
  },
  areaList: {
    display: "flex",
    flexDirection: "column",
    gap: 12
  },
  areaBalance: {
    marginTop: 5,
    padding: "0 2px"
  },
  trayName: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    minWidth: 0
  },
  panelSection: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    borderTop: `1px dashed ${line}`,
    paddingTop: 12
  },
  panelTaskAdd: {
    display: "flex",
    gap: 6,
    alignItems: "center"
  },
  panelTaskList: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    marginTop: 8
  },
  panelTaskRow: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#fbf6ec",
    padding: "6px 8px",
    borderRadius: 3
  },
  panelTaskCheck: {
    width: 18,
    height: 18,
    fontSize: 11
  },
  panelTaskName: {
    fontSize: 14
  },
  weekBar: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "stretch",
    gap: 12
  },
  weekBarLeft: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: 8,
    flex: "1 1 220px",
    maxWidth: 320
  },
  weekBarCard: {
    flex: "1 1 280px"
  },
  showPanelBtn: {
    alignSelf: "flex-start",
    padding: 0,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontFamily: "'Spline Sans Mono', monospace",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: "#9a8d7d"
  },
  seasonCardCompact: {
    padding: "10px 14px",
    height: "100%"
  },
  seasonNumCompact: {
    fontSize: 32
  },
  weekFooter: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-start",
    gap: 16
  },
  weekFooterTpl: {
    flex: "1 1 280px",
    maxWidth: 420
  },
  weekFooterAdvance: {
    flex: "0 1 auto",
    marginTop: 12
  },
  // phone dock: fixed to the bottom, Areas and Tasks tabs, folds to a slim bar
  dock: {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    background: paper,
    borderTop: `1.5px solid ${ink}`,
    boxShadow: "0 -2px 0 rgba(0,0,0,0.06)",
    paddingBottom: "env(safe-area-inset-bottom)"
  },
  dockBar: {
    display: "block",
    width: "100%",
    minHeight: 44,
    padding: "12px 16px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontFamily: "'Spline Sans Mono', monospace",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: ink,
    textAlign: "center"
  },
  dockHead: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px 0"
  },
  dockTabs: {
    display: "flex",
    flex: 1,
    border: `1.5px solid ${ink}`,
    borderRadius: 3,
    overflow: "hidden"
  },
  dockTab: {
    flex: 1,
    minHeight: 40,
    border: "none",
    background: "transparent",
    fontFamily: "'Fraunces Variable', 'Fraunces', serif",
    fontWeight: 600,
    fontSize: 15,
    cursor: "pointer",
    color: ink
  },
  dockTabActive: {
    background: ink,
    color: paper
  },
  dockFold: {
    minHeight: 44,
    minWidth: 44,
    padding: "0 4px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontFamily: "'Spline Sans Mono', monospace",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: "#9a8d7d"
  },
  dockBody: {
    maxHeight: "30vh",
    overflowY: "auto",
    padding: "10px 12px 12px"
  },
  dockAreas: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 10
  },
  // ---- S1.6 tap empty time to add: desktop window beside the slot, phone bottom sheet ----
  slotMenu: {
    position: "fixed",
    zIndex: 40,
    width: 252,
    background: paper,
    border: `1.5px solid ${ink}`,
    borderRadius: 8,
    boxShadow: "0 8px 24px rgba(43, 38, 34, 0.18)",
    padding: 12,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    animation: "cadence-pop 120ms ease-out"
  },
  // phone: a floating sheet, not edge to edge
  slotSheet: {
    position: "fixed",
    left: 10,
    right: 10,
    bottom: "calc(10px + env(safe-area-inset-bottom))",
    maxWidth: 460,
    margin: "0 auto",
    zIndex: 41,
    maxHeight: "70vh",
    overflowY: "auto",
    background: paper,
    border: `1.5px solid ${ink}`,
    borderRadius: 14,
    boxShadow: "0 8px 24px rgba(43, 38, 34, 0.22)",
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    animation: "cadence-rise 160ms ease-out"
  },
  slotOptions: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(104px, 1fr))",
    gap: 8
  },
  slotOption: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    minHeight: 44,
    minWidth: 0,
    padding: "8px 10px",
    borderRadius: 6,
    background: "#fbf6ec",
    color: ink,
    textAlign: "left",
    fontFamily: "'Fraunces Variable', 'Fraunces', serif",
    fontWeight: 600,
    fontSize: 14
  },
  slotOptionName: {
    minWidth: 0,
    overflowWrap: "anywhere",
    lineHeight: 1.15
  },
  slotBackdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 40,
    background: "rgba(43, 38, 34, 0.25)"
  },
  slotHead: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontFamily: "'Spline Sans Mono', monospace",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: "#7a6e5e"
  },
  // the tapped slot, outlined while the window is open
  slotMark: {
    position: "absolute",
    left: 3,
    right: 3,
    border: `1.5px solid ${ink}`,
    borderRadius: 4,
    background: "rgba(43, 38, 34, 0.06)",
    pointerEvents: "none",
    zIndex: 4
  },
  // ---- S1.5 tasks ----
  areaTasks: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    marginTop: 4
  },
  panelTaskText: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column"
  },
  // a task in a block: small dots in that block's area colours, before "Wed 9am"
  taskDot: {
    display: "inline-block",
    width: 7,
    height: 7,
    marginRight: 3,
    verticalAlign: "0px"
  },
  panelTaskNote: {
    fontFamily: "'Spline Sans Mono', monospace",
    fontSize: 10,
    color: "#7a6e5e"
  },
  taskDoneToggle: {
    alignSelf: "flex-start",
    padding: "2px 0",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontFamily: "'Fraunces Variable', 'Fraunces', serif",
    fontSize: 12,
    fontStyle: "italic",
    color: "#7a6e5e",
    textDecoration: "underline"
  },
  blockTodos: {
    listStyle: "none",
    margin: "3px 0 0",
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: 2
  },
  blockTodo: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    minWidth: 0
  },
  blockTodoBox: {
    width: 12,
    height: 12,
    flexShrink: 0,
    padding: 0,
    border: "1.5px solid",
    borderRadius: 2,
    color: "#fff",
    fontSize: 8,
    lineHeight: 1,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  blockTodoName: {
    fontSize: 11,
    lineHeight: 1.25,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: ink
  },
  // ---- tasks (S1.4: inside the panel) ----
  taskAddRow: {
    display: "flex",
    gap: 10,
    marginTop: 16
  },
  taskList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginTop: 16
  },
  taskRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "#fbf6ec",
    padding: "10px 14px",
    borderRadius: 4
  },
  taskCheck: {
    width: 22,
    height: 22,
    flexShrink: 0,
    borderRadius: "50%",
    border: `1.5px solid ${ink}`,
    background: "transparent",
    color: "#fff",
    padding: 0,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    lineHeight: 1
  },
  taskCheckDone: {
    border: "1.5px solid #1FA98A",
    background: "#1FA98A"
  },
  taskName: {
    flex: 1,
    minWidth: 0,
    fontFamily: "'Fraunces Variable', 'Fraunces', serif",
    fontSize: 16,
    cursor: "pointer",
    overflowWrap: "anywhere"
  },
  taskNameDone: {
    textDecoration: "line-through",
    color: "#9a8d7d"
  }
} satisfies Record<string, React.CSSProperties>;
