export function decodeCurrencyText(value) {
  const text = String(value || "");
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&")
    .replace(/&euro;/gi, "\u20ac")
    .replace(/&pound;/gi, "\u00a3")
    .replace(/&yen;/gi, "\u00a5");
}

export function cleanCurrencySymbol(currency) {
  const code = String(currency?.currencyCode || currency?.currency_code || "").trim().toUpperCase();
  if (code) return code;
  const rawSymbol = String(currency?.currencySymbol || currency?.currency_symbol || "");
  const decoded = decodeCurrencyText(rawSymbol).trim();
  if (decoded && !/[&;]/.test(decoded)) return decoded;
  return decoded || "";
}

export function currencyIdOf(currency) {
  return currency?.currencyId ?? currency?.currency_id ?? currency?.id ?? null;
}

export function rowCurrencyId(row) {
  return row?.currencyId ?? row?.currency_id ?? null;
}

export function defaultCurrencyId(setting, currencies) {
  return setting?.currencyId
    ?? setting?.currency_id
    ?? setting?.currency?.id
    ?? currencyIdOf((currencies || [])[0])
    ?? null;
}

export function symbolFor(currencyId, currencies, fallback = "") {
  const id = currencyId == null ? null : Number(currencyId);
  if (id == null || Number.isNaN(id)) return fallback;
  const currency = (currencies || []).find((c) => Number(currencyIdOf(c)) === id);
  return (currency && cleanCurrencySymbol(currency)) || fallback;
}

export function defaultSymbol(setting, currencies, fallback = "") {
  return symbolFor(defaultCurrencyId(setting, currencies), currencies, fallback);
}

export function currencyLabel(currency) {
  return cleanCurrencySymbol(currency)
    || currency?.currencyName
    || currency?.currency_name
    || currency?.currencySymbol
    || currency?.currency_symbol
    || "";
}

export function currencyOptions(currencies) {
  return (currencies || [])
    .map((currency) => ({ id: currencyIdOf(currency), label: currencyLabel(currency) }))
    .filter((option) => option.id != null);
}

const nf0 = new Intl.NumberFormat("fr-CA", { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat("fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatMoney(value, currencyId, currencies, fallback = "", precision = 0) {
  const amount = precision === 2 ? nf2.format(Number(value || 0)) : nf0.format(Math.round(Number(value || 0)));
  const symbol = symbolFor(currencyId, currencies, fallback);
  return `${amount}${symbol ? " " + symbol : ""}`;
}
