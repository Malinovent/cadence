import { useEffect, useState } from "react";
import { cachedEarlyBird, entitlementEmail, parseEarlyBird } from "../lib/earlyBird";
import { supabase } from "./client";

// S1.11: is the signed-in email an early bird? Remembered per device for that email
// (`cadence:ui:earlyBird` = the email), refreshed from `entitlements` on each sign-in.
const KEY = "cadence:ui:earlyBird";

const readCache = (): string | null => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};
const writeCache = (email: string | null) => {
  try {
    if (email) localStorage.setItem(KEY, email);
    else localStorage.removeItem(KEY);
  } catch {
    // storage unavailable: the badge waits for the server next time
  }
};

export function useEarlyBird(email: string | null): boolean {
  const [fresh, setFresh] = useState<{ email: string; early: boolean } | null>(null);

  useEffect(() => {
    if (!supabase || !email) return;
    let live = true;
    const key = entitlementEmail(email);
    supabase
      .from("entitlements")
      .select("early_bird")
      .eq("email", key)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!live || error) return; // offline or no table yet: keep what we knew
        const early = parseEarlyBird(data);
        writeCache(early ? key : null);
        setFresh({ email: key, early });
      });
    return () => {
      live = false;
    };
  }, [email]);

  if (!email) return false;
  if (fresh && fresh.email === entitlementEmail(email)) return fresh.early;
  return cachedEarlyBird(readCache(), email);
}
