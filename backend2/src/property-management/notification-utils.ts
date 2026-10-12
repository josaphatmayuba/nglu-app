/**
 * Cle de dedoublonnage d'un telephone, UNIQUE pour tout le module : chiffres
 * seulement, prefixe international "00" retire (donc +243... == 00243...).
 */
export function normalizePhoneKey(p: string | null | undefined): string {
  return String(p ?? "").replace(/\D+/g, "").replace(/^00/, "");
}

/** Echappe une valeur libre (nom...) avant de l'inserer dans un email HTML. */
export function escapeHtmlText(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
