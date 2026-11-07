import { useEffect, useRef } from "react";
import { useI18n } from "../i18n/I18nProvider";
import type { Lang } from "../i18n/lang";
import { S } from "../styles";

type Props = {
  phone: boolean;
  canSignIn: boolean; // sync is set up and nobody is signed in
  onStart: () => void; // "Show me how": the guided first block
  onSkip: () => void; // "Skip", Escape: the checklist stays for later
  onSignIn: () => void; // "Already use it on another device?"
};

const LANGS: Lang[] = ["fr", "en"];
const FOCUSABLE = "button:not([disabled]), a[href], input, [tabindex]:not([tabindex='-1'])";

// the example week: [area colour, block heights in px] per day, Mon..Sun
const WORK = "#3C6FE8";
const REST = "#9B4DCA";
const PEOPLE = "#0CA678";
const CHORES = "#C9A227";
const WEEK: [string, number][][] = [
  [
    [WORK, 34],
    [REST, 12],
  ],
  [
    [WORK, 34],
    [CHORES, 9],
    [REST, 12],
  ],
  [
    [WORK, 34],
    [PEOPLE, 14],
  ],
  [
    [WORK, 34],
    [REST, 12],
  ],
  [
    [WORK, 26],
    [PEOPLE, 16],
  ],
  [
    [CHORES, 12],
    [PEOPLE, 14],
    [REST, 22],
  ],
  [
    [PEOPLE, 18],
    [REST, 18],
  ],
];
const EXAMPLE_COLORS = [REST, PEOPLE, WORK];

/**
 * Onboarding, first screen (JP, 2026-11-07): the purpose, with an example of a balanced week.
 * Then the app teaches one thing at a time in the real calendar. New people only; skippable.
 */
export default function PurposePage({ phone, canSignIn, onStart, onSkip, onSignIn }: Props) {
  const { m, lang, setChoice } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const skipRef = useRef(onSkip);
  useEffect(() => {
    skipRef.current = onSkip;
  });

  // starts on "Show me how"; Escape skips; Tab stays inside; the page behind doesn't scroll
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("[data-intro-primary]")?.focus({ preventScroll: true });
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

  return (
    <div style={S.onboardBackdrop}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="intro-title"
        style={{ ...S.onboardCard, ...(phone ? S.onboardCardPhone : {}) }}
      >
        <div style={S.onboardTop}>
          <span style={{ flex: 1 }} />
          <span style={S.onboardLang} role="group" aria-label={m.intro.language}>
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

        <h2 id="intro-title" style={S.onboardTitle}>
          {m.intro.title}
        </h2>
        <p style={S.onboardLead}>{m.intro.lead}</p>

        {/* an example of what a balanced week looks like */}
        <figure style={S.introFigure} aria-label={m.intro.exampleLabel}>
          <div style={S.introWeek} aria-hidden="true">
            {WEEK.map((day, i) => (
              <div key={i} style={S.introDay}>
                <span style={S.introDayName}>{m.lib.days[i]}</span>
                {day.map(([color, height], j) => (
                  <span
                    key={j}
                    style={{
                      ...S.introBlock,
                      height,
                      borderColor: color,
                      background: `${color}33`,
                      ...(j === day.length - 1 ? { marginTop: "auto" } : {}),
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
          <figcaption style={S.introChips}>
            {m.intro.example.map((t, i) => (
              <span key={t} style={S.introChip}>
                <span
                  style={{ ...S.dot, ...S.taskDot, marginRight: 0, background: EXAMPLE_COLORS[i] }}
                  aria-hidden="true"
                />
                <span>{t}</span>
                <span aria-hidden="true">✓</span>
              </span>
            ))}
          </figcaption>
        </figure>

        <p style={S.introPromise}>{m.intro.promise}</p>
        {canSignIn && (
          <button type="button" style={{ ...S.onboardQuiet, alignSelf: "flex-start" }} onClick={onSignIn}>
            {m.intro.signIn}
          </button>
        )}

        <div style={S.onboardActions}>
          <button type="button" style={S.onboardQuiet} onClick={onSkip}>
            {m.intro.skip}
          </button>
          <button type="button" data-intro-primary="" style={S.onboardPrimary} onClick={onStart}>
            {m.intro.start}
          </button>
        </div>
      </div>
    </div>
  );
}
