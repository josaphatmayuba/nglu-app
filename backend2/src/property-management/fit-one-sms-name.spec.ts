import { OwnerNotificationsService } from "./owner-notifications.service";

// fitOneSms : le nom accole au numero final est reduit au premier mot, jamais perdu.
describe("fitOneSms — nom du bailleur preserve", () => {
  const svc = new OwnerNotificationsService({} as any, {} as any, {} as any, {} as any, {} as any);

  it("Bailleur : nom long -> premier mot + numero entier, 160 max", () => {
    const t = "Bonjour Mme Benedicte Mbombo Boteya, loyer en retard de 11 mois et 24 jours (33 000 $). Merci de regulariser rapidement. Bailleur : ANICET NGOMA NDELE, +243900644315.";
    const out = svc.fitOneSms(t);
    expect(out.length).toBeLessThanOrEqual(160);
    expect(out).toContain("Bailleur : ANICET, +243900644315.");
  });

  it("« : proprietaire X au » -> proprietaire ANICET au +243...", () => {
    const t = "Bonjour, Mme Benedicte Mbombo Boteya a 1 mois et 20 jours de retard de loyer (6 000 $). Merci de l'inviter a regulariser : proprietaire ANICET NGOMA NDELE au +243900644315";
    const out = svc.fitOneSms(t);
    expect(out.length).toBeLessThanOrEqual(160);
    expect(out).toContain("proprietaire ANICET au +243900644315");
  });

  it("nouveau texte par defaut, cas de la capture : tient en 1 SMS sans couper le nom", () => {
    const t = "Bonjour Mme Benedicte Mbombo Boteya, loyer en retard de 1 mois et 20 jours (3 000 $). Merci de regulariser. Bailleur : ANICET NGOMA, +243900644315.";
    expect(svc.fitOneSms(t)).toBe(t);
  });
});
