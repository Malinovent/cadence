import type React from "react";

// ============================================================
//  STYLES — warm paper / editorial aesthetic (ported verbatim from legacy)
// ============================================================
export const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,900&family=Spline+Sans+Mono:wght@400;500&display=swap');
* { box-sizing: border-box; }
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-thumb { background: #cabfb2; border-radius: 4px; }
`;
export const ink = "#2b2622";
export const paper = "#f4ede1";
export const paper2 = "#ece2d2";
export const line = "#d8cbb8";
export const S = {
  root: {
    fontFamily: "'Fraunces', Georgia, serif",
    background: paper,
    color: ink,
    minHeight: "100%",
    padding: 20,
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
    gap: 6
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
    fontFamily: "'Fraunces', serif",
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
    fontFamily: "'Fraunces', serif",
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
    fontFamily: "'Fraunces', serif",
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
    fontFamily: "'Fraunces', serif",
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
  timeColWrap: {
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
    fontFamily: "'Fraunces', serif",
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
    fontFamily: "'Fraunces', serif",
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
  doneToggle: {
    border: "1.5px solid transparent",
    width: 16,
    height: 16,
    borderRadius: "50%",
    cursor: "pointer",
    fontSize: 10,
    lineHeight: 1,
    padding: 0,
    flexShrink: 0
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
    fontFamily: "'Fraunces', serif",
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
    fontFamily: "'Fraunces', serif",
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
    fontFamily: "'Fraunces', serif",
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
    fontFamily: "'Fraunces', serif",
    fontWeight: 500,
    fontSize: 14,
    color: ink
  }
} satisfies Record<string, React.CSSProperties>;
