import { useEffect, useRef } from "react";
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
};

const FOCUSABLE = "button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex='-1'])";

/**
 * Sign-in first (JP, 2026-11-17): what the app opens on when nobody is signed in, until this
 * device continues without an account. Same full-screen card as the intro page.
 */
export default function SignInPage({ phone, providers, recovery, onSkip, ...actions }: Props) {
  const { m } = useI18n();
  const ref = useRef<HTMLDivElement>(null);

  // Tab stays inside; the page behind doesn't scroll
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
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
        aria-labelledby="signin-title"
        style={{ ...S.onboardCard, ...(phone ? S.onboardCardPhone : {}) }}
      >
        <h2 id="signin-title" style={S.onboardTitle}>
          {APP_NAME}
        </h2>
        <p style={S.onboardLead}>{m.signInPage.line}</p>

        <SignInForm providers={providers} recovery={recovery} autoFocus={!phone} {...actions} />

        {!recovery && (
          <div style={{ marginTop: 18 }}>
            <button type="button" style={{ ...S.onboardQuiet, alignSelf: "flex-start" }} onClick={onSkip}>
              {m.signInPage.skip}
            </button>
            <p style={{ ...S.introPromise, marginTop: 4 }}>{m.signInPage.skipNote}</p>
          </div>
        )}
      </div>
    </div>
  );
}
