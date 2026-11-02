// Analyse LECTURE SEULE des materiaux BatiPro pollues par l'ancienne creation
// automatique (une ligne de BC en texte libre = un materiau). Ne modifie rien :
// propose des materiaux a desactiver (is_active=0) et des doublons a fusionner.

export interface CleanupMaterialInput {
  id: number;
  name: string;
  unit: string;
  stock: number;
  minStock: number;
  reserved: number;
  movementCount: number;
  lineCount: number;
}

export type ServiceCategory = "labor" | "handling" | "fees" | "transport" | "hardware_invoice";

const SERVICE_RULES: Array<{ category: ServiceCategory; re: RegExp }> = [
  { category: "fees", re: /\b(honoraires?|avances?|ingenieur|architecte|bureau d etudes?)\b/ },
  { category: "hardware_invoice", re: /\b(facture|fact|quincaillerie|sarl|sprl|ets)\b/ },
  { category: "handling", re: /\b(manutention|dechargement|chargement)\b/ },
  { category: "labor", re: /\b(main d oeuvre|mo|decoffrage|coffrage|ferraillage|salaires?|ouvriers?|journaliers?|pose|maconnerie)\b/ },
  { category: "transport", re: /\b(transport|repas|deplacements?|carburant|frais|per diem|hebergement|taxi)\b/ },
];

export function normalizeLabel(name: string): string {
  return (name || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[œ]/g, "oe")
    .replace(/['’\-_.,;:/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Cle de rapprochement des doublons : sans parentheses, dates, taux, nombres isoles, pluriel final.
export function duplicateKey(name: string): string {
  let s = (name || "").toLowerCase().replace(/\([^)]*\)/g, " ");
  s = normalizeLabel(s)
    .replace(/\b\d{1,4} \d{1,2} \d{1,4}\b/g, " ")
    .replace(/\b\d+(?: \d+)? ?(%|usd|fc|cdf|\$)/g, " ")
    .replace(/\b\d+\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return s.split(" ").map((w) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w)).join(" ");
}

export function detectServiceCategory(name: string): ServiceCategory | null {
  const n = normalizeLabel(name);
  for (const r of SERVICE_RULES) if (r.re.test(n)) return r.category;
  return null;
}

// Nom nettoye propose (dates, taux, n de facture retires) ; null si deja propre.
export function suggestCleanName(name: string): string | null {
  const cleaned = (name || "")
    .replace(/\b\d{1,2}[\/.-]\d{1,2}(?:[\/.-]\d{2,4})?\b/g, " ")
    .replace(/\b(?:taux|tx)\s*[:=]?\s*\d+(?:[.,]\d+)?\s*(?:%|fc|cdf|usd|\$)?/gi, " ")
    .replace(/\b(?:facture|fact|n[°o])\s*[:#]?\s*[\w-]+/gi, " ")
    .replace(/\s*[-–—]\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned && cleaned !== (name || "").trim() ? cleaned : null;
}

export function buildMaterialCleanupPreview(materials: CleanupMaterialInput[]) {
  const toDeactivate: Array<{ id: number; name: string; category: ServiceCategory; reason: string; needsReview: boolean; stock: number; movementCount: number; lineCount: number }> = [];
  const deactivatedIds = new Set<number>();

  for (const m of materials) {
    const category = detectServiceCategory(m.name);
    if (!category) continue;
    const hasStock = m.stock > 0 || m.movementCount > 0;
    toDeactivate.push({
      id: m.id,
      name: m.name,
      category,
      reason: hasStock
        ? "Libelle de service/depense mais du stock ou des mouvements existent : verifier avant desactivation."
        : "Libelle de service/depense, aucun stock ni mouvement.",
      needsReview: hasStock,
      stock: m.stock,
      movementCount: m.movementCount,
      lineCount: m.lineCount,
    });
    deactivatedIds.add(m.id);
  }

  const groups = new Map<string, CleanupMaterialInput[]>();
  for (const m of materials) {
    if (deactivatedIds.has(m.id)) continue;
    const key = duplicateKey(m.name);
    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), m]);
  }
  const duplicatesToMerge: Array<{ key: string; keep: { id: number; name: string }; merge: Array<{ id: number; name: string; stock: number; movementCount: number; lineCount: number }>; summedStock: number }> = [];
  for (const [key, list] of groups) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a, b) => (b.movementCount + b.lineCount) - (a.movementCount + a.lineCount) || b.stock - a.stock || a.id - b.id);
    const [keep, ...rest] = sorted;
    duplicatesToMerge.push({
      key,
      keep: { id: keep.id, name: keep.name },
      merge: rest.map((r) => ({ id: r.id, name: r.name, stock: r.stock, movementCount: r.movementCount, lineCount: r.lineCount })),
      summedStock: list.reduce((acc, r) => acc + r.stock, 0),
    });
  }

  const namesToClean = materials
    .filter((m) => !deactivatedIds.has(m.id))
    .map((m) => ({ id: m.id, name: m.name, suggested: suggestCleanName(m.name) }))
    .filter((x) => x.suggested);

  return {
    readOnly: true,
    totalMaterials: materials.length,
    toDeactivate,
    duplicatesToMerge,
    namesToClean,
    note: "Dry-run lecture seule : rien n est modifie. Desactivation = is_active=0 (jamais DELETE). Fusion = rattacher lignes/mouvements au materiau conserve puis desactiver les autres.",
  };
}
