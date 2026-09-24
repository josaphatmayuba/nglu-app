import { BadRequestException, NotFoundException } from "@nestjs/common";
import { PropertyManagementService } from "./property-management.service";
import { realEstateLeases, realEstateRentPayments } from "../database/schema";

// Preavis pour defaut de paiement — Tests cibles :
// le SEUIL est la garantie centrale de cette feature. Le bouton n'apparait dans
// l'UI qu'au-dela d'un mois du, mais c'est le backend qui doit refuser, sinon un
// appel direct a l'API notifierait un preavis a un locataire a jour — une faute
// grave vis-a-vis du locataire, pas une simple erreur d'affichage.
// On verifie donc : refus a 1 mois ou moins, envoi au-dela, exclusion des
// echeances `pending`, trace ecrite, et absence de trace si aucun canal
// locataire n'aboutit.

const ORG = 1;

function makeService(opts: {
  lease?: any;
  payments?: any[];
  smsOk?: boolean;
  emailThrows?: boolean;
} = {}) {
  const updates: { table: any; vals: any }[] = [];
  const sentSms: any[] = [];
  const sentEmails: any[] = [];

  const lease =
    "lease" in opts
      ? opts.lease
      : {
          id: 10,
          organizationId: ORG,
          tenantId: 7,
          propertyId: 3,
          reference: "BAIL-2026-014",
          startDate: "2026-01-01",
          rentAmount: "100.00",
          nextInvoiceDate: "2026-02-01",
          noticeSentAt: null,
          currencySymbol: "$",
          tenantFirstName: "Jean",
          tenantLastName: "Kabila",
          tenantEmail: "jean@example.com",
          tenantPhone: "+243900000000",
          emergencyPhone: "+243810000000",
          propertyName: "Villa Ngaliema",
          propertyAddress: "12 av. Ngaliema",
          unitName: "Appt 3B",
        };
  const payments = opts.payments ?? [];

  const db: any = {
    update: (table: any) => ({
      set: (vals: any) => ({
        where: () => {
          updates.push({ table, vals });
          return Promise.resolve();
        },
      }),
    }),
    select: (_cols?: any) => ({
      from: (table: any) => {
        const chain: any = {
          leftJoin: () => chain,
          innerJoin: () => chain,
          where: () => ({
            // Les paiements sont `await`es directement (liste), le bail passe
            // par `.limit(1)` : on expose les deux formes sur le meme objet.
            then: (resolve: any, reject: any) =>
              Promise.resolve(table === realEstateRentPayments ? payments : []).then(resolve, reject),
            limit: () =>
              Promise.resolve(table === realEstateLeases && lease ? [lease] : []),
          }),
        };
        return chain;
      },
    }),
  };

  const emails = {
    send: async (msg: any) => {
      if (opts.emailThrows) throw new Error("smtp down");
      sentEmails.push(msg);
      return { ok: true };
    },
  };
  const sms = {
    sendSms: async (msg: any) => {
      sentSms.push(msg);
      return { success: opts.smsOk ?? true };
    },
  };
  const tenantPortal = {
    portalUrlForTenant: async () => "https://portal.example/t/abc",
    appendPortalFooterToSms: async (text: string) => text,
    appendPortalFooterToEmail: async (html: string) => html,
  };
  const ownerNotifications = {
    propertyContactVars: async () => ({
      ownerContact: "proprietaire Marie au +243811111111",
      managerContact: "",
      contacts: "proprietaire Marie au +243811111111",
    }),
    renderMessage: async (_e: string, fallback: string, vars: Record<string, string>) => {
      let out = fallback;
      for (const [k, v] of Object.entries(vars)) out = out.replace(new RegExp(`\\{${k}\\}`, "g"), v ?? "");
      return out;
    },
    fitOneSms: (t: string) => t,
    notifyDefaultNotice: async () => true,
  };

  const service = new PropertyManagementService(
    db,
    {} as any,
    emails as any,
    sms as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    tenantPortal as any,
    {} as any,
    ownerNotifications as any,
  );

  return { service, updates, sentSms, sentEmails };
}

// Un bail demarre il y a `monthsAgo` mois, pour forcer un nombre de mois exigibles.
function startDateMonthsAgo(monthsAgo: number) {
  const d = new Date();
  const m = new Date(d.getFullYear(), d.getMonth() - monthsAgo, 1);
  return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}-01`;
}

// Bail demarre il y a N mois => monthsDue = N + 1 (mois courant inclus).
// Avec un loyer de 100, `paid(k)` couvre k mois entiers.
const paid = (months: number) => [{ amount: String(months * 100), status: "paid" }];

const leaseStarted = (monthsAgo: number, extra: Record<string, unknown> = {}) => ({
  id: 10,
  organizationId: ORG,
  tenantId: 7,
  propertyId: 3,
  reference: "BAIL-2026-014",
  startDate: startDateMonthsAgo(monthsAgo),
  rentAmount: "100.00",
  nextInvoiceDate: startDateMonthsAgo(monthsAgo),
  noticeSentAt: null,
  currencySymbol: "$",
  tenantFirstName: "Jean",
  tenantLastName: "Kabila",
  tenantEmail: "jean@example.com",
  tenantPhone: "+243900000000",
  emergencyPhone: "+243810000000",
  propertyName: "Villa Ngaliema",
  propertyAddress: "12 av. Ngaliema",
  unitName: "Appt 3B",
  ...extra,
});

describe("sendDefaultNotice — seuil de plus d'un mois impaye", () => {
  it("refuse un locataire a jour et n'envoie rien", async () => {
    // 3 mois exigibles, 3 mois payes => 0 mois du.
    const { service, sentSms, sentEmails, updates } = makeService({
      lease: leaseStarted(2),
      payments: paid(3),
    });
    await expect(service.sendDefaultNotice(10, ORG)).rejects.toBeInstanceOf(BadRequestException);
    expect(sentSms).toHaveLength(0);
    expect(sentEmails).toHaveLength(0);
    expect(updates).toHaveLength(0);
  });

  it("refuse a exactement 1 mois du (le seul mois en cours n'est pas un defaut)", async () => {
    // 3 mois exigibles, 2 payes => 1 mois du : sous le seuil, strictement.
    const { service, sentSms, sentEmails, updates } = makeService({
      lease: leaseStarted(2),
      payments: paid(2),
    });
    await expect(service.sendDefaultNotice(10, ORG)).rejects.toBeInstanceOf(BadRequestException);
    expect(sentSms).toHaveLength(0);
    expect(sentEmails).toHaveLength(0);
    expect(updates).toHaveLength(0);
  });

  it("envoie au-dela d'un mois du, au locataire ET a sa personne de contact", async () => {
    // 3 mois exigibles, 1 paye => 2 mois dus : au-dessus du seuil.
    const { service, sentSms, sentEmails, updates } = makeService({
      lease: leaseStarted(2),
      payments: paid(1),
    });
    const res = await service.sendDefaultNotice(10, ORG);

    expect(res.monthsBehind).toBe(2);
    expect(res.balance).toBe(200);
    expect(res.smsSent).toBe(true);
    expect(res.emailSent).toBe(true);
    expect(res.contactNotified).toBe(true);

    // 2 SMS : le locataire, puis la personne de contact.
    expect(sentSms).toHaveLength(2);
    expect(sentSms[0].phone).toBe("+243900000000");
    expect(sentSms[1].phone).toBe("+243810000000");
    // Le message de la personne de contact ne porte JAMAIS le lien portail :
    // il ne s'adresse pas au locataire.
    expect(sentSms[1].message).not.toContain("https://portal.example");
    expect(sentEmails).toHaveLength(1);
  });

  it("trace la date d'envoi et les mois dus sur le bail", async () => {
    const { service, updates } = makeService({
      lease: leaseStarted(3),
      payments: paid(1),
    });
    await service.sendDefaultNotice(10, ORG);

    const trace = updates.find((u) => u.table === realEstateLeases);
    expect(trace).toBeDefined();
    // 4 mois exigibles - 1 couvert = 3 mois dus, figes a l'instant du preavis.
    expect(trace!.vals.defaultNoticeMonthsBehind).toBe(3);
    expect(trace!.vals.defaultNoticeSentAt).toBeDefined();
  });

  it("ignore les echeances `pending` dans la couverture", async () => {
    // 3 mois exigibles ; 1 paye + 2 `pending` (generees, non encaissees).
    // Les pending ne doivent PAS couvrir : le locataire reste a 2 mois dus.
    const { service } = makeService({
      lease: leaseStarted(2),
      payments: [
        { amount: "100", status: "paid" },
        { amount: "100", status: "pending" },
        { amount: "100", status: "pending" },
      ],
    });
    const res = await service.sendDefaultNotice(10, ORG);
    expect(res.monthsBehind).toBe(2);
  });

  it("ne trace rien si aucun canal locataire n'aboutit", async () => {
    // Ni telephone ni email exploitables : enregistrer un preavis que le
    // locataire n'a jamais recu vider la trace de sa valeur de preuve.
    const { service, updates } = makeService({
      lease: leaseStarted(2, { tenantPhone: null, tenantEmail: null }),
      payments: paid(1),
    });
    await expect(service.sendDefaultNotice(10, ORG)).rejects.toBeInstanceOf(BadRequestException);
    expect(updates).toHaveLength(0);
  });

  it("refuse un bail introuvable", async () => {
    const { service } = makeService({ lease: null });
    await expect(service.sendDefaultNotice(999, ORG)).rejects.toBeInstanceOf(NotFoundException);
  });
});
