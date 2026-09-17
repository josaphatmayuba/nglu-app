import { BadRequestException, NotFoundException } from "@nestjs/common";
import { PropertyManagementService } from "./property-management.service";
import { realEstateProperties, realEstateMortgagePayments, subAccounts } from "../database/schema";
import { MORTGAGE_AMOUNT_TOLERANCE } from "./dto/property-management.dto";

// Remboursement hypothecaire par propriete (SCRUM-311) — Tests cibles (pas de
// couverture exhaustive) : invariant total=capital+interets+escrow, creation
// (routage compte + ledger 3/4 lignes + workflow), update (re-validation sur
// etat fusionne), soft delete, filtres de liste. Meme pattern de mock que
// property-expenses.spec.ts (SCRUM-310).

const ORG = 1;

function makeService(opts: {
  propertyRow?: any;
  paymentRow?: any;
  subAccountRow?: any;
  projectExisting?: any;
} = {}) {
  const inserts: Record<string, any[]> = {};
  const updates: { table: any; vals: any }[] = [];
  const deletes: any[] = [];
  const propertyRow = "propertyRow" in opts ? opts.propertyRow : { id: 1, name: "Immeuble A" };
  // Par defaut : le paiement "existe" une fois cree (re-lecture par getMortgagePayment
  // en fin de create/update/delete). Les tests qui veulent simuler un paiement
  // introuvable passent explicitement paymentRow: null.
  const paymentRow = "paymentRow" in opts ? opts.paymentRow : {
    id: 100,
    organizationId: ORG,
    isActive: 1,
    totalAmount: "1200.00",
    principalAmount: "800.00",
    interestAmount: "400.00",
    escrowAmount: "0.00",
  };
  const subAccountRow = opts.subAccountRow ?? null;

  const tableName = (table: any) => {
    if (table === realEstateProperties) return "properties";
    if (table === realEstateMortgagePayments) return "payments";
    if (table === subAccounts) return "subAccounts";
    return "other";
  };

  const db: any = {
    insert: (table: any) => ({
      values: (vals: any) => {
        const name = tableName(table);
        inserts[name] = inserts[name] || [];
        inserts[name].push(vals);
        return Promise.resolve([{ insertId: name === "payments" ? 100 : name === "subAccounts" ? 55 : 1 }]);
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
        const terminal = () => ({
          where: () => ({
            limit: () => {
              if (name === "properties") return Promise.resolve(propertyRow ? [propertyRow] : []);
              if (name === "payments") return Promise.resolve(paymentRow ? [paymentRow] : []);
              if (name === "subAccounts") return Promise.resolve(subAccountRow ? [subAccountRow] : []);
              return Promise.resolve([]);
            },
            orderBy: () => Promise.resolve(paymentRow ? [paymentRow] : []),
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
  const projectsCreate = jest.fn().mockResolvedValue(opts.projectExisting ?? { id: 77, updated: false });
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

  return { service, db, inserts, updates, deletes, ledgerPost, workflowSubmit, projectsCreate };
}

const baseInput = (overrides: Partial<any> = {}) => ({
  propertyId: 1,
  paymentDate: "2026-09-15",
  totalAmount: 1200,
  principalAmount: 800,
  interestAmount: 400,
  escrowAmount: 0,
  paymentMethod: "bank" as const,
  ...overrides,
});

describe("PropertyManagementService — assertMortgageAmountsConsistent (invariant)", () => {
  const callAssert = (service: any, total: number, principal: number, interest: number, escrow: number) =>
    (service as any).assertMortgageAmountsConsistent(total, principal, interest, escrow);

  it("rejette si capital + interets + escrow != total au-dela de la tolerance", () => {
    const { service } = makeService();
    expect(() => callAssert(service, 1200, 800, 300, 0)).toThrow(BadRequestException);
  });

  it("accepte si la somme egale exactement le total", () => {
    const { service } = makeService();
    expect(() => callAssert(service, 1200, 800, 400, 0)).not.toThrow();
  });

  it("accepte si l'ecart est dans la tolerance (0.01)", () => {
    const { service } = makeService();
    expect(() => callAssert(service, 1200, 800, 400, MORTGAGE_AMOUNT_TOLERANCE)).not.toThrow();
  });

  it("rejette si l'ecart depasse legerement la tolerance", () => {
    const { service } = makeService();
    expect(() => callAssert(service, 1200, 800, 400.02, 0)).toThrow(BadRequestException);
  });

  it("accepte le cas standard 3 lignes (escrow=0)", () => {
    const { service } = makeService();
    expect(() => callAssert(service, 1200, 900, 300, 0)).not.toThrow();
  });

  it("accepte avec escrow > 0 (4 lignes)", () => {
    const { service } = makeService();
    expect(() => callAssert(service, 1300, 800, 400, 100)).not.toThrow();
  });
});

describe("PropertyManagementService — createMortgagePayment", () => {
  it("rejette si la propriete n'existe pas / n'est pas active", async () => {
    const { service } = makeService({ propertyRow: null });
    await expect(service.createMortgagePayment(baseInput() as any, ORG)).rejects.toThrow(NotFoundException);
  });

  it("rejette si les montants sont incoherents avant tout insert", async () => {
    const { service, inserts } = makeService();
    await expect(
      service.createMortgagePayment(baseInput({ interestAmount: 300 }) as any, ORG),
    ).rejects.toThrow(BadRequestException);
    expect(inserts.payments).toBeUndefined();
  });

  it("cree l'enregistrement avec isActive=1", async () => {
    const { service, inserts } = makeService();
    await service.createMortgagePayment(baseInput() as any, ORG, 7);
    const paymentInsert = inserts.payments[0];
    expect(paymentInsert.isActive).toBe(1);
    expect(paymentInsert.propertyId).toBe(1);
    expect(paymentInsert.createdBy).toBe(7);
  });

  it("appelle getOrCreatePropertyProject et propage projectId sur l'insert", async () => {
    const { service, inserts, projectsCreate } = makeService();
    await service.createMortgagePayment(baseInput() as any, ORG, 7);

    expect(projectsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ sourceSystem: "property", externalRef: "1" }),
      ORG,
      7,
    );
    expect(inserts.payments[0].projectId).toBe(77);
  });

  it("poste 3 lignes au ledger si escrow=0 (DEBIT Liability capital, DEBIT Expense interets, CREDIT tresorerie)", async () => {
    const { service, ledgerPost } = makeService();
    await service.createMortgagePayment(baseInput({ escrowAmount: 0 }) as any, ORG, 7);

    const [entry] = ledgerPost.mock.calls[0];
    expect(entry.lines).toHaveLength(3);

    const debitLines = entry.lines.filter((l: any) => l.side === "DEBIT");
    expect(debitLines).toHaveLength(2);
    expect(debitLines[0].amount).toBe(800);
    expect(debitLines[1].amount).toBe(400);

    const creditLine = entry.lines.find((l: any) => l.side === "CREDIT");
    expect(creditLine.amount).toBe(1200);
  });

  it("poste 4 lignes au ledger si escrow>0 (ligne supplementaire DEBIT Expense escrow)", async () => {
    const { service, ledgerPost } = makeService();
    await service.createMortgagePayment(
      baseInput({ totalAmount: 1300, principalAmount: 800, interestAmount: 400, escrowAmount: 100 }) as any,
      ORG,
      7,
    );

    const [entry] = ledgerPost.mock.calls[0];
    expect(entry.lines).toHaveLength(4);

    const debitLines = entry.lines.filter((l: any) => l.side === "DEBIT");
    expect(debitLines).toHaveLength(3);
    const escrowLine = debitLines.find((l: any) => l.amount === 100);
    expect(escrowLine).toBeDefined();
    expect(escrowLine.description).toMatch(/escrow/i);
  });

  it("cree/route les sous-comptes canoniques : Liability 'Emprunts hypothecaires' et Expense 'Interets demprunt'", async () => {
    const { service, inserts } = makeService();
    await service.createMortgagePayment(baseInput() as any, ORG, 7);

    const subAccountInserts = inserts.subAccounts ?? [];
    const names = subAccountInserts.map((s: any) => s.name);
    expect(names).toContain("Emprunts hypothecaires");
    expect(names).toContain("Interets demprunt");

    const liabilityInsert = subAccountInserts.find((s: any) => s.name === "Emprunts hypothecaires");
    expect(liabilityInsert.accountId).toBe(2); // 2 = Liability
    const interestInsert = subAccountInserts.find((s: any) => s.name === "Interets demprunt");
    expect(interestInsert.accountId).toBe(6); // 6 = Expense
  });

  it("route l'escrow vers le compte de charge canonique 'Frais de bureau et divers'", async () => {
    const { service, inserts } = makeService();
    await service.createMortgagePayment(
      baseInput({ totalAmount: 1300, principalAmount: 800, interestAmount: 400, escrowAmount: 100 }) as any,
      ORG,
      7,
    );
    const escrowInsert = inserts.subAccounts?.find((s: any) => s.name === "Frais de bureau et divers");
    expect(escrowInsert).toBeDefined();
    expect(escrowInsert.accountId).toBe(6); // 6 = Expense
  });

  it("porte projectId sur les lignes de charge/passif mais PAS sur la ligne de credit tresorerie", async () => {
    const { service, ledgerPost } = makeService();
    await service.createMortgagePayment(
      baseInput({ totalAmount: 1300, principalAmount: 800, interestAmount: 400, escrowAmount: 100 }) as any,
      ORG,
      7,
    );
    const [entry] = ledgerPost.mock.calls[0];
    const debitLines = entry.lines.filter((l: any) => l.side === "DEBIT");
    const creditLine = entry.lines.find((l: any) => l.side === "CREDIT");

    for (const line of debitLines) {
      expect(line.projectId).toBe(77);
    }
    expect(creditLine.projectId).toBeUndefined();
  });

  it("credite Bank (id 2) si paymentMethod=bank (defaut), Cash (id 1) sinon", async () => {
    const { service: bankService, ledgerPost: bankPost } = makeService();
    await bankService.createMortgagePayment(baseInput({ paymentMethod: "bank" }) as any, ORG, 7);
    const bankCredit = bankPost.mock.calls[0][0].lines.find((l: any) => l.side === "CREDIT");
    expect(bankCredit.accountId).toBe(2);

    const { service: cashService, ledgerPost: cashPost } = makeService();
    await cashService.createMortgagePayment(baseInput({ paymentMethod: "cash" }) as any, ORG, 7);
    const cashCredit = cashPost.mock.calls[0][0].lines.find((l: any) => l.side === "CREDIT");
    expect(cashCredit.accountId).toBe(1);
  });

  it("poste au ledger avec sourceModule=mortgage_payment, idempotencyKey base sur l'id et reference MORTPAY-<id>", async () => {
    const { service, ledgerPost } = makeService();
    await service.createMortgagePayment(baseInput() as any, ORG, 7);
    const [entry, orgId, userId] = ledgerPost.mock.calls[0];
    expect(entry.sourceModule).toBe("mortgage_payment");
    expect(entry.idempotencyKey).toBe("mortgage-payment:100");
    expect(entry.relatedId).toBe("100");
    expect(entry.reference).toBe("MORTPAY-100");
    expect(orgId).toBe(ORG);
    expect(userId).toBe(7);
  });

  it("soumet au workflow d'approbation exp_approval avec entityType=mortgage_payment", async () => {
    const { service, workflowSubmit } = makeService();
    await service.createMortgagePayment(baseInput() as any, ORG, 7);
    const [input, orgId] = workflowSubmit.mock.calls[0];
    expect(input.workflowKey).toBe("exp_approval");
    expect(input.entityType).toBe("mortgage_payment");
    expect(input.entityId).toBe("100");
    expect(orgId).toBe(ORG);
  });

  it("ne bloque pas la creation du paiement si le ledger ou le workflow echouent (best-effort)", async () => {
    const { service } = makeService();
    const failingLedger: any = { post: jest.fn().mockRejectedValue(new Error("ledger down")) };
    const failingWorkflow: any = { submit: jest.fn().mockRejectedValue(new Error("workflow down")) };
    (service as any).ledger = failingLedger;
    (service as any).workflow = failingWorkflow;
    await expect(service.createMortgagePayment(baseInput() as any, ORG, 7)).resolves.toBeDefined();
  });
});

describe("PropertyManagementService — updateMortgagePayment", () => {
  it("re-valide la coherence sur l'etat fusionne : un PATCH partiel qui casse l'invariant est rejete", async () => {
    // En base : total=1200, principal=800, interest=400, escrow=0.
    // On ne patch que interestAmount -> 300, ce qui casse 800+300+0 != 1200.
    const { service } = makeService();
    await expect(
      service.updateMortgagePayment(100, { interestAmount: 300 } as any, ORG),
    ).rejects.toThrow(BadRequestException);
  });

  it("accepte un PATCH partiel qui preserve l'invariant en combinant avec les valeurs en base", async () => {
    const { service, updates } = makeService();
    await service.updateMortgagePayment(100, { principalAmount: 800 } as any, ORG);
    const paymentUpdate = updates.find((u) => u.table === realEstateMortgagePayments);
    expect(paymentUpdate).toBeDefined();
  });

  it("accepte un PATCH qui modifie coherememnt plusieurs montants a la fois", async () => {
    const { service, updates } = makeService();
    await service.updateMortgagePayment(
      100,
      { totalAmount: 1300, principalAmount: 800, interestAmount: 400, escrowAmount: 100 } as any,
      ORG,
    );
    const paymentUpdate = updates.find((u) => u.table === realEstateMortgagePayments);
    expect(paymentUpdate?.vals.totalAmount).toBe("1300");
    expect(paymentUpdate?.vals.escrowAmount).toBe("100");
  });

  it("rejette si le paiement n'appartient pas a l'organisation / n'existe pas", async () => {
    const { service } = makeService({ paymentRow: null });
    await expect(service.updateMortgagePayment(999, { principalAmount: 800 } as any, ORG)).rejects.toThrow(
      NotFoundException,
    );
  });
});

describe("PropertyManagementService — deleteMortgagePayment", () => {
  it("fait un soft delete (isActive=0) et n'appelle jamais .delete() sur le client Drizzle", async () => {
    const { service, updates, deletes } = makeService({ paymentRow: { id: 5, organizationId: ORG } });
    await service.deleteMortgagePayment(5, ORG);

    expect(deletes).toHaveLength(0);
    const paymentUpdate = updates.find((u) => u.table === realEstateMortgagePayments);
    expect(paymentUpdate?.vals.isActive).toBe(0);
  });

  it("rejette si le paiement n'appartient pas a l'organisation / n'existe pas", async () => {
    const { service } = makeService({ paymentRow: null });
    await expect(service.deleteMortgagePayment(999, ORG)).rejects.toThrow(NotFoundException);
  });
});

describe("PropertyManagementService — listMortgagePayments", () => {
  it("filtre par propertyId/dateFrom/dateTo et n'inclut que isActive=1 dans la clause where", async () => {
    const capturedWhere: any[] = [];
    const db: any = {
      select: () => ({
        from: () => ({
          leftJoin: () => ({
            leftJoin: () => ({
              where: (cond: any) => {
                capturedWhere.push(cond);
                return { orderBy: () => Promise.resolve([]) };
              },
            }),
          }),
        }),
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
      {} as any,
      {} as any,
    );
    await service.listMortgagePayments(ORG, {
      propertyId: 3,
      dateFrom: "2026-01-01",
      dateTo: "2026-12-31",
    });
    // Le detail du SQL genere (and(...)) est verifie par les tests
    // d'integration/contract, pas ici : on verifie juste qu'une clause where
    // a bien ete construite et executee.
    expect(capturedWhere.length).toBe(1);
    expect(capturedWhere[0]).toBeDefined();
  });

  it("sans filtres, ne conserve que les conditions org+isActive de base", async () => {
    const capturedWhere: any[] = [];
    const db: any = {
      select: () => ({
        from: () => ({
          leftJoin: () => ({
            leftJoin: () => ({
              where: (cond: any) => {
                capturedWhere.push(cond);
                return { orderBy: () => Promise.resolve([]) };
              },
            }),
          }),
        }),
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
      {} as any,
      {} as any,
    );
    await service.listMortgagePayments(ORG, {});
    expect(capturedWhere.length).toBe(1);
    expect(capturedWhere[0]).toBeDefined();
  });
});
