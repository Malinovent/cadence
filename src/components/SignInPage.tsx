import { APP_NAME } from "../appName";
import { useI18n } from "../i18n/I18nProvider";
import { S } from "../styles";
import SignInForm, { type SignInActions } from "./SignInForm";
import type { OAuthProvider } from "../sync/engine";

type Props = SignInActions & {
  phone: boolean;
  providers: OAuthProvider[];
  /** arrived from a reset link: choose a new password */
  recovery: boolean;
  /** "Continue without an account": the app on this device, sign-in stays in Settings */
  onSkip: () => void;
  /** opened from Settings → Sync: back to Settings instead of "Continue without an account" */
  onBack?: () => void;
};

/**
 * Sign-in first (JP, 2026-11-17), as a page of its own (JP, 2026-11-18: "it should instead be a
 * proper page, not a popup"): what the app opens on when nobody is signed in, until this device
 * continues without an account, and where Settings → Sync → Sign in leads. The app isn't drawn
 * behind it; signing in (or continuing) opens the app.
 */
export default function SignInPage({ phone, providers, recovery, onSkip, onBack, ...actions }: Props) {
  const { m } = useI18n();
  return (
    <>
      <header style={{ ...S.header, ...(phone ? S.headerPhone : {}) }}>
        <div>
          <h1 style={{ ...S.logo, ...(phone ? S.logoPhone : {}) }}>{APP_NAME}</h1>
          {!phone && <p style={S.tagline}>{m.header.tagline}</p>}
        </div>
      </header>
      <main aria-labelledby="signin-title" style={S.signInMain}>
        <h2 id="signin-title" style={S.onboardTitle}>
          {m.signInPage.line}
        </h2>

        <SignInForm providers={providers} recovery={recovery} autoFocus={!phone} {...actions} />

        {!recovery &&
          (onBack ? (
            <div style={S.signInFoot}>
              <button type="button" style={{ ...S.onboardQuiet, alignSelf: "flex-start" }} onClick={onBack}>
                {m.signInPage.back}
              </button>
            </div>
          ) : (
            <div style={S.signInFoot}>
              <button type="button" style={{ ...S.onboardQuiet, alignSelf: "flex-start" }} onClick={onSkip}>
                {m.signInPage.skip}
              </button>
              <p style={{ ...S.introPromise, marginTop: 4 }}>{m.signInPage.skipNote}</p>
            </div>
          ))}
      </main>
    </>
  );
}
