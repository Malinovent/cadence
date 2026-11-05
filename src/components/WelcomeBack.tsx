import type { Template } from "../lib/model";
import { replaceNote } from "../lib/welcome";
import { S } from "../styles";

type Props = {
  templates: Template[];
  blocksInWeek1: number;
  onUse: (templateId: string) => void;
  onNotNow: () => void;
};

/** S1.7: "Welcome back. Start this week fresh from a template?" One tap builds the week. */
export default function WelcomeBack({ templates, blocksInWeek1, onUse, onNotNow }: Props) {
  const note = replaceNote(blocksInWeek1);
  return (
    <div style={S.welcomeCard} role="region" aria-label="Welcome back">
      <div style={S.welcomeText}>
        <strong style={S.welcomeTitle}>Welcome back.</strong> Start this week fresh from a template?
        {note && <span style={S.welcomeNote}>{note}</span>}
      </div>
      <div style={S.welcomeActions}>
        {templates.map((t) => (
          <button key={t.id} type="button" onClick={() => onUse(t.id)} style={S.welcomeUse}>
            {templates.length === 1 ? `Use “${t.name}”` : t.name}
          </button>
        ))}
        <button type="button" onClick={onNotNow} style={S.textBtn}>
          Not now
        </button>
      </div>
    </div>
  );
}
