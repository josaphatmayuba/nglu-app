import "reflect-metadata";
import { computeSubcontractorFees, type FeeSub } from "./subcontractor-fees.util";

const bases = { materials: 3415.25, labor: 200, handling: 50, other: 0, accepted_quote: 21389 };
const sub = (o: Partial<FeeSub>): FeeSub => ({ id: 1, name: "Ir", trade: null, currencyId: 1, contractAmount: "0", feeMode: null, feePercent: null, feeBases: null, ...o });
const docs = [
  { subcontractorId: 1, currencyId: 1, paidAmount: "500.10" }, // BC
  { subcontractorId: 1, currencyId: null, paidAmount: "100.20" }, // depense (devise chantier)
  { subcontractorId: 2, currencyId: 1, paidAmount: "999" },
  { subcontractorId: 1, currencyId: 2, paidAmount: "777" }, // autre devise : exclu
];
const run = (s: FeeSub) => computeSubcontractorFees([s], docs, bases, 1)[0];

describe("computeSubcontractorFees", () => {
  it("NULL + contract_amount > 0 = fixe (retrocompat)", () => {
    const r = run(sub({ contractAmount: "6416.70" }));
    expect(r.mode).toBe("fixed");
    expect(r.due).toBe(6416.7);
    expect(r.paid).toBeCloseTo(600.3, 2);
    expect(r.remaining).toBeCloseTo(5816.4, 2);
  });
  it("aucun mode, montant 0 = aucun", () => {
    const r = run(sub({}));
    expect(r.mode).toBe("none");
    expect(r.due).toBe(0);
    expect(r.remaining).toBe(0);
  });
  it("% d'une base par defaut (materiaux), sans arrondi", () => {
    const r = run(sub({ feeMode: "percent_materials", feePercent: "30" }));
    expect(r.due).toBeCloseTo(1024.575, 6);
    expect(r.bases).toEqual(["materials"]);
  });
  it("% de plusieurs bases", () => {
    const r = run(sub({ feeMode: "percent_materials", feePercent: "10", feeBases: "materials,handling" }));
    expect(r.due).toBeCloseTo(346.525, 6);
  });
  it("% du devis accepte", () => {
    const r = run(sub({ feeMode: "percent_materials", feePercent: "30", feeBases: "accepted_quote" }));
    expect(r.due).toBeCloseTo(6416.7, 6);
  });
  it("fees stocke est ignore (retombe sur materiaux)", () => {
    const r = run(sub({ feeMode: "percent_materials", feePercent: "30", feeBases: "fees" }));
    expect(r.bases).toEqual(["materials"]);
    expect(r.due).toBeCloseTo(1024.575, 6);
  });
  it("DTO refuse fees", async () => {
    const { validate } = await import("class-validator");
    const { plainToInstance } = await import("class-transformer");
    const { CreateBatiproSubcontractorDto } = await import("./dto/batipro.dto");
    const bad = await validate(plainToInstance(CreateBatiproSubcontractorDto, { name: "x", fee_bases: ["fees"] }));
    const ok = await validate(plainToInstance(CreateBatiproSubcontractorDto, { name: "x", fee_bases: ["materials", "labor"] }));
    const dup = await validate(plainToInstance(CreateBatiproSubcontractorDto, { name: "x", fee_bases: ["labor", "labor"] }));
    expect(bad.length).toBe(1);
    expect(ok.length).toBe(0);
    expect(dup.length).toBe(1);
  });
  it("reste jamais negatif", () => {
    const r = run(sub({ feeMode: "fixed", contractAmount: "100" }));
    expect(r.remaining).toBe(0);
  });
});
