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
 * Under: an outlined ink tag with "!" (never red). Past an "at most" or "between": red, a solid
 * tag with "!" and striped squares, solid once done. Past an "at least": more squares in the area's
 * colour, dashed, and "✓ 2h above".
 */
export default function BlockCount({ area: a }: { area: PanelArea }) {
  const { m } = useI18n();
  if (!a.balance) return null;
  const c = blockCount(a.balance.limit, a.balance.plannedMins, a.mins, a.doneMins);
  const status = countStatus(c, m.lib);
  const kind = a.balance.limit.kind;
  const total = c.squares + c.extra + c.above;

  const squares = Array.from({ length: total }, (_, i) => {
    // past the limit: ink stripes while placed, solid ink once done (JP, 2026-11-08: "when I complete
    // the task, it says hashed")
    if (i >= c.squares && c.extra > 0) {
      const doneOver = Math.max(0, Math.min(1, c.done - i));
      return (
        <span key={i} style={{ ...S.square, ...S.squareExtra }}>
          {doneOver > 0 && <span style={{ ...S.squareFill, width: `${doneOver * 100}%`, background: warn }} />}
        </span>
      );
    }
    const fill = Math.max(0, Math.min(1, c.filled - i));
    const done = Math.max(0, Math.min(fill, c.done - i)); // the solid part, then the striped rest
    // "between": past the low end is room, not need; past an "at least" goal, extra
    const optional = (kind === "range" && i >= c.needed) || i >= c.squares;
    const allowance = kind === "ceiling"; // "at most": allowed, not needed
    const border = `1.5px ${optional ? "dashed" : "solid"} ${allowance ? withAlpha(a.color, "99") : a.color}`;
    return (
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
  });

  // too many squares to draw: one thin bar, same words
  const scale = Math.max(c.squares, c.filled) || 1;
  const bar = (
    <span style={S.countBar}>
      <span
        style={{
          ...S.countBarFill,
          width: `${((kind === "floor" ? c.filled : Math.min(c.filled, c.squares)) / scale) * 100}%`,
          background: placed(a.color),
        }}
      />
      {c.done > 0 && (
        <span
          style={{
            ...S.countBarFill,
            width: `${((kind === "floor" ? c.done : Math.min(c.done, c.squares)) / scale) * 100}%`,
            background: a.color,
          }}
        />
      )}
      {kind !== "floor" && c.filled > c.squares && (
        <span
          style={{
            ...S.countBarExtra,
            left: `${(c.squares / scale) * 100}%`,
            width: `${((c.filled - c.squares) / scale) * 100}%`,
          }}
        />
      )}
      {kind !== "floor" && c.done > c.squares && (
        <span
          style={{
            ...S.countBarFill,
            borderRadius: 0,
            left: `${(c.squares / scale) * 100}%`,
            width: `${((c.done - c.squares) / scale) * 100}%`,
            background: warn,
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
