// Résolution de la devise depuis la BD — même logique que le CRM
// (frontend/src/components/propertyManagement/shared/format.js + useDefaultCurrency).
// La devise par défaut vient de `GET /setting` (currencyId) résolu dans la liste
// `GET /currency?query=all`. Chaque transaction peut aussi porter sa propre devise.

export function decodeCurrencyText(value) {
  const text = String(value || "");
  return text.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&").replace(/&euro;/gi, "€").replace(/&pound;/gi, "£").replace(/&yen;/gi, "¥")
    .replace(/â‚¬/g, "€").replace(/Â£/g, "£").replace(/â‚¹/g, "₹").replace(/Â¥/g, "¥")
    .replace(/â‚©/g, "₩").replace(/â‚±/g, "₱").replace(/â‚º/g, "₺").replace(/â‚£/g, "₣").replace(/â‚½/g, "₽");
}

// Préfère le code ISO (USD, CDF, CAD…), sinon le symbole nettoyé.
export function cleanCurrencySymbol(currency) {
  const code = String(currency?.currencyCode || "").trim().toUpperCase();
  if (code) return code;
  const name = String(currency?.currencyName || "").toUpperCase();
  const rawSymbol = String(currency?.currencySymbol || "");
  const decoded = decodeCurrencyText(rawSymbol).trim();
  if (name.includes("FRANC CONGOLAIS")) return "CDF";
  if (decoded && !/[&;Ââà]/.test(decoded)) return decoded;
  return decoded || "";
}

const cid = (c) => c?.currencyId ?? c?.id;

// Symbole de la devise par défaut de l'entreprise (Paramètres > Entreprise).
export function defaultSymbol(setting, currencies, fallback = "CDF") {
  const id = setting?.currencyId;
  if (id == null) return fallback;
  const c = (currencies || []).find((x) => cid(x) === id);
  return (c && cleanCurrencySymbol(c)) || fallback;
}

// Symbole pour un currencyId donné (ex. salaire d'un employé, transaction).
export function symbolFor(currencyId, currencies, fallback) {
  if (currencyId == null) return fallback;
  const c = (currencies || []).find((x) => cid(x) === currencyId);
  return (c && cleanCurrencySymbol(c)) || fallback;
}

const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
export const fmt = (v) => nf.format(Math.round(Number(v || 0)));
// Montant + devise (ex. "1 250 000 CDF").
export const money = (v, sym) => `${fmt(v)}${sym ? " " + sym : ""}`;
// Montant compact en millions (ex. "1,3 M CDF").
export const moneyM = (v, sym) => `${(Number(v || 0) / 1e6).toFixed(1).replace(".", ",")} M${sym ? " " + sym : ""}`;
