export const SALE_LISTED_STATUSES = new Set(["available_sale", "for_sale", "a_vendre"]);
export const DECEASED_STATUSES = new Set(["deceased", "dead", "decede", "décédé", "mort"]);
export const SALE_LOCKED_STATUSES = new Set([...SALE_LISTED_STATUSES, "sold", ...DECEASED_STATUSES]);

export function normalizeAnimalStatus(status) {
  return String(status || "").trim().toLowerCase();
}

export function isSaleListedStatus(status) {
  return SALE_LISTED_STATUSES.has(normalizeAnimalStatus(status));
}

export function isSaleLockedStatus(status) {
  return SALE_LOCKED_STATUSES.has(normalizeAnimalStatus(status));
}

export function isSaleLockedAnimal(animal) {
  return isSaleLockedStatus(animal?.status);
}

export function isDeceasedStatus(status) {
  return DECEASED_STATUSES.has(normalizeAnimalStatus(status));
}

export function animalStatusLabel(status, lang = "fr") {
  const fr = lang === "fr";
  switch (normalizeAnimalStatus(status)) {
    case "healthy":
      return fr ? "Sain" : "Healthy";
    case "sick":
      return fr ? "Malade" : "Sick";
    case "quarantine":
    case "quarantaine":
      return fr ? "Quarantaine" : "Quarantine";
    case "treatment":
      return fr ? "Traitement" : "Treatment";
    case "alert":
      return fr ? "Alerte" : "Alert";
    case "withdrawal":
      return fr ? "Retrait" : "Withdrawal";
    case "available_sale":
    case "for_sale":
    case "a_vendre":
      return fr ? "En vente" : "For sale";
    case "sold":
      return fr ? "Vendu" : "Sold";
    case "deceased":
      return fr ? "Décédé" : "Deceased";
    default:
      return status || "";
  }
}

export function animalStatusColor(status) {
  switch (normalizeAnimalStatus(status)) {
    case "healthy":
      return "var(--solidite-500)";
    case "treatment":
      return "var(--autorite-500)";
    case "alert":
    case "sick":
    case "quarantine":
    case "quarantaine":
      return "var(--oxblood-700)";
    case "available_sale":
    case "for_sale":
    case "a_vendre":
      return "var(--clay-700)";
    case "sold":
      return "var(--ink-700)";
    default:
      return "var(--ink-400)";
  }
}

export function lockedAnimalMessage(lang = "fr") {
  return lang === "fr"
    ? "Ce dossier est verrouillé: l'animal est en vente, vendu ou décédé."
    : "This record is locked: the animal is for sale, sold or deceased.";
}

export function saleLockTitle(status, lang = "fr") {
  if (isDeceasedStatus(status)) {
    return lang === "fr" ? "Dossier clôturé (décès)" : "Closed record (deceased)";
  }
  if (normalizeAnimalStatus(status) === "sold") {
    return lang === "fr" ? "Dossier vendu" : "Sold record";
  }
  return lang === "fr" ? "Viande bloquée pour vente" : "Meat blocked for sale";
}

export function saleLockSubtitle(status, lang = "fr") {
  if (isDeceasedStatus(status)) {
    return lang === "fr"
      ? "Animal décédé - dossier en lecture seule permanente"
      : "Deceased animal - permanent read-only record";
  }
  if (normalizeAnimalStatus(status) === "sold") {
    return lang === "fr"
      ? "Dossier en lecture seule permanente"
      : "Permanent read-only record";
  }
  return lang === "fr"
    ? "Produit en vente - dossier en lecture seule"
    : "Product for sale - read-only record";
}
