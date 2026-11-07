import type React from "react";
import type { Interaction } from "../interaction/useInteraction";
import { withAlpha } from "../lib/gesture";
import type { PanelArea } from "../lib/panel";
import { fmtDur } from "../lib/time";
import { S } from "../styles";
import { useI18n } from "../i18n/I18nProvider";

// hover / press / hold-progress colours for the tray item CSS (styles.ts FONT_IMPORT)
const trayVars = (color: string) =>
  ({
    "--cadence-hover": withAlpha(color, "1a"),
    "--cadence-press": withAlpha(color, "26"),
    "--cadence-hold": withAlpha(color, "40"),
  }) as React.CSSProperties;

type Props = {
  area: PanelArea;
  interaction: Interaction;
  armed: boolean;
  onArm: (catId: string | null) => void;
};

/** The drag handle for an area (or the buffer): drag it into the grid, or tap it then tap a slot. */
export default function AreaChip({ area: a, interaction, armed, onArm }: Props) {
  const { engine, state } = interaction;
  const { lang } = useI18n();
  const press = state.press;
  const pressed = press?.source.kind === "tray" && press.source.catId === a.id;
  return (
    <div
      className="cadence-src cadence-tray-item"
      data-coach={`area-${a.id}`}
      data-press={pressed ? "" : undefined}
      data-holding={pressed && press.hold ? "" : undefined}
      data-armed={armed ? "" : undefined}
      onPointerDown={(e) => engine.pressSource(e, e.currentTarget, { kind: "tray", catId: a.id }, { hold: true })}
      // a tap (no drag) arms tap-to-place; tapping the armed item again disarms
      onClick={() => onArm(armed ? null : a.id)}
      onContextMenu={(e) => {
        if (engine.blocksContextMenu()) e.preventDefault();
      }}
      style={{
        ...S.trayBlock,
        border: `1.5px ${armed ? "solid" : "dashed"} ${a.color}`,
        color: armed ? "#fff" : a.color,
        ...(armed ? { background: a.color } : null),
        ...trayVars(a.color),
      }}
    >
      <span className="cadence-hold-fill" aria-hidden="true" />
      <span style={S.trayName}>{a.name}</span>
      <span style={{ ...S.trayMins, color: armed ? "#fff" : a.color }}>{fmtDur(a.mins, lang)}</span>
    </div>
  );
}
