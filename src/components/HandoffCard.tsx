import { useI18n } from "../i18n/I18nProvider";
import { importSummaryLine } from "../lib/format";
import type { ImportSummary } from "../lib/transfer";
import { S } from "../styles";

/**
 * The new address (JP, 2026-11-18): weeks arriving from the old one. Nothing changes until the
 * person says so; above the sign-in and intro pages, since a new address shows those first.
 */
export default function HandoffCard({
  summary,
  failed,
  phone,
  onBring,
  onNotNow,
}: {
  /** what's arriving; null when it couldn't be read */
  summary: ImportSummary | null;
  failed: boolean;
  phone: boolean;
  onBring: () => void;
  onNotNow: () => void;
}) {
  const { m } = useI18n();
  return (
    <div style={{ ...S.onboardBackdrop, zIndex: 70 }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="handoff-title"
        style={{ ...S.onboardCard, ...(phone ? S.onboardCardPhone : {}) }}
      >
        <h2 id="handoff-title" style={S.onboardTitle}>
          {m.handoff.title}
        </h2>
        {failed || !summary ? (
          <>
            <p style={S.onboardLead}>{m.handoff.failed}</p>
            <div style={S.onboardActions}>
              <button type="button" style={S.onboardPrimary} onClick={onNotNow}>
                {m.handoff.ok}
              </button>
            </div>
          </>
        ) : (
          <>
            <p style={S.onboardLead}>{importSummaryLine(summary, m.lib)}</p>
            <p style={S.introPromise}>{m.handoff.replaces}</p>
            <div style={S.onboardActions}>
              <button type="button" style={S.onboardQuiet} onClick={onNotNow}>
                {m.handoff.notNow}
              </button>
              <button type="button" style={S.onboardPrimary} onClick={onBring} autoFocus>
                {m.handoff.bring}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
