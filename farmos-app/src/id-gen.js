// Génération automatique d'identifiants externes (boucle/lot/code paillette).
// Pattern : {PREFIX}-{ANNÉE}-{NNN} où NNN = max existant + 1, padded à 3 chiffres.
// Les recherches se font sur le cache local (Dexie) si disponible, sinon on
// passe les données déjà chargées.

// Préfixes par espèce (FR conventionnel terrain).
const SPECIES_PREFIX = {
  cow:     "VACHE",
  pig:     "PORC",
  goat:    "CHEVRE",
  sheep:   "MOUTON",
  chicken: "POULET",
  duck:    "CANARD",
  turkey:  "DINDE",
  rabbit:  "LAPIN",
  fish:    "POISSON",
};

function yearNow() {
  return new Date().getFullYear();
}

function pad(n, width = 3) {
  const s = String(n);
  return s.length >= width ? s : "0".repeat(width - s.length) + s;
}

// Animaux : trouve le plus grand NNN parmi les external_id matchant
// {PREFIX}-{YEAR}-NNN pour cette espèce et cette année, renvoie next.
export function nextAnimalExternalId(species, animals) {
  const prefix = SPECIES_PREFIX[species] || (species ? species.toUpperCase() : "ANI");
  const year = yearNow();
  const head = `${prefix}-${year}-`;
  let max = 0;
  for (const a of animals || []) {
    const ext = String(a.externalId || a.external_id || a.id || "").toUpperCase();
    if (!ext.startsWith(head)) continue;
    const suf = ext.slice(head.length);
    const n = parseInt(suf, 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${head}${pad(max + 1)}`;
}

// Paillettes IA : pattern STR-{SPECIES_PREFIX}-{YEAR}-NNN.
export function nextStrawCode(species, straws) {
  const prefix = `STR-${SPECIES_PREFIX[species] || (species ? species.toUpperCase() : "ANI")}`;
  const year = yearNow();
  const head = `${prefix}-${year}-`;
  let max = 0;
  for (const s of straws || []) {
    const code = String(s.code || "").toUpperCase();
    if (!code.startsWith(head)) continue;
    const n = parseInt(code.slice(head.length), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${head}${pad(max + 1)}`;
}

// Numéro de facture : INV-{YEAR}-{NNNN}. Si pas d'historique disponible
// (facteur prudent), incrémente depuis 1 chaque année.
export function nextInvoiceNumber(expenses) {
  const year = yearNow();
  const head = `INV-${year}-`;
  let max = 0;
  for (const e of expenses || []) {
    const inv = String(e.invoice || e.invoiceNumber || e.description || "").toUpperCase();
    const m = inv.match(new RegExp(`${head}(\\d+)`));
    if (m) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n) && n > max) max = n;
    }
  }
  return `${head}${pad(max + 1, 4)}`;
}
