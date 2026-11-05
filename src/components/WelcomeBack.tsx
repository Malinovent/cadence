import type { Template } from "../lib/model";
import { STARTERS, starterText } from "../lib/starters";
import { replaceNote } from "../lib/welcome";
import { S } from "../styles";
import { useI18n } from "../i18n/I18nProvider";

type Props = {
  templates: Template[];
  blocksInWeek1: number;
  onUse: (templateId: string) => void;
  onStarter: (starterId: string) => void;
  onNotNow: () => void;
};

/** S1.7: "Welcome back. Start this week fresh from a template?" One tap builds the week. */
export default function WelcomeBack({ templates, blocksInWeek1, onUse, onStarter, onNotNow }: Props) {
  const { m } = useI18n();
  const note = replaceNote(blocksInWeek1, m.lib);
  return (
    <div style={S.welcomeCard} role="region" aria-label={m.welcome.region}>
      <div style={S.welcomeText}>
        <strong style={S.welcomeTitle}>{m.welcome.title}</strong> {m.welcome.question}
        {note && <span style={S.welcomeNote}>{note}</span>}
      </div>
      <div style={S.welcomeActions}>
        {templates.map((t) => (
          <button key={t.id} type="button" onClick={() => onUse(t.id)} style={S.welcomeUse}>
            {templates.length === 1 ? m.welcome.use(t.name) : t.name}
          </button>
        ))}
        {/* S1.8: the starter weeks too, so everyone has something to start from */}
        <span style={S.welcomeStarters}>
          {templates.length > 0 ? m.welcome.orStarter : m.welcome.starters}
          {STARTERS.map((st) => (
            <button key={st.id} type="button" onClick={() => onStarter(st.id)} style={S.welcomeStarter}>
              {starterText(st, m.lib).name}
            </button>
          ))}
        </span>
        <button type="button" onClick={onNotNow} style={S.textBtn}>
          {m.welcome.notNow}
        </button>
      </div>
    </div>
  );
}
