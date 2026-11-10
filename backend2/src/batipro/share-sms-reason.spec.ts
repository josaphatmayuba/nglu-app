import { shareSmsFailureReason } from "./batipro-owner-notifier.service";

describe("shareSmsFailureReason (meme lecture que Domus du resultat CompatService.sendSms)", () => {
  it("skipped = SMS desactives", () => {
    expect(shareSmsFailureReason({ success: false, skipped: true })).toMatch(/desactives/);
  });
  it("service non configure", () => {
    expect(shareSmsFailureReason({ success: false, message: "SMS service is not configured." })).toBe("Service SMS non configure.");
  });
  it("echec fournisseur : pas de detail (identifiant de compte) renvoye", () => {
    const r = shareSmsFailureReason({ success: false, message: "authentication failed, account ACxxxx" });
    expect(r).not.toMatch(/AC|authentication/);
    expect(r).toMatch(/passerelle/);
  });
});
