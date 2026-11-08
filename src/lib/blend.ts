// Soft blend of the tagged areas' colours, for a block in several areas. Each colour sits at a
// single stop and CSS interpolates between them; stops are inset (15%..85%) so each colour reads
// solidly at its own end before the transition begins. Shared by the calendar and the previews.
export const blendGradient = (colors: readonly string[]): string =>
  `linear-gradient(135deg, ${colors
    .map((c, i) => {
      const pct = colors.length === 1 ? 50 : Math.round(15 + (i / (colors.length - 1)) * 70);
      return `${c} ${pct}%`;
    })
    .join(", ")})`;
