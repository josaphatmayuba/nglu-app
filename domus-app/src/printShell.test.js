import { describe, expect, it } from "vitest";
import { defaultFormat, PAGE_RULES } from "./printShell.js";

describe("defaultFormat", () => {
  it("bail sans date de fin -> releve", () => {
    expect(defaultFormat({ endDate: null })).toBe("statement");
    expect(defaultFormat({})).toBe("statement");
  });
  it("bail avec date de fin -> quittances", () => {
    expect(defaultFormat({ endDate: "2027-06-30" })).toBe("receipts");
  });
});

describe("regles @page", () => {
  it("une regle par format", () => {
    expect(PAGE_RULES.paper).toContain("A4 landscape");
    expect(PAGE_RULES.paper).toContain("margin: 0");
    expect(PAGE_RULES.statement).toContain("A4 portrait");
    expect(PAGE_RULES.statement).toContain("12mm");
    expect(PAGE_RULES.receipts).toBe("@page { margin: 0; }");
  });
});
