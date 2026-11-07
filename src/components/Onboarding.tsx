import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n/I18nProvider";
import type { Lang } from "../i18n/lang";
import { limitLabel } from "../lib/guardrail";
import type { Category } from "../lib/model";
import { ONBOARD_STEPS } from "../lib/onboarding";
import { addedNote, areaName, missingAreas, STARTERS, starterPreview, starterText } from "../lib/starters";
import { replaceNote } from "../lib/welcome";
import { S } from "../styles";

type Props = {
  phone: boolean;
  cats: Category[];
  blocksInWeek1: number;
  canSignIn: boolean; // sync is set up and nobody is signed in
  onStart: (starterId: string | null) => void; // step 2's choice (null = an empty week)
  onDone: () => void; // "Start planning"
  onSkip: () => void; // "Skip", Escape
  onSignIn: () => void; // "Already use it on another device?"
};

const LANGS: Lang[] = ["fr", "en"];
const FOCUSABLE = "button:not([disabled]), a[href], input, [tabindex]:not([tabindex='-1'])";

/**
 * Onboarding (JP, 2026-11-07): three short screens for new people, each one skippable.
 * 1) what the app is, 2) a starter week or an empty week, 3) how it works.
 * Calm: no timers, nothing moves until the person picks, motion off under reduced motion.
 */
export default function Onboarding({
  phone,
  cats,
  blocksInWeek1,
  canSignIn,
  onStart,
  onDone,
  onSkip,
  onSignIn,
}: Props) {
  const { m, lang, setChoice } = useI18n();
  const [step, setStep] = useState(0);
  const [pick, setPick] = useState<string | null>(null); // null = the empty week
  const ref = useRef<HTMLDivElement>(null);
  const skipRef = useRef(onSkip);
  useEffect(() => {
    skipRef.current = onSkip;
  });

  // each step opens at its top (a phone scrolls the card) with focus on its main button, so Enter moves on
  useEffect(() => {
    if (!ref.current) return;
    ref.current.scrollTop = 0;
    ref.current.querySelector<HTMLElement>("[data-onboard-primary]")?.focus({ preventScroll: true });
  }, [step]);

  // Escape skips; Tab stays inside; the page behind doesn't scroll
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        skipRef.current();
        return;
      }
      if (e.key !== "Tab" || !ref.current) return;
      const els = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, []);

  const picked = STARTERS.find((st) => st.id === pick) ?? null;
  const pickedName = picked ? starterText(picked, m.lib).name : null;
  const notes = picked
    ? [
        addedNote(
          missingAreas(cats, picked).map((a) => areaName(a, m.lib)),
          m.lib,
        ),
        replaceNote(blocksInWeek1, m.lib),
      ]
    : [];

  const title = (text: string) => (
    <h2 id="onboard-title" style={S.onboardTitle}>
      {text}
    </h2>
  );

  return (
    <div style={S.onboardBackdrop}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboard-title"
        style={{ ...S.onboardCard, ...(phone ? S.onboardCardPhone : {}) }}
      >
        <div style={S.onboardTop}>
          <span style={S.onboardStep}>{m.onboard.step(step + 1, ONBOARD_STEPS)}</span>
          <span style={S.onboardDots} aria-hidden="true">
            {Array.from({ length: ONBOARD_STEPS }, (_, i) => (
              <span key={i} style={{ ...S.onboardDot, ...(i <= step ? S.onboardDotOn : {}) }} />
            ))}
          </span>
          <span style={S.onboardLang} role="group" aria-label={m.onboard.language}>
            {LANGS.map((l) => (
              <button
                key={l}
                type="button"
                lang={l}
                aria-pressed={lang === l}
                aria-label={m.settings.langNames[l]}
                onClick={() => setChoice(l)}
                style={{ ...S.onboardLangBtn, ...(lang === l ? S.onboardLangOn : {}) }}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </span>
        </div>

        {step === 0 && (
          <>
            {title(m.onboard.welcomeTitle)}
            <p style={S.onboardLead}>{m.onboard.welcomeLead}</p>
            <ul style={S.onboardList}>
              {m.onboard.welcomePoints.map((p) => (
                <li key={p} style={S.onboardItem}>
                  <span style={S.onboardBullet} aria-hidden="true" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            {canSignIn && (
              <button type="button" style={{ ...S.onboardQuiet, alignSelf: "flex-start" }} onClick={onSignIn}>
                {m.onboard.signIn}
              </button>
            )}
          </>
        )}

        {step === 1 && (
          <>
            {title(m.onboard.startTitle)}
            <p style={S.onboardLead}>{m.onboard.startLead}</p>
            <div style={S.onboardCards} role="radiogroup" aria-labelledby="onboard-title">
              {STARTERS.map((st) => {
                const text = starterText(st, m.lib);
                const rows = starterPreview(st, cats, lang);
                const on = pick === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setPick(st.id)}
                    style={{ ...S.onboardOption, ...(on ? S.onboardOptionOn : {}) }}
                  >
                    <span style={S.onboardOptionName}>{text.name}</span>
                    <span style={S.onboardOptionBlurb}>{text.blurb}</span>
                    {/* how the week's time splits between its areas */}
                    <span style={S.onboardMix} aria-hidden="true">
                      {rows.map((r) => (
                        <span key={r.key} style={{ flex: r.mins, background: r.color }} />
                      ))}
                    </span>
                    <span style={S.onboardLimits}>
                      {rows
                        .filter((r) => r.key !== "exercise")
                        .map((r) => (
                          <span key={r.key}>
                            <span style={{ ...S.dot, ...S.taskDot, background: r.color }} aria-hidden="true" />
                            {r.name} · {limitLabel(r.limit, m.lib)}
                          </span>
                        ))}
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                role="radio"
                aria-checked={pick === null}
                onClick={() => setPick(null)}
                style={{ ...S.onboardOption, ...(pick === null ? S.onboardOptionOn : {}) }}
              >
                <span style={S.onboardOptionName}>{m.onboard.emptyName}</span>
                <span style={S.onboardOptionBlurb}>{m.onboard.emptyBlurb}</span>
              </button>
            </div>
            {notes
              .filter((n): n is string => !!n)
              .map((n) => (
                <span key={n} style={S.onboardNote}>
                  {n}
                </span>
              ))}
          </>
        )}

        {step === 2 && (
          <>
            {title(m.onboard.tipsTitle)}
            <ol style={S.onboardList}>
              {[
                m.onboard.tips.place[phone ? "phone" : "desktop"],
                m.onboard.tips.tick,
                m.onboard.tips.tasks[phone ? "phone" : "desktop"],
              ].map((t, i) => (
                <li key={t} style={S.onboardItem}>
                  <span style={S.onboardNum} aria-hidden="true">
                    {i + 1}
                  </span>
                  <span>{t}</span>
                </li>
              ))}
            </ol>
          </>
        )}

        <div style={S.onboardActions}>
          {step > 0 && (
            <button type="button" style={S.onboardQuiet} onClick={() => setStep(step - 1)}>
              {m.onboard.back}
            </button>
          )}
          {step < ONBOARD_STEPS - 1 && (
            <button type="button" style={S.onboardQuiet} onClick={onSkip}>
              {m.onboard.skip}
            </button>
          )}
          {step === 0 && (
            <button type="button" data-onboard-primary="" style={S.onboardPrimary} onClick={() => setStep(1)}>
              {m.onboard.next}
            </button>
          )}
          {step === 1 && (
            <button
              type="button"
              data-onboard-primary=""
              style={S.onboardPrimary}
              onClick={() => {
                onStart(pick);
                setStep(2);
              }}
            >
              {pickedName ? m.onboard.useStarter(pickedName) : m.onboard.startEmpty}
            </button>
          )}
          {step === 2 && (
            <button type="button" data-onboard-primary="" style={S.onboardPrimary} onClick={onDone}>
              {m.onboard.finish}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
