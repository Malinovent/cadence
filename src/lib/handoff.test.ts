import { describe, expect, it } from "vitest";
import { handoffOrigins, handoffUrl, movedTo, nextSendState, readHandoff } from "./handoff";

describe("movedTo", () => {
  it("the new address, on the old address's build only", () => {
    expect(movedTo(undefined)).toBeNull();
    expect(movedTo(" ")).toBeNull();
    expect(movedTo("https://rebalanceweek.com/app/")?.href).toBe("https://rebalanceweek.com/app/");
    expect(movedTo("http://localhost:5180/app/")?.origin).toBe("http://localhost:5180");
  });
  it("never a plain http address elsewhere, or something that isn't an address", () => {
    expect(movedTo("http://rebalanceweek.com/app/")).toBeNull();
    expect(movedTo("rebalanceweek.com/app")).toBeNull();
    expect(movedTo("javascript:alert(1)")).toBeNull();
  });
});

describe("handoffUrl", () => {
  it("opens the new address marked as a hand-off, nothing else in the link", () => {
    expect(handoffUrl(new URL("https://rebalanceweek.com/app/"))).toBe("https://rebalanceweek.com/app/#handoff");
    expect(handoffUrl(new URL("https://rebalanceweek.com/app/#x"))).toBe("https://rebalanceweek.com/app/#handoff");
  });
});

describe("handoffOrigins", () => {
  it("the old GitHub Pages address by default", () => {
    expect(handoffOrigins(undefined)).toEqual(["https://malinovent.github.io"]);
    expect(handoffOrigins("")).toEqual(["https://malinovent.github.io"]);
  });
  it("a list instead, as origins; bad entries skipped", () => {
    expect(handoffOrigins("http://localhost:5173/cadence/, https://a.example, nope, http://evil.example")).toEqual([
      "http://localhost:5173",
      "https://a.example",
    ]);
  });
});

describe("readHandoff", () => {
  it("our messages only", () => {
    expect(readHandoff({ type: "rebalance:ready" })).toEqual({ type: "rebalance:ready" });
    expect(readHandoff({ type: "rebalance:handoff", text: "{}" })).toEqual({ type: "rebalance:handoff", text: "{}" });
    expect(readHandoff({ type: "rebalance:received", extra: 1 })).toEqual({ type: "rebalance:received" });
    expect(readHandoff({ type: "rebalance:handoff" })).toBeNull();
    expect(readHandoff({ type: "other" })).toBeNull();
    expect(readHandoff("rebalance:ready")).toBeNull();
    expect(readHandoff(null)).toBeNull();
  });
});

describe("nextSendState", () => {
  it("done or declined only after the weeks were sent", () => {
    expect(nextSendState("sent", { type: "rebalance:received" })).toBe("done");
    expect(nextSendState("sent", { type: "rebalance:declined" })).toBe("declined");
    expect(nextSendState("opening", { type: "rebalance:received" })).toBe("opening");
    expect(nextSendState("sent", null)).toBe("sent");
  });
});
