/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL, e.g. https://abcd1234.supabase.co. Missing → local-only app. */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase public anon / publishable key (public by design; RLS protects data). Missing → local-only app. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** The pre-sale site's address, for the legal links in Settings. Missing → no links. */
  readonly VITE_SITE_URL?: string;
  /** Where "Write to us" sends (Settings → About, the crash screen). Missing → no mail link. */
  readonly VITE_SUPPORT_EMAIL?: string;
  /** Google / Apple sign-in once set up in Supabase: "google,apple" */
  readonly VITE_AUTH_PROVIDERS?: string;
  /** the old address's build only: where Rebalance lives now (src/lib/handoff.ts) */
  readonly VITE_MOVED_TO?: string;
  /** the old addresses the new one accepts weeks from; default https://malinovent.github.io */
  readonly VITE_HANDOFF_FROM?: string;
  /** where the app is served: /cadence/ (default) or /app/ (vite.config.ts) */
  readonly VITE_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
