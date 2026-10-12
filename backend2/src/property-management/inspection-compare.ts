// Comparaison entree / sortie d'un etat des lieux Domus. Fonctions pures (sans DB).

export const INSPECTION_CONDITIONS = ["new", "good", "fair", "poor", "damaged", "na"] as const;
export type InspectionCondition = (typeof INSPECTION_CONDITIONS)[number];

// Rang d'etat : plus haut = meilleur. "na" (non applicable) n'a pas de rang.
const CONDITION_RANK: Record<string, number> = { new: 5, good: 4, fair: 3, poor: 2, damaged: 1 };

export function conditionRank(condition: string | null | undefined): number | null {
  if (!condition) return null;
  return CONDITION_RANK[condition] ?? null;
}

export type CompareItem = {
  id: number;
  room: string;
  element: string;
  condition: string;
  remarks?: string | null;
  entryItemId?: number | null;
  sortOrder?: number;
};

export type MeterReadings = Partial<Record<"water" | "electricity" | "gas", string | number | null>>;
export type KeyEntry = { label: string; count: number };

export type ItemComparison = {
  room: string;
  element: string;
  entryItemId: number | null;
  exitItemId: number | null;
  entryCondition: string | null;
  exitCondition: string | null;
  entryRemarks: string | null;
  exitRemarks: string | null;
  degraded: boolean;
  changed: boolean;
};

export function compareItems(entryItems: CompareItem[], exitItems: CompareItem[]): ItemComparison[] {
  const entryById = new Map(entryItems.map((i) => [i.id, i]));
  const usedEntry = new Set<number>();
  const out: ItemComparison[] = [];

  for (const exit of exitItems) {
    const entry = exit.entryItemId != null ? entryById.get(exit.entryItemId) : undefined;
    if (entry) usedEntry.add(entry.id);
    out.push(buildRow(entry ?? null, exit));
  }
  // Elements d'entree jamais releves en sortie.
  for (const entry of entryItems) {
    if (!usedEntry.has(entry.id)) out.push(buildRow(entry, null));
  }
  return out;
}

function buildRow(entry: CompareItem | null, exit: CompareItem | null): ItemComparison {
  const entryCondition = entry?.condition ?? null;
  const exitCondition = exit?.condition ?? null;
  const er = conditionRank(entryCondition);
  const xr = conditionRank(exitCondition);
  return {
    room: (exit ?? entry)!.room,
    element: (exit ?? entry)!.element,
    entryItemId: entry?.id ?? null,
    exitItemId: exit?.id ?? null,
    entryCondition,
    exitCondition,
    entryRemarks: entry?.remarks ?? null,
    exitRemarks: exit?.remarks ?? null,
    degraded: er != null && xr != null && xr < er,
    changed: entryCondition !== exitCondition,
  };
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function compareMeters(entry: MeterReadings | null | undefined, exit: MeterReadings | null | undefined) {
  return (["water", "electricity", "gas"] as const).map((kind) => {
    const e = toNumber(entry?.[kind]);
    const x = toNumber(exit?.[kind]);
    return { kind, entry: e, exit: x, consumption: e != null && x != null ? Math.round((x - e) * 100) / 100 : null };
  });
}

export function compareKeys(entry: KeyEntry[] | null | undefined, exit: KeyEntry[] | null | undefined) {
  const norm = (s: string) => s.trim().toLowerCase();
  const labels = new Map<string, string>();
  const e = new Map<string, number>();
  const x = new Map<string, number>();
  for (const k of entry ?? []) {
    const key = norm(k.label || "");
    if (!key) continue;
    labels.set(key, k.label);
    e.set(key, (e.get(key) ?? 0) + (Number(k.count) || 0));
  }
  for (const k of exit ?? []) {
    const key = norm(k.label || "");
    if (!key) continue;
    if (!labels.has(key)) labels.set(key, k.label);
    x.set(key, (x.get(key) ?? 0) + (Number(k.count) || 0));
  }
  return [...labels.entries()].map(([key, label]) => {
    const entryCount = e.get(key) ?? 0;
    const exitCount = x.get(key) ?? 0;
    return { label, entryCount, exitCount, missing: Math.max(0, entryCount - exitCount) };
  });
}

export function buildInspectionComparison(input: {
  entryItems: CompareItem[];
  exitItems: CompareItem[];
  entryMeters?: MeterReadings | null;
  exitMeters?: MeterReadings | null;
  entryKeys?: KeyEntry[] | null;
  exitKeys?: KeyEntry[] | null;
}) {
  const items = compareItems(input.entryItems, input.exitItems);
  const keys = compareKeys(input.entryKeys, input.exitKeys);
  return {
    items,
    meters: compareMeters(input.entryMeters, input.exitMeters),
    keys,
    summary: {
      total: items.length,
      degraded: items.filter((i) => i.degraded).length,
      changed: items.filter((i) => i.changed).length,
      missingKeys: keys.reduce((s, k) => s + k.missing, 0),
    },
  };
}
