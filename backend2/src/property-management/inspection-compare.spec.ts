import { buildInspectionComparison, compareItems, compareKeys, compareMeters, conditionRank } from "./inspection-compare";

const item = (id: number, condition: string, entryItemId: number | null = null, room = "Salon", element = "Mur") => ({
  id, room, element, condition, entryItemId,
});

describe("inspection-compare", () => {
  it("rang des etats, na sans rang", () => {
    expect(conditionRank("new")).toBe(5);
    expect(conditionRank("damaged")).toBe(1);
    expect(conditionRank("na")).toBeNull();
  });

  it("apparie par entry_item_id et detecte la degradation", () => {
    const rows = compareItems([item(1, "good"), item(2, "fair")], [item(11, "poor", 1), item(12, "fair", 2)]);
    expect(rows[0]).toMatchObject({ entryItemId: 1, exitItemId: 11, degraded: true, changed: true });
    expect(rows[1]).toMatchObject({ degraded: false, changed: false });
  });

  it("amelioration ou na : pas de degradation", () => {
    const rows = compareItems([item(1, "poor"), item(2, "good")], [item(11, "good", 1), item(12, "na", 2)]);
    expect(rows.every((r) => !r.degraded)).toBe(true);
  });

  it("element d'entree absent en sortie et element ajoute en sortie", () => {
    const rows = compareItems([item(1, "good")], [item(11, "good")]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ entryItemId: null, exitItemId: 11, degraded: false });
    expect(rows[1]).toMatchObject({ entryItemId: 1, exitItemId: null, exitCondition: null });
  });

  it("compteurs : consommation", () => {
    const m = compareMeters({ water: "10,5", electricity: 100 }, { water: 14, electricity: "abc" });
    expect(m[0]).toEqual({ kind: "water", entry: 10.5, exit: 14, consumption: 3.5 });
    expect(m[1].consumption).toBeNull();
    expect(m[2].consumption).toBeNull();
  });

  it("cles : manquantes", () => {
    const k = compareKeys([{ label: "Porte", count: 3 }], [{ label: "porte ", count: 2 }, { label: "Boite", count: 1 }]);
    expect(k.find((x) => x.label === "Porte")).toMatchObject({ entryCount: 3, exitCount: 2, missing: 1 });
    expect(k.find((x) => x.label === "Boite")?.missing).toBe(0);
  });

  it("resume", () => {
    const c = buildInspectionComparison({
      entryItems: [item(1, "good")], exitItems: [item(11, "damaged", 1)],
      entryKeys: [{ label: "Porte", count: 2 }], exitKeys: [{ label: "Porte", count: 1 }],
    });
    expect(c.summary).toEqual({ total: 1, degraded: 1, changed: 1, missingKeys: 1 });
  });
});
