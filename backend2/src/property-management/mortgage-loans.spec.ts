import { NotFoundException } from "@nestjs/common";
import { PropertyManagementService } from "./property-management.service";
import { realEstateProperties, realEstateMortgageLoans, realEstateMortgagePayments, currencies } from "../database/schema";

// Prets hypothecaires (SCRUM-311 phase 2) — Tests cibles : calcul du solde
// restant du, isolation stricte par devise (jamais de fusion entre devises,
// cf. incident "USD fantome"), soft delete uniquement, RBAC/org isolation,
// attachExistingPayments (rattachement explicite des paiements orphelins).
// Meme pattern de mock que mortgage-payments.spec.ts (SCRUM-311 phase 1).

const ORG = 1;

function makeService(opts: {
  propertyRow?: any;
  loanRow?: any;
  loanRows?: any[];
  paymentAggRows?: any[];
  currencyRows?: any[];
} = {}) {
  const inserts: Record<string, any[]> = {};
  const updates: { table: any; vals: any }[] = [];
  const deletes: any[] = [];
  const propertyRow = "propertyRow" in opts ? opts.propertyRow : { id: 1, name: "Immeuble A" };
  const loanRow = "loanRow" in opts ? opts.loanRow : {
    id: 200,
    organizationId: ORG,
    propertyId: 1,
    unitId: null,
    currencyId: 1,
    principalAmount: "100000.00",
    status: "active",
    isActive: 1,
    startDate: "2026-01-01",
  };
  const loanRows = opts.loanRows ?? (loanRow ? [loanRow] : []);
  const paymentAggRows = opts.paymentAggRows ?? [];
  const currencyRows = opts.currencyRows ?? [];

  const tableName = (table: any) => {
    if (table === realEstateProperties) return "properties";
    if (table === realEstateMortgageLoans) return "loans";
    if (table === realEstateMortgagePayments) return "payments";
    if (table === currencies) return "currencies";
    return "other";
  };

  const db: any = {
    insert: (table: any) => ({
      values: (vals: any) => {
        const name = tableName(table);
        inserts[name] = inserts[name] || [];
        inserts[name].push(vals);
        return Promise.resolve([{ insertId: name === "loans" ? 200 : 1 }]);
      },
    }),
    update: (table: any) => ({
      set: (vals: any) => ({
        where: () => {
          updates.push({ table, vals });
          return Promise.resolve();
        },
      }),
    }),
    delete: (table: any) => {
      deletes.push(table);
      return { where: () => Promise.resolve() };
    },
    select: (_cols?: any) => ({
      from: (table: any) => {
        const name = tableName(table);
        if (name === "payments") {
          // Requete d'agregation (groupBy) utilisee par attachMortgageBalances.
          return {
            where: () => ({
              groupBy: () => Promise.resolve(paymentAggRows),
            }),
          };
        }
        if (name === "currencies") {
          return {
            where: () => Promise.resolve(currencyRows),
          };
        }
        const terminal = () => ({
          where: () => ({
            limit: () => {
              if (name === "properties") return Promise.resolve(propertyRow ? [propertyRow] : []);
              if (name === "loans") return Promise.resolve(loanRow ? [loanRow] : []);
              return Promise.resolve([]);
            },
            orderBy: () => Promise.resolve(loanRows),
          }),
          leftJoin: () => terminal(),
        });
        return terminal();
      },
    }),
  };

  const realtime: any = { publishDataUpdated: jest.fn().mockResolvedValue(undefined) };
  const emails: any = {};
  const sms: any = {};
  const ledgerPost = jest.fn().mockResolvedValue({ id: 999 });
  const ledger: any = { post: ledgerPost };
  const workflowSubmit = jest.fn().mockResolvedValue({ id: 1, status: "pending" });
  const workflow: any = { submit: workflowSubmit };
  const projectsCreate = jest.fn().mockResolvedValue({ id: 77, updated: false });
  const projects: any = { create: projectsCreate };
  const objectStorage: any = {};
  const whatsapp: any = {};

  const service = new PropertyManagementService(
    db,
    realtime,
    emails,
    sms,
    ledger,
    workflow,
    projects,
    objectStorage,
    whatsapp,
    {} as any,
  {} as any,
  );

  return { service, db, inserts, updates, deletes, ledgerPost, workflowSubmit };
}

const baseInput = (overrides: Partial<any> = {}) => ({
  propertyId: 1,
  principalAmount: 100000,
  currencyId: 1,
  startDate: "2026-01-01",
  ...overrides,
});

describe("PropertyManagementService — getMortgageLoan (solde restant du)", () => {
  it("calcule remainingBalance = principal - paiements de la meme devise (cas simple)", async () => {
    const { service } = makeService({
      loanRow: { id: 200, organizationId: ORG, propertyId: 1, unitId: null, currencyId: 1, principalAmount: "100000.00", status: "active", isActive: 1, startDate: "2026-01-01" },
      paymentAggRows: [{ mortgageId: 200, currencyId: 1, total: "15000.00" }],
    });
    const loan = await service.getMortgageLoan(200, ORG);
    expect(loan.principalRepaid).toBe("15000");
    expect(loan.remainingBalance).toBe("85000");
    expect(loan.otherCurrencyPayments).toEqual([]);
  });

  it("ne descend jamais sous 0 meme si les paiements depassent le principal", async () => {
    const { service } = makeService({
      loanRow: { id: 200, organizationId: ORG, propertyId: 1, unitId: null, currencyId: 1, principalAmount: "1000.00", status: "active", isActive: 1, startDate: "2026-01-01" },
      paymentAggRows: [{ mortgageId: 200, currencyId: 1, total: "1500.00" }],
    });
    const loan = await service.getMortgageLoan(200, ORG);
    expect(loan.remainingBalance).toBe("0");
  });

  it("isole strictement par devise : un paiement CDF sur un pret USD n'affecte PAS le solde, apparait dans otherCurrencyPayments", async () => {
    const { service } = makeService({
      loanRow: { id: 200, organizationId: ORG, propertyId: 1, unitId: null, currencyId: 1, principalAmount: "100000.00", status: "active", isActive: 1, startDate: "2026-01-01" },
      paymentAggRows: [
        { mortgageId: 200, currencyId: 2, total: "50000.00" }, // devise 2 = CDF, pret en devise 1 = USD
      ],
      currencyRows: [{ id: 2, currencyCode: "CDF" }],
    });
    const loan = await service.getMortgageLoan(200, ORG);
    // Aucun paiement de la meme devise -> repaid = 0, solde = principal intact.
    expect(loan.principalRepaid).toBe("0");
    expect(loan.remainingBalance).toBe("100000");
    expect(loan.otherCurrencyPayments).toHaveLength(1);
    expect(loan.otherCurrencyPayments[0]).toMatchObject({ currencyId: 2, currencyCode: "CDF", total: "50000" });
  });

  it("404 si le pret n'existe pas / n'appartient pas a l'organisation", async () => {
    const { service } = makeService({ loanRow: null });
    await expect(service.getMortgageLoan(999, ORG)).rejects.toThrow(NotFoundException);
  });
});

describe("PropertyManagementService — listMortgageLoans", () => {
  it("retourne le solde calcule pour chaque pret de la liste", async () => {
    const { service } = makeService({
      loanRows: [
        { id: 200, organizationId: ORG, propertyId: 1, unitId: null, currencyId: 1, principalAmount: "100000.00", status: "active", isActive: 1, startDate: "2026-01-01" },
      ],
      paymentAggRows: [{ mortgageId: 200, currencyId: 1, total: "20000.00" }],
    });
    const loans = await service.listMortgageLoans(ORG, {});
    expect(loans).toHaveLength(1);
    expect(loans[0].remainingBalance).toBe("80000");
  });
});

describe("PropertyManagementService — createMortgageLoan", () => {
  it("rejette si la propriete n'existe pas / n'est pas active", async () => {
    const { service } = makeService({ propertyRow: null });
    await expect(service.createMortgageLoan(baseInput() as any, ORG)).rejects.toThrow(NotFoundException);
  });

  it("cree l'enregistrement avec isActive=1 et status par defaut 'active'", async () => {
    const { service, inserts } = makeService();
    await service.createMortgageLoan(baseInput() as any, ORG, 7);
    const loanInsert = inserts.loans[0];
    expect(loanInsert.isActive).toBe(1);
    expect(loanInsert.status).toBe("active");
    expect(loanInsert.propertyId).toBe(1);
    expect(loanInsert.createdBy).toBe(7);
    expect(loanInsert.principalAmount).toBe("100000");
  });

  it("ne rattache PAS les paiements orphelins si attachExistingPayments est absent", async () => {
    const { service, updates } = makeService();
    await service.createMortgageLoan(baseInput() as any, ORG, 7);
    const paymentUpdate = updates.find((u) => u.table === realEstateMortgagePayments);
    expect(paymentUpdate).toBeUndefined();
  });

  it("rattache les paiements orphelins de la meme propriete/devise si attachExistingPayments=true", async () => {
    const { service, updates } = makeService();
    await service.createMortgageLoan(baseInput({ attachExistingPayments: true }) as any, ORG, 7);
    const paymentUpdate = updates.find((u) => u.table === realEstateMortgagePayments);
    expect(paymentUpdate).toBeDefined();
    expect(paymentUpdate?.vals.mortgageId).toBe(200);
  });
});

describe("PropertyManagementService — updateMortgageLoan", () => {
  it("rejette si le pret n'appartient pas a l'organisation / n'existe pas", async () => {
    const { service } = makeService({ loanRow: null });
    await expect(service.updateMortgageLoan(999, { status: "paid_off" } as any, ORG)).rejects.toThrow(
      NotFoundException,
    );
  });

  it("applique le patch (whitelist des champs modifiables)", async () => {
    const { service, updates } = makeService();
    await service.updateMortgageLoan(200, { status: "paid_off" } as any, ORG);
    const loanUpdate = updates.find((u) => u.table === realEstateMortgageLoans);
    expect(loanUpdate).toBeDefined();
    expect(loanUpdate?.vals.status).toBe("paid_off");
  });
});

describe("PropertyManagementService — deleteMortgageLoan", () => {
  it("fait un soft delete (isActive=0) et n'appelle jamais .delete() sur le client Drizzle", async () => {
    const { service, updates, deletes } = makeService();
    await service.deleteMortgageLoan(200, ORG);

    expect(deletes).toHaveLength(0);
    const loanUpdate = updates.find((u) => u.table === realEstateMortgageLoans);
    expect(loanUpdate?.vals.isActive).toBe(0);
  });

  it("rejette si le pret n'appartient pas a l'organisation / n'existe pas", async () => {
    const { service } = makeService({ loanRow: null });
    await expect(service.deleteMortgageLoan(999, ORG)).rejects.toThrow(NotFoundException);
  });
});
