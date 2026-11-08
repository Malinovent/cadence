import { describe, expect, it } from "vitest";
import { parseDoneStyle, SOLID_TEXT } from "./doneStyle";

describe("how a ticked block looks", () => {
  it("is soft unless solid was chosen", () => {
    expect(parseDoneStyle("solid")).toBe("solid");
    expect(parseDoneStyle(null)).toBe("soft");
    expect(parseDoneStyle("bright")).toBe("soft");
  });
  it("solid uses the first version's white text", () => {
    expect(SOLID_TEXT).toBe("#fff");
  });
});
