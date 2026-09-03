/** Cle mois "YYYY-MM" en heure locale. */
export function monthKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Ajoute `n` mois a une date (copie, ne mute pas l'original). */
export function addMonths(d: Date, n: number): Date {
  const r = new Date(d.getTime());
  r.setMonth(r.getMonth() + n);
  return r;
}

/** Arrondi 2 decimales (centimes). */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
