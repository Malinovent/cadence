import { useEffect, useState } from "react";
import { HANDOFF_HASH, handoffOrigins, readHandoff } from "../lib/handoff";
import { parseImport, type ImportResult } from "../lib/transfer";

// the old addresses this build accepts weeks from (src/lib/handoff.ts)
const FROM = handoffOrigins(import.meta.env.VITE_HANDOFF_FROM);

type Arrival = { result: ImportResult; source: Window; origin: string };

/**
 * The new address's side of the move (JP, 2026-11-18): opened as `#handoff` by the old address,
 * it says it's ready, takes the weeks the old address sends, and holds them until the person
 * answers. Nothing is stored here: the app replaces its data only on "Bring them here".
 */
export function useHandoffReceive() {
  // read once: the hash is cleared right away, and StrictMode runs the effect twice in dev
  const [arriving] = useState(() => location.hash === HANDOFF_HASH && !!window.opener);
  const [arrival, setArrival] = useState<Arrival | null>(null);

  useEffect(() => {
    if (location.hash === HANDOFF_HASH) history.replaceState(null, "", location.pathname + location.search);
    if (!arriving) return;
    const opener = window.opener as Window | null;
    if (!opener) return;
    let got = false;
    const onMessage = (e: MessageEvent) => {
      if (got || e.source !== opener || !FROM.includes(e.origin)) return;
      const msg = readHandoff(e.data);
      if (msg?.type !== "rebalance:handoff") return;
      got = true;
      setArrival({ result: parseImport(msg.text), source: opener, origin: e.origin });
    };
    window.addEventListener("message", onMessage);
    // only the old address's exact origin can read this; it carries nothing anyway
    for (const origin of FROM) {
      try {
        opener.postMessage({ type: "rebalance:ready" }, origin);
      } catch {
        // the opener went away
      }
    }
    return () => window.removeEventListener("message", onMessage);
  }, [arriving]);

  const answer = (type: "rebalance:received" | "rebalance:declined") => {
    if (!arrival) return;
    try {
      arrival.source.postMessage({ type }, arrival.origin);
    } catch {
      // the old tab was closed: nothing to tell
    }
    setArrival(null);
  };

  return {
    arrival,
    /** after the weeks are in: tell the old address it worked */
    received: () => answer("rebalance:received"),
    /** "Not now", or nothing usable arrived */
    declined: () => answer("rebalance:declined"),
  };
}
