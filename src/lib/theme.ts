// The app's look (JP, 2026-11-08): paper (as it has always been), night, or high contrast, or
// following the device's light/dark setting. Per device; area colours never change.

export type Theme = "paper" | "night" | "contrast";
export type ThemeChoice = Theme | "device";
export const THEME_CHOICES: readonly ThemeChoice[] = ["paper", "night", "contrast", "device"];

/** The saved choice; paper for anything missing or odd, so nobody's look changes by surprise. */
export const parseTheme = (raw: string | null): ThemeChoice =>
  THEME_CHOICES.includes(raw as ThemeChoice) ? (raw as ThemeChoice) : "paper";

/** The theme to draw: "device" is night when the device is dark, paper otherwise. */
export const resolveTheme = (choice: ThemeChoice, deviceDark: boolean): Theme =>
  choice === "device" ? (deviceDark ? "night" : "paper") : choice;

/** Every colour the app's own look uses, by role. */
export type Palette = {
  ink: string; // text, outlines, filled buttons
  paper: string; // the page
  paper2: string; // a second, quieter surface
  line: string; // hairlines, grid rows
  card: string; // cards, blocks, chips
  field: string; // inputs
  soft: string; // secondary text
  muted: string; // labels, notes
  faint: string; // done, disabled
  danger: string; // delete marks
  done: string; // "done" green
  dots: string; // the page's dot pattern
  scroll: string; // scrollbars
};

export const PALETTES: Record<Theme, Palette> = {
  paper: {
    ink: "#2b2622",
    paper: "#f4ede1",
    paper2: "#ece2d2",
    line: "#d8cbb8",
    card: "#fbf6ec",
    field: "#ffffff",
    soft: "#5c5247",
    muted: "#7a6e5e",
    faint: "#9a8d7d",
    danger: "#bb5544",
    done: "#1FA98A",
    dots: "#e6dcc9",
    scroll: "#cabfb2",
  },
  night: {
    ink: "#ece4d6",
    paper: "#1c1916",
    paper2: "#262220",
    line: "#3d3630",
    card: "#24201c",
    field: "#2d2824",
    soft: "#cbbfae",
    muted: "#a99d8c",
    faint: "#857a6c",
    danger: "#e08a78",
    done: "#3fcca8",
    dots: "#28231f",
    scroll: "#4a433b",
  },
  contrast: {
    ink: "#000000",
    paper: "#ffffff",
    paper2: "#eeeeee",
    line: "#6b6b6b",
    card: "#ffffff",
    field: "#ffffff",
    soft: "#1a1a1a",
    muted: "#333333",
    faint: "#4d4d4d",
    danger: "#9b2c1f",
    done: "#00745a",
    dots: "#ffffff",
    scroll: "#6b6b6b",
  },
};

/** The CSS variables for one palette: `--c-ink: #2b2622; …` */
export const paletteVars = (p: Palette): string =>
  (Object.keys(p) as (keyof Palette)[]).map((k) => `--c-${k}: ${p[k]};`).join(" ");
