import { computeQuartiles, buildLotBenchmarkRows, quartileRank, computeLotBenchmarks } from "./farmos-benchmarks";

describe("computeQuartiles (P2-016)", () => {
  it("retourne null sur liste vide", () => {
    expect(computeQuartiles([])).toBeNull();
  });

  it("gere une seule valeur", () => {
    expect(computeQuartiles([5])).toEqual({ min: 5, q1: 5, median: 5, q3: 5, max: 5 });
  });

  it("calcule les quartiles d'une serie simple", () => {
    const q = computeQuartiles([1, 2, 3, 4, 5])!;
    expect(q.min).toBe(1);
    expect(q.median).toBe(3);
    expect(q.max).toBe(5);
    expect(q.q1).toBe(2);
    expect(q.q3).toBe(4);
  });

  it("ignore les valeurs non finies", () => {
    const q = computeQuartiles([1, NaN, 3, Infinity, 5])!;
    expect(q.min).toBe(1);
    expect(q.max).toBe(5);
  });
});

describe("buildLotBenchmarkRows (P2-016)", () => {
  it("calcule taux de mortalite et marge par tete", () => {
    const rows = buildLotBenchmarkRows([
      { lot: "A", liveCount: 90, deaths: 10, revenue: 1000, cost: 400 },
    ]);
    expect(rows[0].mortalityRate).toBe(10); // 10 / (90+10)
    expect(rows[0].margin).toBe(600);
    expect(rows[0].marginPerHead).toBe(round2(600 / 90));
  });

  it("mortalite et marge/tete null si pas d'effectif", () => {
    const rows = buildLotBenchmarkRows([{ lot: "B", liveCount: 0, deaths: 0, revenue: 0, cost: 0 }]);
    expect(rows[0].mortalityRate).toBeNull();
    expect(rows[0].marginPerHead).toBeNull();
  });
});

describe("quartileRank (P2-016)", () => {
  const q = { min: 0, q1: 10, median: 20, q3: 30, max: 40 };
  it("classe correctement", () => {
    expect(quartileRank(5, q)).toBe(1);
    expect(quartileRank(15, q)).toBe(2);
    expect(quartileRank(25, q)).toBe(3);
    expect(quartileRank(40, q)).toBe(4);
  });
});

describe("computeLotBenchmarks (P2-016)", () => {
  it("agrege lignes + quartiles + sampleSize", () => {
    const res = computeLotBenchmarks([
      { lot: "A", liveCount: 100, deaths: 0, revenue: 1000, cost: 200 },
      { lot: "B", liveCount: 50, deaths: 10, revenue: 500, cost: 300 },
      { lot: "C", liveCount: 80, deaths: 5, revenue: 800, cost: 800 },
    ]);
    expect(res.sampleSize).toBe(3);
    expect(res.rows).toHaveLength(3);
    expect(res.quartiles.margin).not.toBeNull();
    expect(res.quartiles.mortalityRate).not.toBeNull();
  });
});

function round2(n: number) { return Math.round(n * 100) / 100; }
