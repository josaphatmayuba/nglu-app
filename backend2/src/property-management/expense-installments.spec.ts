import { BadRequestException, NotFoundException } from "@nestjs/common";
import { PropertyManagementService } from "./property-management.service";
import { realEstateExpenseInstallments, realEstatePropertyExpenses } from "../database/schema";

// Echeancier de paiement des depenses de propriete (SCRUM-313) — Tests cibles :
// generation avec arrondi exact, clamp fin de mois, refus de regeneration si
// paiement existant, recalcul settledAmount/paymentStatus, soft delete only,
// non-regression du mode 'single' (aucune installment generee).

const ORG = 1;

function makeService(opts: {
  expenseRow?: any;
  installmentRows?: any[];
  installmentRow?: any;
} = {}) {
  const inserts: Record<string, any[]> = {};
  const updates: { table: any; vals: any }[] = [];
  const deletes: any[] = [];

  const expenseRow =
    "expenseRow" in opts
      ? opts.expenseRow
      : {
          id: 100,
          organizationId: ORG,
          isActive: 1,
          propertyId: 1,
          amount: "1200.00",
          expenseDate: "2026-01-31",
          currencyId: 1,
          paymentStatus: "paid",
        };

  // installmentRows = liste renvoyee par les select "liste" (listExpenseInstallments / regeneration / recalc)
  let installmentRows = opts.installmentRows ?? [];
  // installmentRow = ligne renvoyee par les select "single" (findActiveInstallmentForOrg)
  const installmentRow = opts.installmentRow ?? null;

  const tableName = (table: any) => {
    if (table === realEstatePropertyExpenses) return "expenses";
    if (table === realEstateExpenseInstallments) return "installments";
    return "other";
  };

  const db: any = {
    insert: (table: any) => ({
      values: (vals: any) => {
        const name = tableName(table);
        inserts[name] = inserts[name] || [];
        if (Array.isArray(vals)) {
          inserts[name].push(...vals);
        } else {
          inserts[name].push(vals);
        }
        return Promise.resolve([{ insertId: 500 }]);
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
        return {
          where: () => {
            // Le service appelle soit `.where(...)` directement (await la liste
            // complete des installments actifs, cas recalcExpenseSettlement),
            // soit `.where(...).limit(1)` (lecture single), soit
            // `.where(...).orderBy(...)` (listExpenseInstallments). On expose
            // les trois formes sur le meme objet thenable.
            const listResult = name === "installments" ? installmentRows : [];
            return {
              then: (resolve: any, reject: any) => Promise.resolve(listResult).then(resolve, reject),
              limit: () => {
                if (name === "expenses") return Promise.resolve(expenseRow ? [expenseRow] : []);
                if (name === "installments") {
                  return Promise.resolve(installmentRow ? [installmentRow] : []);
                }
                return Promise.resolve([]);
              },
              orderBy: () => Promise.resolve(installmentRows),
            };
          },
        };
      },
    }),
  };

  const service = new PropertyManagementService(
    db,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  );

  return { service, db, inserts, updates, deletes, setInstallmentRows: (rows: any[]) => (installmentRows = rows) };
}

describe("PropertyManagementService — generateExpenseInstallments", () => {
  it("genere N echeances avec la derniere absorbant le reliquat d'arrondi (invariant somme exacte)", async () => {
    const { service, inserts } = makeService({
      expenseRow: {
        id: 100,
        organizationId: ORG,
        isActive: 1,
        propertyId: 1,
        amount: "1200.00",
        expenseDate: "2026-01-15",
        currencyId: 1,
        paymentStatus: "paid",
      },
      installmentRows: [],
    });

    await service.generateExpenseInstallments(100, { recurrenceMonths: 7 } as any, ORG, 7);

    const rows = inserts.installments;
    expect(rows).toHaveLength(7);
    const sum = rows.reduce((s, r) => s + Number(r.plannedAmount), 0);
    expect(Math.abs(sum - 1200)).toBeLessThanOrEqual(0.01);
    // 1200 / 7 = 171.42857... -> arrondi 171.43 pour les 6 premieres, dernier absorbe le reste.
    expect(rows[0].plannedAmount).toBe("171.43");
    expect(rows[5].plannedAmount).toBe("171.43");
    const lastPlanned = Number(rows[6].plannedAmount);
    expect(lastPlanned).toBeCloseTo(1200 - 171.43 * 6, 2);
    rows.forEach((r, idx) => {
      expect(r.sequenceNo).toBe(idx + 1);
      expect(r.kind).toBe("scheduled");
      expect(r.status).toBe("pending");
    });
  });

  it("clamp fin de mois : 31 janvier + 1 mois = 28/29 fevrier, jamais 3 mars", async () => {
    const { service, inserts } = makeService({
      expenseRow: {
        id: 100,
        organizationId: ORG,
        isActive: 1,
        propertyId: 1,
        amount: "200.00",
        expenseDate: "2026-01-31",
        currencyId: 1,
        paymentStatus: "paid",
      },
      installmentRows: [],
    });

    await service.generateExpenseInstallments(100, { recurrenceMonths: 3 } as any, ORG, 7);

    const rows = inserts.installments;
    expect(rows[0].dueDate).toBe("2026-01-31");
    // 2026 n'est pas bissextile -> fevrier a 28 jours.
    expect(rows[1].dueDate).toBe("2026-02-28");
    expect(rows[2].dueDate).toBe("2026-03-31");
  });

  it("refuse la regeneration si au moins une echeance a deja un paiement (409/BadRequest)", async () => {
    const { service } = makeService({
      installmentRows: [
        { id: 1, expenseId: 100, sequenceNo: 1, paidAmount: "100.00", isActive: 1 },
        { id: 2, expenseId: 100, sequenceNo: 2, paidAmount: "0.00", isActive: 1 },
      ],
    });

    await expect(
      service.generateExpenseInstallments(100, { recurrenceMonths: 5 } as any, ORG, 7),
    ).rejects.toThrow(BadRequestException);
  });

  it("autorise la regeneration si aucune echeance n'a de paiement (soft-delete puis recreation)", async () => {
    const { service, updates, inserts } = makeService({
      installmentRows: [
        { id: 1, expenseId: 100, sequenceNo: 1, paidAmount: "0.00", isActive: 1 },
        { id: 2, expenseId: 100, sequenceNo: 2, paidAmount: "0.00", isActive: 1 },
      ],
    });

    await service.generateExpenseInstallments(100, { recurrenceMonths: 4 } as any, ORG, 7);

    const softDelete = updates.find((u) => u.table === realEstateExpenseInstallments && u.vals.isActive === 0);
    expect(softDelete).toBeDefined();
    expect(inserts.installments).toHaveLength(4);
  });

  it("rejette si la depense n'existe pas / n'appartient pas a l'organisation", async () => {
    const { service } = makeService({ expenseRow: null });
    await expect(
      service.generateExpenseInstallments(999, { recurrenceMonths: 3 } as any, ORG, 7),
    ).rejects.toThrow(NotFoundException);
  });
});

describe("PropertyManagementService — addExpensePartialPayment", () => {
  it("cree une ligne kind=partial deja payee (status=paid) et recalcule settledAmount/paymentStatus", async () => {
    const { service, inserts, updates } = makeService({
      expenseRow: {
        id: 100,
        organizationId: ORG,
        isActive: 1,
        propertyId: 1,
        amount: "1000.00",
        expenseDate: "2026-01-01",
        currencyId: 1,
        paymentStatus: "paid",
      },
      installmentRows: [{ paidAmount: "300.00" }],
    });

    await service.addExpensePartialPayment(100, { amount: 300, paidDate: "2026-02-01" } as any, ORG, 7);

    const partial = inserts.installments[0];
    expect(partial.kind).toBe("partial");
    expect(partial.sequenceNo).toBe(0);
    expect(partial.dueDate).toBeNull();
    expect(partial.plannedAmount).toBe("0.00");
    expect(partial.paidAmount).toBe("300");
    expect(partial.status).toBe("paid");

    const settlementUpdate = updates.find((u) => u.table === realEstatePropertyExpenses && u.vals.settledAmount !== undefined);
    expect(settlementUpdate?.vals.settledAmount).toBe("300.00");
    expect(settlementUpdate?.vals.paymentStatus).toBe("partial");
  });

  it("marque paymentStatus=paid quand settledAmount atteint le montant total", async () => {
    const { service, updates } = makeService({
      expenseRow: {
        id: 100,
        organizationId: ORG,
        isActive: 1,
        propertyId: 1,
        amount: "500.00",
        expenseDate: "2026-01-01",
        currencyId: 1,
        paymentStatus: "pending",
      },
      installmentRows: [{ paidAmount: "500.00" }],
    });

    await service.addExpensePartialPayment(100, { amount: 500, paidDate: "2026-02-01" } as any, ORG, 7);

    const settlementUpdate = updates.find((u) => u.table === realEstatePropertyExpenses && u.vals.settledAmount !== undefined);
    expect(settlementUpdate?.vals.paymentStatus).toBe("paid");
  });
});

describe("PropertyManagementService — payExpenseInstallment", () => {
  it("marque une echeance payee integralement (status=paid) et recalcule le parent", async () => {
    const { service, updates } = makeService({
      installmentRow: { id: 10, expenseId: 100, organizationId: ORG, isActive: 1, plannedAmount: "171.43", paymentMethod: "cash", reference: null },
      installmentRows: [{ paidAmount: "171.43" }],
    });

    await service.payExpenseInstallment(10, { paidDate: "2026-02-15" } as any, ORG);

    const installmentUpdate = updates.find((u) => u.table === realEstateExpenseInstallments && u.vals.paidAmount);
    expect(installmentUpdate?.vals.paidAmount).toBe("171.43");
    expect(installmentUpdate?.vals.status).toBe("paid");

    const settlementUpdate = updates.find((u) => u.table === realEstatePropertyExpenses && u.vals.settledAmount !== undefined);
    expect(settlementUpdate).toBeDefined();
  });

  it("marque status=partial si le montant paye est inferieur au plannedAmount", async () => {
    const { service, updates } = makeService({
      installmentRow: { id: 10, expenseId: 100, organizationId: ORG, isActive: 1, plannedAmount: "171.43", paymentMethod: "cash", reference: null },
      installmentRows: [{ paidAmount: "50.00" }],
    });

    await service.payExpenseInstallment(10, { amount: 50, paidDate: "2026-02-15" } as any, ORG);

    const installmentUpdate = updates.find((u) => u.table === realEstateExpenseInstallments && u.vals.paidAmount);
    expect(installmentUpdate?.vals.status).toBe("partial");
  });

  it("rejette si l'echeance n'existe pas / n'appartient pas a l'organisation", async () => {
    const { service } = makeService({ installmentRow: null });
    await expect(service.payExpenseInstallment(999, { paidDate: "2026-02-15" } as any, ORG)).rejects.toThrow(
      NotFoundException,
    );
  });
});

describe("PropertyManagementService — updateExpenseInstallment", () => {
  it("refuse la modification d'une echeance deja payee (status != pending)", async () => {
    const { service } = makeService({
      installmentRow: { id: 10, expenseId: 100, organizationId: ORG, isActive: 1, status: "paid" },
    });
    await expect(
      service.updateExpenseInstallment(10, { plannedAmount: 200 } as any, ORG),
    ).rejects.toThrow(BadRequestException);
  });

  it("autorise la modification whitelistee si status=pending", async () => {
    const { service, updates } = makeService({
      installmentRow: { id: 10, expenseId: 100, organizationId: ORG, isActive: 1, status: "pending" },
    });
    await service.updateExpenseInstallment(10, { plannedAmount: 200, dueDate: "2026-05-01" } as any, ORG);
    const update = updates.find((u) => u.table === realEstateExpenseInstallments);
    expect(update?.vals.plannedAmount).toBe("200.00");
    expect(update?.vals.dueDate).toBe("2026-05-01");
  });
});

describe("PropertyManagementService — deleteExpenseInstallment", () => {
  it("fait un soft delete (isActive=0), n'appelle jamais .delete(), et recalcule le parent", async () => {
    const { service, updates, deletes } = makeService({
      installmentRow: { id: 10, expenseId: 100, organizationId: ORG, isActive: 1 },
      installmentRows: [{ paidAmount: "0.00" }],
    });

    await service.deleteExpenseInstallment(10, ORG);

    expect(deletes).toHaveLength(0);
    const installmentSoftDelete = updates.find((u) => u.table === realEstateExpenseInstallments && u.vals.isActive === 0);
    expect(installmentSoftDelete).toBeDefined();
    const settlementUpdate = updates.find((u) => u.table === realEstatePropertyExpenses && u.vals.settledAmount !== undefined);
    expect(settlementUpdate).toBeDefined();
  });
});

describe("PropertyManagementService — createPropertyExpense non-regression (mode single)", () => {
  it("ne genere aucune installment quand paymentPlan est absent ou 'single'", async () => {
    const inserts: Record<string, any[]> = {};
    const updates: any[] = [];
    const expenseRow = { id: 100, organizationId: ORG, isActive: 1, propertyId: 1, name: "Immeuble A" };
    const propertyRow = { id: 1, name: "Immeuble A" };
    const subAccountRow = { id: 42 };

    const db: any = {
      insert: (table: any) => ({
        values: (vals: any) => {
          const name = table === realEstateExpenseInstallments ? "installments" : table === realEstatePropertyExpenses ? "expenses" : "other";
          inserts[name] = inserts[name] || [];
          if (Array.isArray(vals)) inserts[name].push(...vals);
          else inserts[name].push(vals);
          return Promise.resolve([{ insertId: name === "expenses" ? 100 : 1 }]);
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
      select: () => ({
        from: (table: any) => {
          const terminal = () => ({
            where: () => ({
              limit: () => {
                if (table === realEstatePropertyExpenses) return Promise.resolve([expenseRow]);
                if ((table as any).name === undefined) return Promise.resolve([subAccountRow]);
                return Promise.resolve([propertyRow]);
              },
              orderBy: () => Promise.resolve([expenseRow]),
            }),
            leftJoin: () => terminal(),
          });
          return terminal();
        },
      }),
    };

    const ledger: any = { post: jest.fn().mockResolvedValue({ id: 999 }) };
    const workflow: any = { submit: jest.fn().mockResolvedValue({ id: 1 }) };
    const projects: any = { create: jest.fn().mockResolvedValue({ id: 77 }) };

    const service = new PropertyManagementService(
      db,
      {} as any,
      {} as any,
      {} as any,
      ledger,
      workflow,
      projects,
      {} as any,
      {} as any,
    );

    await service.createPropertyExpense(
      {
        propertyId: 1,
        category: "insurance",
        description: "Assurance",
        amount: 500,
        expenseDate: "2026-09-15",
        paymentMethod: "cash",
      } as any,
      ORG,
      7,
    );

    // Comportement historique inchange : aucune ligne installments inseree,
    // paymentPlan par defaut 'single' sur l'insert de la depense.
    expect(inserts.installments).toBeUndefined();
    expect(inserts.expenses[0].paymentPlan).toBe("single");
  });
});
