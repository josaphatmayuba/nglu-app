import { buildRentBookExtras, deriveDueDay } from "./rent-book-extras";

describe("rent-book extras", () => {
  it("tout est null/vide quand rien n'est connu", () => {
    const r = buildRentBookExtras({ graceDays: 5 });
    expect(r).toMatchObject({
      graceDays: 5, dueDay: null, depositContract: null, depositMonths: null, depositReceived: null,
      noticeMonths: null, occupants: null, tenantProvince: null, tenantMaritalStatus: null, tenantPostName: null,
      tenantType: null, companyName: null, landlordName: null, landlordPhone: null, orgPaymentMethods: null,
    });
    expect(r.delegates).toEqual([]);
  });

  it("garantie : mois arrondis, null si loyer 0", () => {
    expect(buildRentBookExtras({ graceDays: 5, rentAmount: "400", depositContract: "1200" }).depositMonths).toBe(3);
    expect(buildRentBookExtras({ graceDays: 5, rentAmount: "450", depositContract: "1200" }).depositMonths).toBe(3);
    expect(buildRentBookExtras({ graceDays: 5, rentAmount: "0", depositContract: "1200" }).depositMonths).toBeNull();
    expect(buildRentBookExtras({ graceDays: 5, rentAmount: "400", depositContract: "0" }).depositContract).toBeNull();
  });

  it("garantie recue passee telle quelle (montant numerique)", () => {
    const r = buildRentBookExtras({ graceDays: 5, depositReceived: { amount: "1000.00", date: "2026-07-09", currencySymbol: "$", status: "held" } });
    expect(r.depositReceived).toEqual({ amount: 1000, date: "2026-07-09", currencySymbol: "$", status: "held" });
  });

  it("jour d'echeance : mois civil -> 1, sinon 2e echeance, sinon jour de debut", () => {
    expect(deriveDueDay({ rentProrationEnabled: true, startDate: "2026-07-19" })).toBe(1);
    expect(deriveDueDay({ startDate: "2026-07-19", dueDates: ["2026-07-19", "2026-08-05"] })).toBe(5);
    expect(deriveDueDay({ startDate: "2026-07-19" })).toBe(19);
    expect(deriveDueDay({})).toBeNull();
  });

  it("bailleur : repli sur les reglages si le proprietaire est vide", () => {
    expect(buildRentBookExtras({ graceDays: 5, ownerName: " ", settingLandlordName: "Org", settingLandlordPhone: "+243810000000" }))
      .toMatchObject({ landlordName: "Org", landlordPhone: "+243810000000" });
    expect(buildRentBookExtras({ graceDays: 5, ownerName: "Prop", ownerPhone: null, settingLandlordPhone: "+243810000000" }))
      .toMatchObject({ landlordName: "Prop", landlordPhone: null });
  });

  it("delegues dedoublonnes, phone puis phone2", () => {
    const r = buildRentBookExtras({
      graceDays: 5,
      delegates: [
        { displayName: "Kabila", phone: null, phone2: "+2438300" },
        { displayName: "Kabila", phone: "", phone2: "+2438300" },
        { displayName: "Mbuyi", phone: "+2438100" },
        { displayName: null, phone: "+1" },
      ],
    });
    expect(r.delegates).toEqual([{ name: "Kabila", phone: "+2438300" }, { name: "Mbuyi", phone: "+2438100" }]);
  });

  it("locataire : occupants, province, etat civil, entreprise", () => {
    const r = buildRentBookExtras({ graceDays: 5, tenant: { occupantNumber: 5, originProvince: "Equateur", maritalStatus: "married", tenantType: "company", companyName: "ACME" } });
    expect(r).toMatchObject({ occupants: 5, tenantProvince: "Equateur", tenantMaritalStatus: "married", tenantType: "company", companyName: "ACME" });
  });
});
