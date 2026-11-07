import type React from "react";
import { blockCount, countStatus, type CountTone } from "../lib/blockCount";
import { withAlpha } from "../lib/gesture";
import type { PanelArea } from "../lib/panel";
import { S } from "../styles";
import { useI18n } from "../i18n/I18nProvider";

const TONE: Record<CountTone, React.CSSProperties> = {
  calm: S.countCalm,
  done: S.countDone,
  under: S.countUnder,
  over: S.countOver,
};

/**
 * Visual B (JP, 2026-11-07): under an area, a square per block of its goal, filled as you plan,
 * and what's left in blocks. "Under" and "over" read as warnings in ink (never red, never colour
 * alone): an outlined tag with "!" for under, a solid one for over, and striped squares past
 * what an "at most" or "between" allows.
 */
export default function BlockCount({ area: a }: { area: PanelArea }) {
  const { m } = useI18n();
  if (!a.balance) return null;
  const c = blockCount(a.balance.limit, a.balance.plannedMins, a.mins);
  const status = countStatus(c, m.lib);
  const kind = a.balance.limit.kind;
  const total = c.squares + c.extra;

  const squares = Array.from({ length: total }, (_, i) => {
    if (i >= c.squares) return <span key={i} style={{ ...S.square, ...S.squareExtra }} />;
    const fill = Math.max(0, Math.min(1, c.filled - i));
    const optional = kind === "range" && i >= c.needed; // "between": past the low end is room, not need
    const allowance = kind === "ceiling"; // "at most": allowed, not needed
    const border = `1.5px ${optional ? "dashed" : "solid"} ${allowance ? withAlpha(a.color, "99") : a.color}`;
    return (
      <span key={i} style={{ ...S.square, border }}>
        {fill > 0 && <span style={{ ...S.squareFill, width: `${fill * 100}%`, background: a.color }} />}
      </span>
    );
  });

  // too many squares to draw: one thin bar, same words
  const scale = Math.max(c.squares, c.filled) || 1;
  const bar = (
    <span style={S.countBar}>
      <span
        style={{ ...S.countBarFill, width: `${(Math.min(c.filled, c.squares) / scale) * 100}%`, background: a.color }}
      />
      {c.filled > c.squares && (
        <span
          style={{
            ...S.countBarExtra,
            left: `${(c.squares / scale) * 100}%`,
            width: `${((c.filled - c.squares) / scale) * 100}%`,
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
