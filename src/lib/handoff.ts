// Moving to rebalanceweek.com (JP, 2026-11-18). A browser keeps each address's weeks apart, so the
// old address hands them to the new one, in one tap, without putting them in a link:
//
//   old (malinovent.github.io/cadence/)            new (rebalanceweek.com/app/)
//   "Bring my weeks there" → opens <new>#handoff
//                                                   ← "ready", to the old address only
//   the backup (the export file's text) →
//                                                   asks first; then ← "received" (or "declined")
//
// Each side talks only to the other's exact origin. What arrives goes through parseImport (and so
// normalizeData), like a file import. The old address keeps its copy. Pure: no DOM here.

export const HANDOFF_HASH = "#handoff";
const OLD_ADDRESS_ORIGINS = ["https://malinovent.github.io"];

export type HandoffMessage =
  | { type: "rebalance:ready" }
  | { type: "rebalance:handoff"; text: string }
  | { type: "rebalance:received" }
  | { type: "rebalance:declined" };

const okUrl = (u: URL) => u.protocol === "https:" || (u.protocol === "http:" && u.hostname === "localhost");

/** The new address (VITE_MOVED_TO), only on the old address's build; null everywhere else. */
export function movedTo(v: string | undefined): URL | null {
  const s = v?.trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    return okUrl(u) ? u : null;
  } catch {
    return null;
  }
}

/** Where "Bring my weeks there" opens: the new address, marked as a hand-off. */
export const handoffUrl = (to: URL): string => {
  const u = new URL(to.href);
  u.hash = HANDOFF_HASH;
  return u.href;
};

/** The old addresses the new one accepts weeks from (VITE_HANDOFF_FROM overrides, e.g. for a local test). */
export function handoffOrigins(v: string | undefined): string[] {
  const list = (v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const origins: string[] = [];
  for (const s of list.length > 0 ? list : OLD_ADDRESS_ORIGINS) {
    try {
      const u = new URL(s);
      if (okUrl(u)) origins.push(u.origin);
    } catch {
      // not an address: skipped
    }
  }
  return origins;
}

/** The message, if it's one of ours and well formed. */
export function readHandoff(data: unknown): HandoffMessage | null {
  if (typeof data !== "object" || data === null) return null;
  const d = data as { type?: unknown; text?: unknown };
  switch (d.type) {
    case "rebalance:ready":
    case "rebalance:received":
    case "rebalance:declined":
      return { type: d.type };
    case "rebalance:handoff":
      return typeof d.text === "string" && d.text.length <= 5_000_000 ? { type: d.type, text: d.text } : null;
    default:
      return null;
  }
}

/** What the old address shows while it hands the weeks over. */
export type SendState = "idle" | "opening" | "sent" | "done" | "declined" | "failed";

/** The old address's next state for a message from the new one (unchanged for anything else). */
export function nextSendState(state: SendState, msg: HandoffMessage | null): SendState {
  if (!msg) return state;
  if (msg.type === "rebalance:received" && state === "sent") return "done";
  if (msg.type === "rebalance:declined" && state === "sent") return "declined";
  return state;
}

/** How long the old address waits for the new tab to say it's ready before offering the file. */
export const READY_TIMEOUT_MS = 20_000;
