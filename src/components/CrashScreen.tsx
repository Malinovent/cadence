import { APP_NAME } from "../appName";
import { MESSAGES, startLang, type Lang } from "../i18n/lang";
import { crashBackup } from "../lib/crash";
import { downloadText } from "../lib/download";
import { helpLinks } from "../lib/legal";
import { exportFilename } from "../lib/transfer";
import { FONT_IMPORT, S } from "../styles";

const lang = (): Lang => {
  try {
    return startLang();
  } catch {
    return "fr"; // French first
  }
};

/**
 * Instead of a blank page when something breaks (JP, 2026-11-07). It stands on its own: no app
 * state, the language read straight from the device. The weeks are untouched in storage; "Download
 * my data" saves them exactly as stored, and Settings → Your data can import that file.
 */
export default function CrashScreen({ error }: { error: unknown }) {
  const l = lang();
  const m = MESSAGES[l];
  const help = helpLinks(
    import.meta.env.VITE_SITE_URL,
    import.meta.env.VITE_SUPPORT_EMAIL,
    l,
    m.settings.helpSubject(APP_NAME),
  );
  const download = () => {
    let text = "{}";
    try {
      text = crashBackup((k) => window.localStorage.getItem(k));
    } catch {
      // storage itself is unreachable: an empty file says so
    }
    downloadText(text, exportFilename());
  };
  const what = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return (
    <div style={{ ...S.root, ...S.crashPage }} lang={l === "fr" ? "fr-CA" : "en-CA"}>
      <style>{FONT_IMPORT}</style>
      <main role="alert" style={S.onboardCard}>
        <h1 style={S.onboardTitle}>{m.crash.title}</h1>
        <p style={S.onboardLead}>{m.crash.body}</p>
        <div style={S.crashActions}>
          <button type="button" style={{ ...S.onboardPrimary, marginLeft: 0 }} onClick={() => window.location.reload()}>
            {m.crash.reload}
          </button>
          <button type="button" style={{ ...S.catAdd, marginTop: 0 }} onClick={download}>
            {m.crash.download}
          </button>
          {help.mail && (
            <a href={help.mail} style={S.aboutLink}>
              {m.crash.help}
            </a>
          )}
        </div>
        <details style={S.crashDetails}>
          <summary>{m.crash.details}</summary>
          <pre style={S.crashError}>{what}</pre>
        </details>
      </main>
    </div>
  );
}
