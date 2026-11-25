import { BadRequestException } from "@nestjs/common";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import { PropertyManagementService } from "./property-management.service";
import { accounts, subAccounts, transactions } from "../database/schema";

// Helper unique de tresorerie Domus (resolveTreasuryAccount) : recherche par nom
// + organization_id, plus petit id si doublon, creation sous la racine Asset de
// l org. Meme compte pour loyer, maintenance (legacy + ledger) et property_expense.

const dialect = new MySqlDialect();

type SubRow = { id: number; name: string; organizationId: number; status?: string };
type AccRow = { id: number; name: string; organizationId: number };

// Doublon « Cash » id 77 en org 1 volontairement place AVANT id 1.
const SUBS: SubRow[] = [
  { id: 77, name: "Cash", organizationId: 1 },
  { id: 1, name: "Cash", organizationId: 1 },
  { id: 2, name: "Bank", organizationId: 1 },
  { id: 40, name: "Mobile Money", organizationId: 1 },
  { id: 101, name: "Cash", organizationId: 2 },
  { id: 102, name: "Bank", organizationId: 2 },
  // Org 4 : Cash desactive (soft delete) avant un Cash actif ; Bank uniquement desactive.
  { id: 300, name: "Cash", organizationId: 4, status: "false" },
  { id: 301, name: "Cash", organizationId: 4 },
  { id: 302, name: "Bank", organizationId: 4, status: "false" },
];
const ACCS: AccRow[] = [
  { id: 1, name: "Asset", organizationId: 1 },
  { id: 201, name: "Asset", organizationId: 2 },
  { id: 401, name: "Asset", organizationId: 4 },
];

function makeService() {
  const inserts: { table: any; vals: any }[] = [];
  const subQueries: { sql: string; params: any[]; ordered: boolean }[] = [];

  const resolve = (table: any, cond: any, ordered: boolean) => {
    const q = cond ? dialect.sqlToQuery(cond) : { sql: "", params: [] as any[] };
    const scoped = /organization_id/.test(q.sql);
    const [name, org, status] = q.params;
    const pick = (rows: Array<SubRow | AccRow>) => {
      const hit = rows
        .filter((r) => r.name === name && (!scoped || r.organizationId === org))
        // Filtre status (3e parametre) : comptes desactives ignores.
        .filter((r) => status === undefined || ((r as SubRow).status ?? "true") === status)
        // Sans ORDER BY on renvoie l ordre physique (doublon 77 en tete).
        .sort((a, b) => (ordered ? a.id - b.id : 0));
      return hit.slice(0, 1).map((r) => ({ id: r.id }));
    };
    if (table === subAccounts) {
      subQueries.push({ sql: q.sql, params: q.params, ordered });
      if (name === "Maintenance") return [{ id: 12 }];
      return pick(SUBS);
    }
    if (table === accounts) return pick(ACCS);
    return [];
  };

  const builder = (table: any) => {
    let cond: any;
    let ordered = false;
    const b: any = {
      where: (c: any) => { cond = c; return b; },
      orderBy: () => { ordered = true; return b; },
      limit: () => b,
      then: (ok: any, ko: any) => Promise.resolve(resolve(table, cond, ordered)).then(ok, ko),
    };
    return b;
  };

  const db: any = {
    select: () => ({ from: (table: any) => builder(table) }),
    insert: (table: any) => ({
      values: (vals: any) => {
        inserts.push({ table, vals });
        return Promise.resolve([{ insertId: table === subAccounts ? 555 : 900 }]);
      },
    }),
    update: () => ({ set: () => ({ where: () => Promise.resolve([{ affectedRows: 1 }]) }) }),
  };

  const ledgerPost = jest.fn().mockResolvedValue({ id: 999 });
  const service = new PropertyManagementService(
    db,
    { publishDataUpdated: jest.fn().mockResolvedValue(undefined) } as any,
    {} as any,
    {} as any,
    { post: ledgerPost } as any,
    { submit: jest.fn().mockResolvedValue({ id: 1, status: "pending" }) } as any,
    { create: jest.fn().mockResolvedValue({ id: 77, updated: false }) } as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  );
  const svc = service as any;
  svc.findMaintenance = jest.fn().mockResolvedValue({ id: 5 });
  svc.saveReceiptFile = jest.fn().mockResolvedValue(null);
  svc.ensureActiveProperty = jest.fn().mockResolvedValue(undefined);
  svc.getOrCreatePropertyProject = jest.fn().mockResolvedValue(null);
  svc.getPropertyExpense = jest.fn().mockResolvedValue({ id: 900 });
  return { svc, inserts, subQueries, ledgerPost };
}

const maintenanceInput = (paymentMethod: string) => ({
  type: "service",
  description: "Plomberie",
  amount: 120.5,
  currencyId: 3,
  paymentMethod,
});

const legacyCredit = (inserts: { table: any; vals: any }[]) =>
  inserts.find((i) => i.table === transactions)?.vals.creditId;
const ledgerCredit = (ledgerPost: jest.Mock) =>
  ledgerPost.mock.calls[0][0].lines.find((l: any) => l.side === "CREDIT").accountId;

describe("resolveTreasuryAccount — tresorerie limitee a l organisation", () => {
  it("org 1 : Cash = 1, Bank = 2 (ids prod), Mobile Money par nom", async () => {
    const { svc } = makeService();
    expect(await svc.resolveTreasuryAccount(1, "cash")).toBe(1);
    expect(await svc.resolveTreasuryAccount(1, "bank")).toBe(2);
    expect(await svc.resolveTreasuryAccount(1, "mobile_money")).toBe(40);
  });

  it("doublon de nom dans l org : prend le plus petit id (ORDER BY id ASC)", async () => {
    const { svc, subQueries } = makeService();
    expect(await svc.resolveTreasuryAccount(1, "cash")).toBe(1);
    expect(subQueries[0].ordered).toBe(true);
  });

  it("filtre sur organization_id : org 2 ne recoit jamais le Cash/Bank de l org 1", async () => {
    const { svc, subQueries } = makeService();
    expect(await svc.resolveTreasuryAccount(2, "cash")).toBe(101);
    expect(await svc.resolveTreasuryAccount(2, "bank")).toBe(102);
    expect(subQueries[0].sql).toMatch(/organization_id/);
    expect(subQueries[0].params).toEqual(["Cash", 2, "true"]);
  });

  it("cree le sous-compte absent dans l org, sous SA racine Asset", async () => {
    const { svc, inserts } = makeService();
    expect(await svc.resolveTreasuryAccount(2, "mobile_money")).toBe(555);
    const created = inserts.find((i) => i.table === subAccounts)?.vals;
    expect(created).toMatchObject({ organizationId: 2, name: "Mobile Money", accountId: 201, status: "true" });
  });

  it("org sans racine Asset : erreur explicite plutot qu'un rattachement a l org 1", async () => {
    const { svc, inserts } = makeService();
    await expect(svc.resolveTreasuryAccount(3, "cash")).rejects.toBeInstanceOf(BadRequestException);
    expect(inserts).toHaveLength(0);
  });
});

describe("Loyer / maintenance / property_expense : meme compte de tresorerie", () => {
  it.each([
    [2, "Espèces", "cash", 101],
    [2, "Virement bancaire", "bank", 102],
    [1, "Cash", "cash", 1],
    [1, "Carte bancaire", "bank", 2],
  ])("org %i : loyer « %s » et maintenance %s visent le compte %i (legacy + ledger)", async (org, rentMethod, maintMethod, expected) => {
    const { svc, inserts, ledgerPost } = makeService();
    const rentDebit = await svc.resolvePaymentDebitAccount(rentMethod, 999, org);
    await svc.createMaintenanceCost(5, maintenanceInput(maintMethod), org);
    expect(rentDebit).toBe(expected);
    expect(legacyCredit(inserts)).toBe(expected);
    expect(ledgerCredit(ledgerPost)).toBe(expected);
  });

  it("property_expense credite la tresorerie de son org (org 2 bank = 102)", async () => {
    const { svc, ledgerPost } = makeService();
    await svc.createPropertyExpense(
      { propertyId: 1, category: "insurance", description: "Assurance", amount: 500, expenseDate: "2026-09-15", paymentMethod: "bank" },
      2,
      7,
    );
    expect(ledgerCredit(ledgerPost)).toBe(102);
  });

  it("loyer mobile money : M-Pesa / Airtel -> sous-compte Mobile Money de l org", async () => {
    const { svc } = makeService();
    expect(await svc.resolvePaymentDebitAccount("M-Pesa", 999, 1)).toBe(40);
    expect(await svc.resolvePaymentDebitAccount("Airtel Money", 999, 2)).toBe(555); // cree en org 2
  });

  it("maintenance mobile_money -> Mobile Money de l org (legacy + ledger)", async () => {
    const { svc, inserts, ledgerPost } = makeService();
    await svc.createMaintenanceCost(5, maintenanceInput("mobile_money"), 1);
    expect(legacyCredit(inserts)).toBe(40);
    expect(ledgerCredit(ledgerPost)).toBe(40);
  });

  it("maintenance cheque -> Bank de l org (legacy + ledger)", async () => {
    const { svc, inserts, ledgerPost } = makeService();
    await svc.createMaintenanceCost(5, maintenanceInput("cheque"), 2);
    expect(legacyCredit(inserts)).toBe(102);
    expect(ledgerCredit(ledgerPost)).toBe(102);
  });

  it("maintenance cash -> Cash (org 1 = id 1, comportement prod inchange)", async () => {
    const { svc, inserts, ledgerPost } = makeService();
    await svc.createMaintenanceCost(5, maintenanceInput("cash"), 1);
    expect(legacyCredit(inserts)).toBe(1);
    expect(ledgerCredit(ledgerPost)).toBe(1);
  });

  it("property_expense mobile_money -> Mobile Money, cheque -> Bank", async () => {
    const base = { propertyId: 1, category: "insurance", description: "Assurance", amount: 500, expenseDate: "2026-09-15" };
    const a = makeService();
    await a.svc.createPropertyExpense({ ...base, paymentMethod: "mobile_money" }, 1, 7);
    expect(ledgerCredit(a.ledgerPost)).toBe(40);
    const b = makeService();
    await b.svc.createPropertyExpense({ ...base, paymentMethod: "cheque" }, 1, 7);
    expect(ledgerCredit(b.ledgerPost)).toBe(2);
  });

  it("moyen de loyer inconnu : repli sur le compte du type Rent Payment", async () => {
    const { svc } = makeService();
    expect(await svc.resolvePaymentDebitAccount("autre", 999, 2)).toBe(999);
  });
});

describe("treasuryMethodOf — mapping unique partage", () => {
  it.each([
    ["cash", "cash"], ["Espèces", "cash"], ["bank", "bank"], ["cheque", "bank"], ["Chèque", "bank"],
    ["Virement bancaire", "bank"], ["Carte", "bank"], ["card", "bank"], ["mobile_money", "mobile_money"],
    ["M-Pesa", "mobile_money"], ["Airtel Money", "mobile_money"], ["Orange Money", "mobile_money"],
    ["autre", null], [null, null], [undefined, null],
  ])("%s -> %s", (method, expected) => {
    expect(PropertyManagementService.treasuryMethodOf(method as any)).toBe(expected);
  });
});

describe("resolveTreasuryAccount — comptes desactives ignores", () => {
  it("ignore un Cash desactive et prend le Cash actif suivant", async () => {
    const { svc, subQueries } = makeService();
    expect(await svc.resolveTreasuryAccount(4, "cash")).toBe(301);
    expect(subQueries[0].sql).toMatch(/status/);
  });

  it("tous les Bank de l org desactives : en cree un nouveau actif", async () => {
    const { svc, inserts } = makeService();
    expect(await svc.resolveTreasuryAccount(4, "bank")).toBe(555);
    const created = inserts.find((i) => i.table === subAccounts)?.vals;
    expect(created).toMatchObject({ organizationId: 4, name: "Bank", accountId: 401, status: "true" });
  });
});

describe("Caution / hypotheque : tresorerie selon le moyen reel", () => {
  it.each([
    [1, "cash", 1],
    [1, "Chèque", 2],
    [1, "M-Pesa", 40],
    [2, "Virement", 102],
  ])("caution recue org %i « %s » -> debit %i (legacy + ledger)", async (org, method, expected) => {
    const { svc, inserts, ledgerPost } = makeService();
    svc.getLeaseOrThrow = jest.fn().mockResolvedValue({ id: 9, propertyId: 1, unitId: 2, reference: "B9", currencyId: 3 });
    svc.ensurePropertyInScope = jest.fn();
    svc.saveProofFile = jest.fn().mockResolvedValue(null);
    svc.getOrCreateLiabilitySubAccount = jest.fn().mockResolvedValue(60);
    svc.publishPaymentUpdate = jest.fn().mockResolvedValue(undefined);
    svc.findDeposit = jest.fn().mockResolvedValue({ id: 900 });
    await svc.collectDeposit(9, { amount: 100, paymentDate: "2026-11-01", method }, org);
    expect(inserts.find((i) => i.table === transactions)?.vals.debitId).toBe(expected);
    expect(ledgerPost.mock.calls[0][0].lines.find((l: any) => l.side === "DEBIT").accountId).toBe(expected);
  });

  it.each([
    ["mobile_money", 40, "Mobile Money"],
    ["cheque", 2, "Bank"],
    ["cash", 1, "Cash"],
    ["bank", 2, "Bank"],
  ])("hypotheque « %s » -> credit tresorerie %i", async (paymentMethod, expected, label) => {
    const { svc, ledgerPost } = makeService();
    svc.ensureActiveUnit = jest.fn().mockResolvedValue(undefined);
    svc.getOrCreateLiabilitySubAccount = jest.fn().mockResolvedValue(61);
    svc.getOrCreateExpenseSubAccount = jest.fn().mockResolvedValue(62);
    svc.getMortgagePayment = jest.fn().mockResolvedValue({ id: 900 });
    await svc.createMortgagePayment(
      { propertyId: 1, paymentDate: "2026-11-01", totalAmount: 150, principalAmount: 100, interestAmount: 50, paymentMethod },
      1,
      7,
    );
    const credit = ledgerPost.mock.calls[0][0].lines.find((l: any) => l.side === "CREDIT");
    expect(credit.accountId).toBe(expected);
    expect(credit.description).toBe(label);
  });
});
