jest.mock("../config/env", () => ({ env: { appUrl: "https://ongdngolu.org" } }));
import { resetUrlFor } from "./password-reset.service";

describe("resetUrlFor", () => {
  it("vitrine et apps Avelomi prod -> page Avelomi", () => {
    expect(resetUrlFor("https://avelomi.com", "t1")).toBe("https://avelomi.com/#/reset?token=t1");
    expect(resetUrlFor("https://domus.avelomi.com", "t1")).toBe("https://avelomi.com/#/reset?token=t1");
  });

  it("Avelomi dev -> vitrine dev", () => {
    expect(resetUrlFor("https://dev.avelomi.com", "t2")).toBe("https://dev.avelomi.com/#/reset?token=t2");
    expect(resetUrlFor("https://farmos.dev.avelomi.com", "t2")).toBe("https://dev.avelomi.com/#/reset?token=t2");
  });

  it("autre origine ou absente -> ecran historique du CRM", () => {
    expect(resetUrlFor(undefined, "t3")).toBe("https://ongdngolu.org/admin/auth/reset-password?token=t3");
    expect(resetUrlFor("https://evil-avelomi.com", "t3")).toBe("https://ongdngolu.org/admin/auth/reset-password?token=t3");
    expect(resetUrlFor("http://avelomi.com", "t3")).toBe("https://ongdngolu.org/admin/auth/reset-password?token=t3");
  });
});
