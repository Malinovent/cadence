import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Messages } from "./en";
import {
  deviceLangs,
  LOCALE,
  MESSAGES,
  readLangChoice,
  resolveLang,
  writeLangChoice,
  type Lang,
  type LangChoice,
} from "./lang";

export type I18n = {
  lang: Lang;
  locale: string; // "fr-CA" | "en-CA", for dates
  m: Messages;
  choice: LangChoice;
  setChoice: (c: LangChoice) => void;
};

const Ctx = createContext<I18n | null>(null);

/** S1.9: the chosen language for the whole app; keeps <html lang> in step. */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [choice, setChoiceState] = useState<LangChoice>(readLangChoice);
  const [device, setDevice] = useState(deviceLangs);
  useEffect(() => {
    const onChange = () => setDevice(deviceLangs());
    window.addEventListener("languagechange", onChange);
    return () => window.removeEventListener("languagechange", onChange);
  }, []);
  const lang = resolveLang(choice, device);
  useEffect(() => {
    document.documentElement.lang = LOCALE[lang];
    document.title = MESSAGES[lang].docTitle;
  }, [lang]);
  const value = useMemo<I18n>(
    () => ({
      lang,
      locale: LOCALE[lang],
      m: MESSAGES[lang],
      choice,
      setChoice: (c) => {
        writeLangChoice(c);
        setChoiceState(c);
      },
    }),
    [lang, choice],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const v = useContext(Ctx);
  if (!v) throw new Error("useI18n outside I18nProvider");
  return v;
}
