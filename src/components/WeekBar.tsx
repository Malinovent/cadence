import type { WeekIndex } from "../lib/actions";
import type { Season } from "../lib/balancedWeeks";
import { S } from "../styles";
import { useI18n } from "../i18n/I18nProvider";
import BalancedWeeksCard from "./BalancedWeeksCard";

type Props = {
  week: WeekIndex;
  setWeek: (w: WeekIndex) => void;
  season: Season;
  footnote: string;
  /** desktop with the panel hidden: a way back to it */
  onShowPanel: (() => void) | null;
};

/** S1.4: above the grid, the week switch and the balanced-weeks count. */
export default function WeekBar({ week, setWeek, season, footnote, onShowPanel }: Props) {
  const { m } = useI18n();
  return (
    <div style={S.weekBar}>
      <div style={S.weekBarLeft}>
        {onShowPanel && (
          <button type="button" onClick={onShowPanel} style={S.showPanelBtn} aria-expanded={false}>
            {m.week.showPanel}
          </button>
        )}
        <div style={S.weekToggle}>
          {m.week.names.map((w, i) => (
            <button
              key={w}
              onClick={() => setWeek(i as WeekIndex)}
              aria-pressed={week === i}
              style={{ ...S.weekBtn, ...(week === i ? S.weekBtnActive : {}) }}
            >
              {w}
            </button>
          ))}
        </div>
      </div>
      <div style={S.weekBarCard}>
        <BalancedWeeksCard season={season} footnote={footnote} compact />
      </div>
    </div>
  );
}
