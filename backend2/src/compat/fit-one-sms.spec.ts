import { OwnerNotificationsService } from "../property-management/owner-notifications.service";

const fit = (t: string) => (Object.create(OwnerNotificationsService.prototype) as OwnerNotificationsService).fitOneSms(t);

describe("fitOneSms", () => {
  it("message trop long : garde le telephone du bailleur en fin, raccourcit le texte avant", () => {
    const raw =
      "Bonjour Mr Leon Wangabala, votre loyer est en retard de 11 mois et 24 jours (18 000 $). " +
      "Merci de régulariser rapidement. Bailleur : ANICET NGOMA NDELE, +243 812 345 678.";
    const out = fit(raw);
    expect(out.length).toBeLessThanOrEqual(160);
    expect(out).toContain("Bailleur : ANICET, +243 812 345 678.");
  });

  it("message court : inchange", () => {
    expect(fit("Bonjour, loyer en retard. Bailleur : Jean, +243811111111.")).toBe("Bonjour, loyer en retard. Bailleur : Jean, +243811111111.");
  });
});
