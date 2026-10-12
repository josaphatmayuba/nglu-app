import { escapeHtmlText, normalizePhoneKey } from "./notification-utils";

describe("notification-utils", () => {
  it("normalizePhoneKey : +243 == 00243 == espaces/tirets, null -> vide", () => {
    const a = normalizePhoneKey("+243 81-000.0001");
    expect(a).toBe("243810000001");
    expect(normalizePhoneKey("00243 810000001")).toBe(a);
    expect(normalizePhoneKey(null)).toBe("");
  });
  it("escapeHtmlText echappe < > & \"", () => {
    expect(escapeHtmlText('<a href="x">&</a>')).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;");
  });
});
