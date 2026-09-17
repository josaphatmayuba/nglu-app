import { FarmosReproAlertService } from "./farmos-repro-alert.service";
import { env } from "../config/env";
import type { SowWatchlistRow } from "./farmos-repro.service";

// Alerte quotidienne WhatsApp regisseur (truies >= seuil de jours non
// productifs). Tests cibles : no-op si desactive, formatage du message.

function makeService() {
  const db: any = {};
  const reproService: any = { getSowWatchlist: jest.fn() };
  const whatsapp: any = { sendMessage: jest.fn().mockResolvedValue(undefined) };
  const service = new FarmosReproAlertService(db, reproService, whatsapp);
  return { service, reproService, whatsapp };
}

const ROW = (overrides: Partial<SowWatchlistRow> = {}): SowWatchlistRow => ({
  animalId: 1,
  externalId: "T-001",
  name: null,
  site: null,
  reproStatus: "empty",
  lastEventDate: "2026-01-01",
  daysNonProductive: 35,
  nextAction: "Saillie à planifier",
  nextActionDate: null,
  bodyConditionScore: null,
  parity: 2,
  ...overrides,
});

describe("FarmosReproAlertService — scheduledRun", () => {
  const original = env.reproWatchlistAlert.enabled;
  afterEach(() => {
    (env.reproWatchlistAlert as any).enabled = original;
  });

  it("ne fait rien (aucun appel DB/WhatsApp) si enabled=false", async () => {
    (env.reproWatchlistAlert as any).enabled = false;
    const { service, reproService, whatsapp } = makeService();
    await service.scheduledRun();
    expect(reproService.getSowWatchlist).not.toHaveBeenCalled();
    expect(whatsapp.sendMessage).not.toHaveBeenCalled();
  });
});

describe("FarmosReproAlertService — formatMessage", () => {
  it("formate identifiant + jours non productifs + statut pour chaque truie", () => {
    const { service } = makeService();
    const watchlist = [ROW({ externalId: "T-001", daysNonProductive: 40, reproStatus: "empty" })];
    const message = service.formatMessage(watchlist, 30);
    expect(message).toContain("Truies >= 30j non productives (1)");
    expect(message).toContain("T-001 : 40j (empty)");
  });

  it("plafonne l'affichage a 20 lignes et ajoute un recapitulatif du reste", () => {
    const { service } = makeService();
    const watchlist = Array.from({ length: 25 }, (_, i) => ROW({ animalId: i, externalId: `T-${i}`, daysNonProductive: 30 + i }));
    const message = service.formatMessage(watchlist, 30);
    const lines = message.split("\n");
    // header + 20 truies + 1 ligne recap = 22
    expect(lines.length).toBe(22);
    expect(message).toContain("... et 5 autre(s).");
  });

  it("utilise le nom ou #id si externalId absent", () => {
    const { service } = makeService();
    const watchlist = [ROW({ externalId: null, name: "Bella", animalId: 7 }), ROW({ externalId: null, name: null, animalId: 8 })];
    const message = service.formatMessage(watchlist, 30);
    expect(message).toContain("Bella :");
    expect(message).toContain("#8 :");
  });
});

describe("FarmosReproAlertService — runForOrganization", () => {
  it("n'envoie rien si la watchlist est vide", async () => {
    const { service, reproService, whatsapp } = makeService();
    reproService.getSowWatchlist.mockResolvedValue([]);
    await service.runForOrganization(1);
    expect(whatsapp.sendMessage).not.toHaveBeenCalled();
  });

  it("envoie un message si la watchlist n'est pas vide et le jid est configure", async () => {
    const originalJid = env.reproWatchlistAlert.recipientJid;
    (env.reproWatchlistAlert as any).recipientJid = "1234567890@g.us";
    try {
      const { service, reproService, whatsapp } = makeService();
      reproService.getSowWatchlist.mockResolvedValue([ROW()]);
      await service.runForOrganization(1);
      expect(whatsapp.sendMessage).toHaveBeenCalledWith("1234567890@g.us", expect.stringContaining("T-001"));
    } finally {
      (env.reproWatchlistAlert as any).recipientJid = originalJid;
    }
  });
});
