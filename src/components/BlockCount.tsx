import type React from "react";
import { blockCount, countStatus, type CountTone } from "../lib/blockCount";
import { withAlpha } from "../lib/gesture";
import type { PanelArea } from "../lib/panel";
import { warn, S } from "../styles";
import { useI18n } from "../i18n/I18nProvider";

const TONE: Record<CountTone, React.CSSProperties> = {
  calm: S.countCalm,
  done: S.countDone,
  under: S.countUnder,
  over: S.countOver,
};

// placed but not yet done: fine stripes in the area's colour (JP, 2026-11-08, option C); the ink
// stripes past a limit stay coarser and ink, so the two don't read alike
const placed = (color: string) => `repeating-linear-gradient(45deg, ${color} 0 1.5px, transparent 1.5px 3.5px)`;

/**
 * Visual B (JP, 2026-11-07): under an area, a square per block of its goal, filled as you plan,
 * and what's left in time ("3h to go"; JP, 2026-11-08: the goal is time, the squares the picture).
 * Under: an outlined ink tag with "!" (never red). Past the goal (option B): a short line at the
 * goal, then more squares, striped while only placed and solid once ticked, like the others: red
 * past an "at most" or "between", with a solid "! 2h over" tag; the area's colour past an "at
 * least" (the line green), with "✓ 2h above".
 */
export default function BlockCount({ area: a }: { area: PanelArea }) {
  const { m } = useI18n();
  if (!a.balance) return null;
  const c = blockCount(a.balance.limit, a.balance.plannedMins, a.mins, a.doneMins);
  const status = countStatus(c, m.lib);
  const kind = a.balance.limit.kind;
  const total = c.squares + c.extra + c.above;

  // past the goal (JP, 2026-11-08, option B): a short line at the goal, then squares striped while
  // only placed and solid once ticked (JP: "if I go over in blocks assigned, but not blocks complete,
  // the red blocks should be hashed. Same for the at least"). Past an "at most" or "between": red.
  // Past an "at least": a green line, then the area's own colour.
  const over = c.extra > 0;
  const lineColor = over ? warn : "var(--c-done)";
  const pastColor = over ? warn : a.color;
  // "between" reads as "at least" its low end plus "at most" its top (JP, 2026-11-08: "consistent
  // with our choices for in between"): once past the low end, the same green line as an "at least"
  const limit = a.balance.limit;
  const pastLow = limit.kind === "range" && c.needed > 0 && c.needed < c.squares && a.balance.plannedMins > limit.min;
  const squares = Array.from({ length: total }, (_, i) => i).flatMap((i): React.ReactNode => {
    if (i >= c.squares) {
      const fill = Math.max(0, Math.min(1, c.filled - i));
      const done = Math.max(0, Math.min(fill, c.done - i));
      const square = (
        <span key={i} style={{ ...S.square, border: `1.5px solid ${pastColor}` }}>
          {done > 0 && <span style={{ ...S.squareFill, width: `${done * 100}%`, background: pastColor }} />}
          {fill > done && (
            <span
              style={{
                ...S.squareFill,
                left: `${done * 100}%`,
                width: `${(fill - done) * 100}%`,
                background: placed(pastColor),
              }}
            />
          )}
        </span>
      );
      return i === c.squares ? [<span key="goal" style={{ ...S.goalLine, background: lineColor }} />, square] : square;
    }
    const fill = Math.max(0, Math.min(1, c.filled - i));
    const done = Math.max(0, Math.min(fill, c.done - i)); // the solid part, then the striped rest
    // room, not need, looks the same everywhere: all of an "at most", and a "between" past its low end
    const room = kind === "ceiling" || (kind === "range" && i >= c.needed);
    // the lighter edge marks empty room only; once anything is in a square it looks the same as any
    // other area's (JP, 2026-11-08: "the green fill looks different than the blue")
    const border = `1.5px solid ${room && fill === 0 ? withAlpha(a.color, "99") : a.color}`;
    const square = (
      <span key={i} style={{ ...S.square, border }}>
        {done > 0 && <span style={{ ...S.squareFill, width: `${done * 100}%`, background: a.color }} />}
        {fill > done && (
          <span
            style={{
              ...S.squareFill,
              left: `${done * 100}%`,
              width: `${(fill - done) * 100}%`,
              background: placed(a.color),
            }}
          />
        )}
      </span>
    );
    return pastLow && i === c.needed
      ? [<span key="low" style={{ ...S.goalLine, background: "var(--c-done)" }} />, square]
      : square;
  });

  // too many squares to draw: one thin bar, same words
  const scale = Math.max(c.squares, c.filled) || 1;
  const bar = (
    <span style={S.countBar}>
      <span
        style={{
          ...S.countBarFill,
          width: `${(Math.min(c.filled, c.squares) / scale) * 100}%`,
          background: placed(a.color),
        }}
      />
      {c.done > 0 && (
        <span
          style={{
            ...S.countBarFill,
            width: `${(Math.min(c.done, c.squares) / scale) * 100}%`,
            background: a.color,
          }}
        />
      )}
      {/* past the goal: striped while placed, solid once ticked, red past a limit */}
      {c.filled > c.squares && (
        <span
          style={{
            ...S.countBarFill,
            borderRadius: 0,
            left: `${(c.squares / scale) * 100}%`,
            width: `${((c.filled - c.squares) / scale) * 100}%`,
            background: placed(pastColor),
          }}
        />
      )}
      {c.done > c.squares && (
        <span
          style={{
            ...S.countBarFill,
            borderRadius: 0,
            left: `${(c.squares / scale) * 100}%`,
            width: `${((c.done - c.squares) / scale) * 100}%`,
            background: pastColor,
          }}
        />
      )}
      {kind === "range" && <span style={{ ...S.countBarMark, left: `${(c.needed / scale) * 100}%` }} />}
      <span style={{ ...S.countBarMark, left: `${(c.squares / scale) * 100}%` }} />
    </span>
  );

  return (
    <div style={S.countRow} data-coach={`count-${a.id}`} title={a.limitText ?? undefined}>
      <span aria-hidden="true" style={c.bar ? S.countBarWrap : S.squares}>
        {c.bar ? bar : squares}
      </span>
      <span style={{ ...S.countStatus, ...TONE[c.tone] }}>
        {c.tone === "done" && <span aria-hidden="true">✓ </span>}
        {(c.tone === "under" || c.tone === "over") && (
          <span aria-hidden="true" style={S.countBang}>
            !
          </span>
        )}
        <span style={S.srOnly}>{`${a.name}, ${a.limitText}: `}</span>
        {status}
      </span>
    </div>
  );
}
