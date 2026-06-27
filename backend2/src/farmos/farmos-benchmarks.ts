// Benchmarks INTRA-organisation (COMP-P2-016).
// Compare les lots d'une meme organisation entre eux (quartiles internes).
// Aucune donnee cross-org : pas de risque de fuite inter-tenant.
// Logique pure (sans DB) -> testable unitairement.

export interface LotMetricInput {
  lot: string;
  liveCount: number;   // effectif vivant
  deaths: number;      // deces cumules
  revenue: number;
  cost: number;
}

export interface LotBenchmarkRow {
  lot: string;
  liveCount: number;
  mortalityRate: number | null;   // % (deces / (vivants + deces))
  margin: number;                 // revenue - cost
  marginPerHead: number | null;   // marge / effectif vivant
}

export interface Quartiles {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
}

// Quartiles par interpolation lineaire sur une liste de nombres.
// Retourne null si la liste est vide.
export function computeQuartiles(values: number[]): Quartiles | null {
  const xs = values.filter((v) => typeof v === "number" && Number.isFinite(v)).sort((a, b) => a - b);
  if (xs.length === 0) return null;
  const at = (p: number) => {
    if (xs.length === 1) return xs[0];
    const idx = p * (xs.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return xs[lo];
    return xs[lo] + (xs[hi] - xs[lo]) * (idx - lo);
  };
  return { min: xs[0], q1: at(0.25), median: at(0.5), q3: at(0.75), max: xs[xs.length - 1] };
}

// Construit les metriques par lot a partir d'agregats bruts.
export function buildLotBenchmarkRows(lots: LotMetricInput[]): LotBenchmarkRow[] {
  return lots.map((l) => {
    const base = l.liveCount + l.deaths;
    const mortalityRate = base > 0 ? round1((l.deaths / base) * 100) : null;
    const margin = l.revenue - l.cost;
    const marginPerHead = l.liveCount > 0 ? round2(margin / l.liveCount) : null;
    return { lot: l.lot, liveCount: l.liveCount, mortalityRate, margin: round2(margin), marginPerHead };
  });
}

// Situe une valeur dans des quartiles : renvoie un quartile 1..4 (1 = meilleur 25% bas).
export function quartileRank(value: number, q: Quartiles): 1 | 2 | 3 | 4 {
  if (value <= q.q1) return 1;
  if (value <= q.median) return 2;
  if (value <= q.q3) return 3;
  return 4;
}

// Agrege le tout : lignes par lot + quartiles des 3 metriques cles.
export function computeLotBenchmarks(lots: LotMetricInput[]) {
  const rows = buildLotBenchmarkRows(lots);
  return {
    rows,
    quartiles: {
      mortalityRate: computeQuartiles(rows.map((r) => r.mortalityRate).filter((v): v is number => v != null)),
      margin: computeQuartiles(rows.map((r) => r.margin)),
      marginPerHead: computeQuartiles(rows.map((r) => r.marginPerHead).filter((v): v is number => v != null)),
    },
    sampleSize: rows.length,
  };
}

function round1(n: number) { return Math.round(n * 10) / 10; }
function round2(n: number) { return Math.round(n * 100) / 100; }
