import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { downloadText } from "../lib/download";
import { handoffUrl, nextSendState, readHandoff, READY_TIMEOUT_MS, type SendState } from "../lib/handoff";
import type { CadenceData } from "../lib/model";
import { buildExport, exportFilename } from "../lib/transfer";
import { S } from "../styles";

/**
 * The old address only (JP, 2026-11-18): Rebalance lives at rebalanceweek.com now. One tap opens
 * it and hands over this device's weeks (src/lib/handoff.ts); the new tab asks before replacing
 * anything. If the new tab can't answer (blocked, or an installed app opening Safari), the file
 * is the way: download here, import there. The weeks stay here either way.
 */
export default function MovedCard({ to, data }: { to: URL; data: CadenceData }) {
  const { m } = useI18n();
  const [state, setState] = useState<SendState>("idle");
  const stateRef = useRef(state);
  stateRef.current = state;
  const dataRef = useRef(data);
  dataRef.current = data;
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== to.origin) return; // only the new address
      const msg = readHandoff(e.data);
      if (!msg) return;
      if (msg.type === "rebalance:ready" && stateRef.current === "opening") {
        if (timer.current !== null) window.clearTimeout(timer.current);
        const text = JSON.stringify(buildExport(dataRef.current));
        (e.source as Window | null)?.postMessage({ type: "rebalance:handoff", text }, to.origin);
        setState("sent");
        return;
      }
      setState((s) => nextSendState(s, msg));
    };
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [to]);

  const bring = () => {
    const w = window.open(handoffUrl(to), "_blank");
    if (!w) {
      setState("failed");
      return;
    }
    setState("opening");
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (stateRef.current === "opening") setState("failed");
    }, READY_TIMEOUT_MS);
  };
  const download = () => downloadText(JSON.stringify(buildExport(data), null, 2), exportFilename(new Date()));

  const line =
    state === "opening"
      ? m.moved.opening
      : state === "sent"
        ? m.moved.sent
        : state === "done"
          ? m.moved.done
          : state === "declined"
            ? m.moved.declined
            : state === "failed"
              ? m.moved.failed
              : m.moved.body;

  return (
    <section
      style={{ ...S.conflictBanner, flexDirection: "column", alignItems: "stretch" }}
      aria-labelledby="moved-title"
    >
      <strong id="moved-title" style={{ fontSize: 15 }}>
        {m.moved.title(to.host)}
      </strong>
      <span role="status" style={{ fontSize: 14 }}>
        {line}
      </span>
      <span style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        {state !== "done" && (
          <button type="button" style={S.resetConfirm} onClick={bring} disabled={state === "opening"}>
            {m.moved.bring}
          </button>
        )}
        {state === "done" ? (
          <a href={to.href} style={{ ...S.textLink, fontSize: 14 }}>
            {m.moved.open(to.host)}
          </a>
        ) : (
          <button type="button" style={{ ...S.textLink, fontSize: 14 }} onClick={download}>
            {m.moved.download}
          </button>
        )}
      </span>
    </section>
  );
}
