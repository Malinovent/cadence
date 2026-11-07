/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL, e.g. https://abcd1234.supabase.co. Missing → local-only app. */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase public anon / publishable key (public by design; RLS protects data). Missing → local-only app. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** The pre-sale site's address, for the legal links in Settings. Missing → no links. */
  readonly VITE_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
