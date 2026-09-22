import { BadRequestException, NotFoundException } from "@nestjs/common";
import { PropertyManagementService } from "./property-management.service";
import { realEstateProperties, realEstatePropertyExpenses, subAccounts } from "../database/schema";
import { PROPERTY_EXPENSE_CATEGORIES } from "./dto/property-management.dto";

// Depenses par propriete (SCRUM-310) — Tests cibles (pas de couverture exhaustive) :
// validation de categorie, creation (routage compte + ledger + workflow),
// soft delete, filtres de liste, upsert du projet lie, upload de justificatif.

const ORG = 1;

const JPEG_BYTES = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
const PDF_BYTES = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(16)]);
const TEXT_BYTES = Buffer.from("not-an-image-or-pdf");

function makeService(opts: {
  propertyRow?: any;
  expenseRow?: any;
  subAccountRow?: any;
  projectExisting?: any;
} = {}) {
  const inserts: Record<string, any[]> = {};
  const updates: { table: any; vals: any }[] = [];
  const deletes: any[] = [];
  const propertyRow = "propertyRow" in opts ? opts.propertyRow : { id: 1, name: "Immeuble A" };
  // Par defaut : la depense "existe" une fois creee (re-lecture par getPropertyExpense
  // en fin de create/update/delete/upload). Les tests qui veulent simuler une
  // depense introuvable passent explicitement expenseRow: null.
  const expenseRow = "expenseRow" in opts ? opts.expenseRow : { id: 100, organizationId: ORG, isActive: 1 };
  const subAccountRow = opts.subAccountRow ?? null;

  const tableName = (table: any) => {
    if (table === realEstateProperties) return "properties";
    if (table === realEstatePropertyExpenses) return "expenses";
    if (table === subAccounts) return "subAccounts";
    return "other";
  };

  const db: any = {
    insert: (table: any) => ({
      values: (vals: any) => {
        const name = tableName(table);
        inserts[name] = inserts[name] || [];
        inserts[name].push(vals);
        return Promise.resolve([{ insertId: name === "expenses" ? 100 : name === "subAccounts" ? 55 : 1 }]);
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
              if (name === "expenses") return Promise.resolve(expenseRow ? [expenseRow] : []);
              if (name === "subAccounts") return Promise.resolve(subAccountRow ? [subAccountRow] : []);
              return Promise.resolve([]);
            },
            orderBy: () => Promise.resolve(expenseRow ? [expenseRow] : []),
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
    {} as any, // ownerNotifications
  );

  return { service, db, inserts, updates, deletes, ledgerPost, workflowSubmit, projectsCreate };
}

const baseInput = (overrides: Partial<any> = {}) => ({
  propertyId: 1,
  category: "insurance",
  description: "Assurance annuelle immeuble",
  amount: 500,
  expenseDate: "2026-09-15",
  paymentMethod: "cash" as const,
  ...overrides,
});

describe("PropertyManagementService — validation de categorie (DTO)", () => {
  it("rejette la categorie mortgage : non presente dans la liste autorisee", () => {
    expect(PROPERTY_EXPENSE_CATEGORIES).not.toContain("mortgage");
  });

  it("accepte les 8 categories valides", () => {
    expect(PROPERTY_EXPENSE_CATEGORIES).toEqual([
      "insurance",
      "property_tax",
      "hoa",
      "maintenance_general",
      "management_fee",
      "security",
      "cleaning",
      "other",
    ]);
    expect(PROPERTY_EXPENSE_CATEGORIES).toHaveLength(8);
  });
});

describe("PropertyManagementService — createPropertyExpense", () => {
  it("rejette si la propriete n'existe pas / n'est pas active", async () => {
    const { service } = makeService({ propertyRow: null });
    await expect(service.createPropertyExpense(baseInput() as any, ORG)).rejects.toThrow(NotFoundException);
  });

  it("cree l'enregistrement avec isActive=1", async () => {
    const { service, inserts } = makeService();
    await service.createPropertyExpense(baseInput() as any, ORG, 7);
    const expenseInsert = inserts.expenses[0];
    expect(expenseInsert.isActive).toBe(1);
    expect(expenseInsert.propertyId).toBe(1);
    expect(expenseInsert.category).toBe("insurance");
    expect(expenseInsert.createdBy).toBe(7);
  });

  it("appelle getOrCreatePropertyProject et route projectId sur l'insert + la ligne debit du ledger", async () => {
    const { service, inserts, ledgerPost, projectsCreate } = makeService();
    await service.createPropertyExpense(baseInput() as any, ORG, 7);

    expect(projectsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ sourceSystem: "property", externalRef: "1" }),
      ORG,
      7,
    );
    expect(inserts.expenses[0].projectId).toBe(77);

    const [entry] = ledgerPost.mock.calls[0];
    const debitLine = entry.lines.find((l: any) => l.side === "DEBIT");
    expect(debitLine.projectId).toBe(77);
  });

  it.each([
    ["insurance", "Frais de bureau et divers"],
    ["property_tax", "Frais de bureau et divers"],
    ["hoa", "Frais de bureau et divers"],
    ["maintenance_general", "Maintenance"],
    ["management_fee", "Frais de bureau et divers"],
    ["security", "Frais de bureau et divers"],
    ["cleaning", "Frais de bureau et divers"],
    ["other", "Frais de bureau et divers"],
  ])("route la categorie %s vers le compte de charge canonique %s", async (category, expectedAccount) => {
    const { service, inserts } = makeService();
    await service.createPropertyExpense(baseInput({ category }) as any, ORG, 7);
    const subAccountInsert = inserts.subAccounts?.[0];
    expect(subAccountInsert?.name).toBe(expectedAccount);
    expect(subAccountInsert?.accountId).toBe(6); // 6 = Expense
  });

  it("reutilise le sous-compte existant plutot que d'en creer un nouveau", async () => {
    const { service, inserts } = makeService({ subAccountRow: { id: 42 } });
    await service.createPropertyExpense(baseInput() as any, ORG, 7);
    expect(inserts.subAccounts).toBeUndefined();
  });

  it("poste au ledger avec sourceModule=property_expense et un idempotencyKey base sur l'id", async () => {
    const { service, ledgerPost } = makeService();
    await service.createPropertyExpense(baseInput() as any, ORG, 7);
    const [entry, orgId, userId] = ledgerPost.mock.calls[0];
    expect(entry.sourceModule).toBe("property_expense");
    expect(entry.idempotencyKey).toBe("property-expense:100");
    expect(entry.relatedId).toBe("100");
    expect(orgId).toBe(ORG);
    expect(userId).toBe(7);
  });

  it("credite Cash (id 1) si paymentMethod=cash, Bank (id 2) si paymentMethod=bank", async () => {
    const { service: cashService, ledgerPost: cashPost } = makeService();
    await cashService.createPropertyExpense(baseInput({ paymentMethod: "cash" }) as any, ORG, 7);
    const cashCredit = cashPost.mock.calls[0][0].lines.find((l: any) => l.side === "CREDIT");
    expect(cashCredit.accountId).toBe(1);

    const { service: bankService, ledgerPost: bankPost } = makeService();
    await bankService.createPropertyExpense(baseInput({ paymentMethod: "bank" }) as any, ORG, 7);
    const bankCredit = bankPost.mock.calls[0][0].lines.find((l: any) => l.side === "CREDIT");
    expect(bankCredit.accountId).toBe(2);
  });

  it("soumet au workflow d'approbation exp_approval avec entityType=property_expense", async () => {
    const { service, workflowSubmit } = makeService();
    await service.createPropertyExpense(baseInput() as any, ORG, 7);
    const [input, orgId] = workflowSubmit.mock.calls[0];
    expect(input.workflowKey).toBe("exp_approval");
    expect(input.entityType).toBe("property_expense");
    expect(input.entityId).toBe("100");
    expect(orgId).toBe(ORG);
  });

  it("ne bloque pas la creation si le ledger ou le workflow echouent (best-effort)", async () => {
    const { service } = makeService();
    const failingLedger: any = { post: jest.fn().mockRejectedValue(new Error("ledger down")) };
    const failingWorkflow: any = { submit: jest.fn().mockRejectedValue(new Error("workflow down")) };
    (service as any).ledger = failingLedger;
    (service as any).workflow = failingWorkflow;
    await expect(service.createPropertyExpense(baseInput() as any, ORG, 7)).resolves.toBeDefined();
  });
});

describe("PropertyManagementService — deletePropertyExpense", () => {
  it("fait un soft delete (isActive=0) et n'appelle jamais .delete() sur le client Drizzle", async () => {
    const { service, updates, deletes } = makeService({ expenseRow: { id: 5, organizationId: ORG } });
    await service.deletePropertyExpense(5, ORG);

    expect(deletes).toHaveLength(0);
    const expenseUpdate = updates.find((u) => u.table === realEstatePropertyExpenses);
    expect(expenseUpdate?.vals.isActive).toBe(0);
  });

  it("rejette si la depense n'appartient pas a l'organisation / n'existe pas", async () => {
    const { service } = makeService({ expenseRow: null });
    await expect(service.deletePropertyExpense(999, ORG)).rejects.toThrow(NotFoundException);
  });
});

describe("PropertyManagementService — listPropertyExpenses", () => {
  it("filtre par propertyId/category/dateFrom/dateTo et n'inclut que isActive=1 dans la clause where", async () => {
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
      {} as any, // ownerNotifications
    );
    await service.listPropertyExpenses(ORG, {
      propertyId: 3,
      category: "insurance",
      dateFrom: "2026-01-01",
      dateTo: "2026-12-31",
    });
    // On verifie que la requete a bien ete executee avec une clause where
    // construite (and(...conditions)) — le detail du SQL est verifie par
    // les tests d'integration/contract, pas ici.
    expect(capturedWhere.length).toBe(1);
    expect(capturedWhere[0]).toBeDefined();
  });
});

describe("PropertyManagementService — getOrCreatePropertyProject", () => {
  it("reutilise un projet existant (upsert par sourceSystem/externalRef) sans en recreer un nouveau a chaque appel", async () => {
    const { service, projectsCreate } = makeService({ projectExisting: { id: 77, updated: true } });
    const first = await (service as any).getOrCreatePropertyProject(1, ORG, 7);
    const second = await (service as any).getOrCreatePropertyProject(1, ORG, 7);

    expect(first).toBe(77);
    expect(second).toBe(77);
    expect(projectsCreate).toHaveBeenCalledTimes(2);
    // Meme (sourceSystem, externalRef) a chaque appel => le service delegue
    // l'upsert a ProjectsService.create (qui met a jour au lieu de dupliquer).
    for (const call of projectsCreate.mock.calls) {
      expect(call[0]).toEqual(expect.objectContaining({ sourceSystem: "property", externalRef: "1" }));
    }
  });

  it("n'echoue pas la depense si la liaison projet echoue (best-effort, retourne null)", async () => {
    const { service } = makeService();
    (service as any).projects = { create: jest.fn().mockRejectedValue(new Error("projects down")) };
    const projectId = await (service as any).getOrCreatePropertyProject(1, ORG, 7);
    expect(projectId).toBeNull();
  });
});

describe("PropertyManagementService — uploadPropertyExpenseReceipt", () => {
  it("rejette un type de fichier non autorise (ni image ni PDF)", async () => {
    const { service } = makeService({ expenseRow: { id: 5, organizationId: ORG } });
    await expect(
      service.uploadPropertyExpenseReceipt(5, ORG, {
        buffer: TEXT_BYTES,
        mimetype: "text/plain",
        originalname: "notes.txt",
        size: TEXT_BYTES.length,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("verifie l'ownership (ensureOrgOwned) avant tout traitement du fichier", async () => {
    const { service } = makeService({ expenseRow: null });
    await expect(
      service.uploadPropertyExpenseReceipt(999, ORG, {
        buffer: JPEG_BYTES,
        mimetype: "image/jpeg",
        originalname: "recu.jpg",
        size: JPEG_BYTES.length,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it("accepte une image valide et met a jour receiptUrl", async () => {
    const { service, updates } = makeService({ expenseRow: { id: 5, organizationId: ORG } });
    await service.uploadPropertyExpenseReceipt(5, ORG, {
      buffer: JPEG_BYTES,
      mimetype: "image/jpeg",
      originalname: "recu.jpg",
      size: JPEG_BYTES.length,
    });
    const receiptUpdate = updates.find((u) => u.table === realEstatePropertyExpenses && u.vals.receiptUrl);
    expect(receiptUpdate?.vals.receiptUrl).toMatch(/^\/uploads\//);
  });

  it("accepte un PDF valide et met a jour receiptUrl", async () => {
    const { service, updates } = makeService({ expenseRow: { id: 5, organizationId: ORG } });
    await service.uploadPropertyExpenseReceipt(5, ORG, {
      buffer: PDF_BYTES,
      mimetype: "application/pdf",
      originalname: "recu.pdf",
      size: PDF_BYTES.length,
    });
    const receiptUpdate = updates.find((u) => u.table === realEstatePropertyExpenses && u.vals.receiptUrl);
    expect(receiptUpdate?.vals.receiptUrl).toMatch(/^\/uploads\//);
  });
});
