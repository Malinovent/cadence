// Audit item 6: links from the app to the site's legal pages (cadence-site), in the person's
// language. The site's address is VITE_SITE_URL; until the domain exists there are no links.
import type { Lang } from "./words";

const PATHS: Record<Lang, { privacy: string; terms: string }> = {
  fr: { privacy: "/fr/confidentialite/", terms: "/fr/conditions/" },
  en: { privacy: "/en/privacy/", terms: "/en/terms/" },
};

/** Absolute links, or null when the site's address isn't set. Only http(s) addresses count. */
export function legalLinks(siteUrl: string | undefined, lang: Lang): { privacy: string; terms: string } | null {
  const base = siteUrl?.trim().replace(/\/+$/, "");
  if (!base || !/^https?:\/\//.test(base)) return null;
  return { privacy: base + PATHS[lang].privacy, terms: base + PATHS[lang].terms };
}
