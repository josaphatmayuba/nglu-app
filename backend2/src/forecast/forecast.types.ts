/**
 * Moteur de prevision generique multi-grandeurs.
 *
 * Une prevision = une serie de "lignes typees" produites par des producteurs
 * (un par module / source). Le ForecastService les agrege par mois x devise.
 * Le calcul ne stocke rien : chaque producteur lit l'etat reel courant.
 *
 * Couches EMPILABLES (jamais concurrentes) :
 *  - 1 = engage/certain (baux signes, echeances connues, solde reel)
 *  - 2 = tendance/estime (historique, references externes marche/FX)
 *  - 3 = IA/ML predit (plus tard)
 * Le curseur Prudent/Realiste/Optimiste = filtre sur `layer` (1 / <=2 / <=3).
 */

export type ForecastLayer = 1 | 2 | 3;

export type ForecastConfidence = "certain" | "estimated" | "predicted";

/** Type de grandeur projetee. v1 = cashflow uniquement ; le reste suivra. */
export type ForecastKind =
  | "cashflow"
  | "livestock"
  | "stock"
  | "project"
  | "headcount";

/** Perimetre d'agregation : "all" = consolide, sinon un module. */
export type ForecastScope = "all" | "compta" | "domus" | "farmos" | "hr" | "batipro";

/**
 * Une ligne de prevision atomique. `amount` positif = entree, negatif = sortie
 * (pour cashflow). La devise N'EST JAMAIS convertie : chaque devise est un
 * sous-livre independant (meme principe que le ledger).
 */
export interface ForecastLine {
  /** Mois cible au format "YYYY-MM". */
  month: string;
  /** Montant signe (entree +, sortie -). */
  amount: number;
  currencyId: number | null;
  currencyCode: string | null;
  currencySymbol: string | null;
  layer: ForecastLayer;
  confidence: ForecastConfidence;
  /** Module d'origine (pour le filtre par scope). */
  scope: ForecastScope;
  /** Libelle court de la source ("Loyer bail #12"). */
  source: string;
  /** Base de calcul affichable ("5 baux actifs") — transparence obligatoire. */
  basis: string;
  /** true = solde de DEPART (point de depart de la courbe), pas un flux du mois. */
  opening?: boolean;
}

/** Un producteur de lignes. Chaque module en implemente un. */
export interface ForecastProducer {
  readonly scope: ForecastScope;
  /** Renvoie les lignes pour les `horizonMonths` prochains mois. */
  produce(orgId: number, horizonMonths: number): Promise<ForecastLine[]>;
}

export const FORECAST_PRODUCERS = Symbol("FORECAST_PRODUCERS");
