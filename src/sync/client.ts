import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

// null when either env var is missing: the app then runs local-only and hides account UI.
export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          persistSession: true, // localStorage, keys prefixed "sb-"
          autoRefreshToken: true,
          detectSessionInUrl: true, // magic link opened in the same browser
          // implicit (not PKCE) so a link opened in a different browser than the one that asked still works
          flowType: "implicit",
        },
      })
    : null;
