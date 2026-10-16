import { describe, expect, it } from "vitest";
import { warningText } from "./Allocation.jsx";

describe("warningText", () => {
  it("structure : date formatee fr, sans ISO", () => {
    const w = { code: "OLDER_DUE_UNSETTLED", message: "brut", params: { date: "2026-09-01" } };
    expect(warningText(w)).toContain("1 septembre 2026");
    expect(warningText(w)).not.toContain("2026-09-01");
  });
  it("repli sur message / chaine", () => {
    expect(warningText({ code: "X", message: "m" })).toBe("m");
    expect(warningText("s")).toBe("s");
  });
});
