// Audit item 6: links from the app to the site's legal pages (rebalance-site), in the person's
// language. The site's address is VITE_SITE_URL; until the domain exists there are no links.
import type { Lang } from "./words";

const PATHS: Record<Lang, { privacy: string; terms: string }> = {
  fr: { privacy: "/fr/confidentialite/", terms: "/fr/conditions/" },
  en: { privacy: "/en/privacy/", terms: "/en/terms/" },
};

/** The site's address without a trailing slash, when it's a real http(s) one. */
const siteBase = (siteUrl: string | undefined): string | null => {
  const base = siteUrl?.trim().replace(/\/+$/, "");
  return base && /^https?:\/\//.test(base) ? base : null;
};

/**
 * Help and feedback (JP, 2026-11-07): the site's questions and answers, and a message to the support
 * address (VITE_SUPPORT_EMAIL). Each is null until it's set, so nothing points nowhere.
 */
export function helpLinks(
  siteUrl: string | undefined,
  email: string | undefined,
  lang: Lang,
  subject: string,
): { faq: string | null; mail: string | null } {
  const base = siteBase(siteUrl);
  const addr = email?.trim();
  return {
    faq: base ? `${base}/${lang}/#faq` : null,
    mail:
      addr && /^[^\s@?&]+@[^\s@?&]+\.[^\s@?&]+$/.test(addr)
        ? `mailto:${addr}?subject=${encodeURIComponent(subject)}`
        : null,
  };
}

/** Absolute links, or null when the site's address isn't set. Only http(s) addresses count. */
export function legalLinks(siteUrl: string | undefined, lang: Lang): { privacy: string; terms: string } | null {
  const base = siteBase(siteUrl);
  if (!base) return null;
  return { privacy: base + PATHS[lang].privacy, terms: base + PATHS[lang].terms };
}
