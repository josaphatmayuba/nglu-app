// Ancien format compact (1.2k, 3.4M) retiré : ce helper sert aussi aux montants du
// tableau de bord et l'argent ne s'arrondit jamais. Valeur exacte, 2 décimales max,
// séparateur de milliers ; les compteurs entiers restent sans décimale.
export function abbreviateNumber(number){
    const n = Number(number || 0);
    return n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}
