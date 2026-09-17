import { NotFoundException } from "@nestjs/common";
import { PropertyManagementService } from "./property-management.service";
import {
  realEstateProperties,
  realEstateRentPayments,
  realEstatePropertyExpenses,
  realEstateMortgagePayments,
  currencies,
  appSettings,
} from "../database/schema";

// P&L par propriete (SCRUM-312) — Tests cibles (pas de couverture exhaustive) :
// RBAC/scope, agregation revenus/depenses/hypotheque, formule netIncome exacte,
// multi-devise (jamais de somme inter-devises), fallback currencyId NULL
// explicite (pas de merge silencieux), periode vide. Meme pattern de mock que
// property-expenses.spec.ts / mortgage-payments.spec.ts (SCRUM-310/311).

const ORG = 1;

function tableName(table: any) {
  if (table === realEstateProperties) return "properties";
  if (table === realEstateRentPayments) return "rentPayments";
  if (table === realEstatePropertyExpenses) return "expenses";
  if (table === realEstateMortgagePayments) return "mortgagePayments";
  if (table === currencies) return "currencies";
  if (table === appSettings) return "appSettings";
  return "other";
}

function makeService(opts: {
  propertyRow?: any;
  rentRows?: any[];
  expenseRows?: any[];
  mortgageRows?: any[];
  currencyRows?: any[];
  defaultCurrencyId?: number | null;
} = {}) {
  const propertyRow = "propertyRow" in opts ? opts.propertyRow : { id: 1, name: "Immeuble A" };
  const rentRows = opts.rentRows ?? [];
  const expenseRows = opts.expenseRows ?? [];
  const mortgageRows = opts.mortgageRows ?? [];
  const currencyRows = opts.currencyRows ?? [];
  const defaultCurrencyId = "defaultCurrencyId" in opts ? opts.defaultCurrencyId : 1;

  const db: any = {
    select: (_cols?: any) => ({
      from: (table: any) => {
        const name = tableName(table);

        if (name === "appSettings") {
          // readOrgAppSetting: select(cols).from(appSettings).where(...).orderBy(...).limit(1)
          return {
            where: () => ({
              orderBy: () => ({
                limit: () =>
                  Promise.resolve(
                    defaultCurrencyId !== null ? [{ currencyId: defaultCurrencyId }] : [],
                  ),
              }),
            }),
          };
        }

        if (name === "properties") {
          // getPropertyPnl: select().from(properties).where(...).limit(1)
          return {
            where: () => ({
              limit: () => Promise.resolve(propertyRow ? [propertyRow] : []),
            }),
          };
        }

        if (name === "rentPayments") {
          // select().from(rentPayments).leftJoin(lease).where(...).groupBy(...)
          return {
            leftJoin: () => ({
              where: () => ({
                groupBy: () => Promise.resolve(rentRows),
              }),
            }),
          };
        }

        if (name === "expenses") {
          // listPropertyExpenses: select().from(expenses).leftJoin().leftJoin().where().orderBy()
          return {
            leftJoin: () => ({
              leftJoin: () => ({
                where: () => ({
                  orderBy: () => Promise.resolve(expenseRows),
                }),
              }),
            }),
          };
        }

        if (name === "mortgagePayments") {
          // listMortgagePayments: select().from(payments).leftJoin().leftJoin().where().orderBy()
          return {
            leftJoin: () => ({
              leftJoin: () => ({
                where: () => ({
                  orderBy: () => Promise.resolve(mortgageRows),
                }),
              }),
            }),
          };
        }

        if (name === "currencies") {
          // select().from(currencies).where(inArray(...))
          return {
            where: () => Promise.resolve(currencyRows),
          };
        }

        return { where: () => Promise.resolve([]) };
      },
    }),
  };

  const service = new PropertyManagementService(
    db,
    {} as any, // realtime
    {} as any, // emails
    {} as any, // sms
    {} as any, // ledger
    {} as any, // workflow
    {} as any, // projects
    {} as any, // objectStorage
    {} as any, // whatsapp
    {} as any, // tenantPortal
  );

  return { service, db };
}

describe("PropertyManagementService — getPropertyPnl — RBAC / scope", () => {
  it("rejette si la propriete n'est pas dans le scope autorise", async () => {
    const { service } = makeService();
    await expect(service.getPropertyPnl(1, ORG, [2, 3], {})).rejects.toThrow(NotFoundException);
  });

  it("accepte si la propriete est dans le scope explicite", async () => {
    const { service } = makeService();
    const result = await service.getPropertyPnl(1, ORG, [1, 2], {});
    expect(result.propertyId).toBe(1);
  });

  it("accepte pour scope 'all'", async () => {
    const { service } = makeService();
    const result = await service.getPropertyPnl(1, ORG, "all", {});
    expect(result.propertyId).toBe(1);
  });

  it("rejette si la propriete n'existe pas / n'est pas active", async () => {
    const { service } = makeService({ propertyRow: null });
    await expect(service.getPropertyPnl(1, ORG, "all", {})).rejects.toThrow(NotFoundException);
  });
});

describe("PropertyManagementService — getPropertyPnl — agregation revenus (loyers)", () => {
  it("somme correcte groupee par currencyId, count correct", async () => {
    const { service } = makeService({
      rentRows: [{ currencyId: 1, total: "1500.00", count: 3 }],
      currencyRows: [{ id: 1, currencyCode: "USD", currencyName: "US Dollar", currencySymbol: "$" }],
    });
    const result = await service.getPropertyPnl(1, ORG, "all", {});
    const bucket = result.byCurrency.find((b: any) => b.currencyId === 1)!;
    expect(bucket.revenue.rent).toBe("1500");
    expect(bucket.revenue.count).toBe(3);
  });

  // Le filtre "baux annules exclus" est applique dans la requete SQL
  // (ne(paymentLease.status, "cancelled")) — verifie par le contrat de la
  // requete elle-meme (memes conditions que payments()) ; ici on verifie que
  // le service se contente d'agreger ce que la requete renvoie (les lignes
  // annulees etant deja filtrees en amont, elles ne doivent pas apparaitre).
  it("n'agrege que ce que la requete renvoie (baux annules deja exclus en amont)", async () => {
    const { service } = makeService({
      rentRows: [{ currencyId: 1, total: "1000.00", count: 2 }],
      currencyRows: [{ id: 1, currencyCode: "USD", currencyName: "US Dollar", currencySymbol: "$" }],
    });
    const result = await service.getPropertyPnl(1, ORG, "all", {});
    expect(result.byCurrency).toHaveLength(1);
    expect(result.byCurrency[0].revenue.rent).toBe("1000");
  });
});

describe("PropertyManagementService — getPropertyPnl — agregation depenses", () => {
  it("reutilise listPropertyExpenses et calcule total + byCategory corrects", async () => {
    const { service } = makeService({
      expenseRows: [
        { currencyId: 1, amount: "200.00", category: "insurance", isActive: 1 },
        { currencyId: 1, amount: "300.00", category: "maintenance_general", isActive: 1 },
        { currencyId: 1, amount: "100.00", category: "insurance", isActive: 1 },
      ],
      currencyRows: [{ id: 1, currencyCode: "USD", currencyName: "US Dollar", currencySymbol: "$" }],
    });
    const result = await service.getPropertyPnl(1, ORG, "all", {});
    const bucket = result.byCurrency.find((b: any) => b.currencyId === 1)!;
    expect(bucket.expenses.total).toBe("600");
    expect(bucket.expenses.count).toBe(3);
    const insurance = bucket.expenses.byCategory.find((c: any) => c.category === "insurance")!;
    const maintenance = bucket.expenses.byCategory.find((c: any) => c.category === "maintenance_general")!;
    expect(insurance.amount).toBe("300");
    expect(maintenance.amount).toBe("300");
  });

  it("appelle listPropertyExpenses avec propertyId + dateFrom/dateTo transmis", async () => {
    const { service } = makeService();
    const spy = jest.spyOn(service, "listPropertyExpenses");
    await service.getPropertyPnl(1, ORG, "all", { dateFrom: "2026-01-01", dateTo: "2026-12-31" });
    expect(spy).toHaveBeenCalledWith(ORG, {
      propertyId: 1,
      dateFrom: "2026-01-01",
      dateTo: "2026-12-31",
    });
  });
});

describe("PropertyManagementService — getPropertyPnl — agregation hypotheque", () => {
  it("seul interest_amount entre dans netIncome ; principal et escrow exposes mais pas soustraits", async () => {
    const { service } = makeService({
      rentRows: [{ currencyId: 1, total: "2000.00", count: 1 }],
      mortgageRows: [
        { currencyId: 1, interestAmount: "400.00", principalAmount: "800.00", escrowAmount: "100.00" },
      ],
      currencyRows: [{ id: 1, currencyCode: "USD", currencyName: "US Dollar", currencySymbol: "$" }],
    });
    const result = await service.getPropertyPnl(1, ORG, "all", {});
    const bucket = result.byCurrency.find((b: any) => b.currencyId === 1)!;
    expect(bucket.mortgage.interest).toBe("400");
    expect(bucket.mortgage.principal).toBe("800");
    expect(bucket.mortgage.escrow).toBe("100");
    // netIncome = rent(2000) - expenses(0) - interest(400) = 1600
    // PAS 2000 - 800 - 400 - 100
    expect(bucket.netIncome).toBe("1600");
  });

  it("reutilise listMortgagePayments avec propertyId + dateFrom/dateTo transmis", async () => {
    const { service } = makeService();
    const spy = jest.spyOn(service, "listMortgagePayments");
    await service.getPropertyPnl(1, ORG, "all", { dateFrom: "2026-01-01", dateTo: "2026-12-31" });
    expect(spy).toHaveBeenCalledWith(ORG, {
      propertyId: 1,
      dateFrom: "2026-01-01",
      dateTo: "2026-12-31",
    });
  });
});

describe("PropertyManagementService — getPropertyPnl — netIncome (formule exacte)", () => {
  it("netIncome = rent - expenses.total - mortgage.interest, pas de soustraction principal/escrow", async () => {
    const { service } = makeService({
      rentRows: [{ currencyId: 1, total: "5000.00", count: 2 }],
      expenseRows: [{ currencyId: 1, amount: "700.00", category: "hoa", isActive: 1 }],
      mortgageRows: [
        { currencyId: 1, interestAmount: "500.00", principalAmount: "1200.00", escrowAmount: "150.00" },
      ],
      currencyRows: [{ id: 1, currencyCode: "USD", currencyName: "US Dollar", currencySymbol: "$" }],
    });
    const result = await service.getPropertyPnl(1, ORG, "all", {});
    const bucket = result.byCurrency.find((b: any) => b.currencyId === 1)!;
    // 5000 - 700 - 500 = 3800 (PAS 5000 - 700 - 500 - 1200 - 150)
    expect(bucket.netIncome).toBe("3800");
  });
});

describe("PropertyManagementService — getPropertyPnl — multi-devise", () => {
  it("deux devises differentes produisent deux entrees separees, jamais de somme inter-devises", async () => {
    const { service } = makeService({
      rentRows: [
        { currencyId: 1, total: "1000.00", count: 1 },
        { currencyId: 2, total: "500.00", count: 1 },
      ],
      expenseRows: [
        { currencyId: 1, amount: "100.00", category: "insurance", isActive: 1 },
        { currencyId: 2, amount: "50.00", category: "insurance", isActive: 1 },
      ],
      currencyRows: [
        { id: 1, currencyCode: "USD", currencyName: "US Dollar", currencySymbol: "$" },
        { id: 2, currencyCode: "CDF", currencyName: "Franc congolais", currencySymbol: "FC" },
      ],
    });
    const result = await service.getPropertyPnl(1, ORG, "all", {});
    expect(result.byCurrency).toHaveLength(2);

    const usd = result.byCurrency.find((b: any) => b.currencyId === 1)!;
    const cdf = result.byCurrency.find((b: any) => b.currencyId === 2)!;

    expect(usd.currencyCode).toBe("USD");
    expect(usd.revenue.rent).toBe("1000");
    expect(usd.expenses.total).toBe("100");
    expect(usd.netIncome).toBe("900");

    expect(cdf.currencyCode).toBe("CDF");
    expect(cdf.revenue.rent).toBe("500");
    expect(cdf.expenses.total).toBe("50");
    expect(cdf.netIncome).toBe("450");

    // Jamais fusionnees : aucune entree ne doit contenir la somme des deux
    // (1500 loyers ou 950 netIncome combines).
    expect(result.byCurrency.some((b: any) => b.revenue.rent === "1500")).toBe(false);
    expect(result.byCurrency.some((b: any) => b.netIncome === "950")).toBe(false);
  });
});

describe("PropertyManagementService — getPropertyPnl — currencyId NULL", () => {
  it("resout currencyId NULL vers resolveDefaultCurrency(orgId), sans fusion avec une devise existante de meme code", async () => {
    // Devise par defaut de l'org = id 9 (USD). Une AUTRE devise USD existe deja
    // en base avec id 1 (ex: doublon historique). Une ligne avec currencyId
    // explicite = 1 (USD "reel") coexiste avec une ligne currencyId = NULL
    // (qui doit tomber sur le defaut = 9, PAS fusionnee avec id 1 juste parce
    // que meme code "USD").
    const { service } = makeService({
      defaultCurrencyId: 9,
      rentRows: [
        { currencyId: 1, total: "1000.00", count: 1 }, // devise USD reelle explicite
        { currencyId: null, total: "300.00", count: 1 }, // NULL -> doit resoudre vers 9
      ],
      currencyRows: [
        { id: 1, currencyCode: "USD", currencyName: "US Dollar (reel)", currencySymbol: "$" },
        { id: 9, currencyCode: "USD", currencyName: "US Dollar (defaut org)", currencySymbol: "$" },
      ],
    });
    const result = await service.getPropertyPnl(1, ORG, "all", {});

    expect(result.byCurrency).toHaveLength(2);
    const realUsd = result.byCurrency.find((b: any) => b.currencyId === 1)!;
    const defaultUsd = result.byCurrency.find((b: any) => b.currencyId === 9)!;

    expect(realUsd).toBeDefined();
    expect(realUsd.revenue.rent).toBe("1000");
    expect(defaultUsd).toBeDefined();
    expect(defaultUsd.revenue.rent).toBe("300");

    // Verification explicite : ce n'est pas un "premier trouve" qui aurait
    // fusionne les 1300 sur l'entree id=1.
    expect(realUsd.revenue.rent).not.toBe("1300");
  });

  it("si aucune devise par defaut n'est configuree (resolveDefaultCurrency renvoie null), le bucket garde currencyId null", async () => {
    const { service } = makeService({
      defaultCurrencyId: null,
      rentRows: [{ currencyId: null, total: "300.00", count: 1 }],
      currencyRows: [],
    });
    const result = await service.getPropertyPnl(1, ORG, "all", {});
    expect(result.byCurrency).toHaveLength(1);
    expect(result.byCurrency[0].currencyId).toBeNull();
    expect(result.byCurrency[0].currencyCode).toBeNull();
    expect(result.byCurrency[0].revenue.rent).toBe("300");
  });
});

describe("PropertyManagementService — getPropertyPnl — periode vide / aucune donnee", () => {
  it("retourne byCurrency: [] proprement, pas d'erreur", async () => {
    const { service } = makeService({ rentRows: [], expenseRows: [], mortgageRows: [] });
    const result = await service.getPropertyPnl(1, ORG, "all", {
      dateFrom: "2099-01-01",
      dateTo: "2099-12-31",
    });
    expect(result.byCurrency).toEqual([]);
    expect(result.propertyId).toBe(1);
    expect(result.dateFrom).toBe("2099-01-01");
    expect(result.dateTo).toBe("2099-12-31");
  });
});
