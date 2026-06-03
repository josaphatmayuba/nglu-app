// Domus — petit hook de fetch avec état loading/error + reload.
import { useCallback, useEffect, useState } from "react";

export const DEVICE_MODES = [
  { value: "auto", label: "Auto" },
  { value: "mobile", label: "Mobile" },
  { value: "tablet", label: "Tablette" },
  { value: "desktop", label: "Desktop" },
];

export function detectDeviceMode() {
  if (typeof window === "undefined") return "desktop";
  const width = window.innerWidth;
  if (width <= 768) return "mobile";
  if (width <= 1180) return "tablet";
  return "desktop";
}

export function useDeviceMode(storageKey = "domus-device-mode") {
  const [forcedMode, setForcedModeState] = useState(() => {
    try {
      return localStorage.getItem(storageKey) || "auto";
    } catch {
      return "auto";
    }
  });
  const [detectedMode, setDetectedMode] = useState(detectDeviceMode);

  useEffect(() => {
    const onResize = () => setDetectedMode(detectDeviceMode());
    window.addEventListener("resize", onResize);
    onResize();
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const setForcedMode = useCallback((mode) => {
    const next = DEVICE_MODES.some((item) => item.value === mode) ? mode : "auto";
    setForcedModeState(next);
    try {
      localStorage.setItem(storageKey, next);
    } catch {}
  }, [storageKey]);

  const mode = forcedMode === "auto" ? detectedMode : forcedMode;
  return {
    mode,
    forcedMode,
    detectedMode,
    isMobile: mode === "mobile",
    isTablet: mode === "tablet",
    isDesktop: mode === "desktop",
    setForcedMode,
  };
}

export function useApi(fn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fn();
      setData(res);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}

// Formatage monétaire compact (USD par défaut).
export const currencySymbolFallbacks = {
  "FRANC CONGOLAIS": "CDF",
  DOLLAR: "USD",
  EURO: "EUR",
  CAD: "CAD",
  POUND: "GBP",
  RUPEE: "INR",
  YEN: "JPY",
  WON: "KRW",
  YUAN: "CNY",
  PESO: "PHP",
  LIRA: "TRY",
  FRANC: "CHF",
  REAL: "BRL",
  RUBLE: "RUB",
  RINGGIT: "MYR",
};

export function decodeCurrencyText(value) {
  const text = String(value || "");
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&")
    .replace(/&euro;/gi, "EUR")
    .replace(/&pound;/gi, "GBP")
    .replace(/&yen;/gi, "JPY")
    .replace(/Â/g, "")
    .replace(/â‚¬/g, "EUR")
    .replace(/â‚¹/g, "INR")
    .replace(/â‚©/g, "KRW")
    .replace(/â‚±/g, "PHP")
    .replace(/â‚º/g, "TRY")
    .replace(/â‚£/g, "GBP")
    .replace(/â‚½/g, "RUB");
}

export function cleanCurrencySymbol(currency) {
  const code = String(currency?.currencyCode || "").trim().toUpperCase();
  if (code) return code;
  const name = String(currency?.currencyName || "").trim().toUpperCase();
  const rawSymbol = String(currency?.currencySymbol || "");
  const decoded = decodeCurrencyText(rawSymbol).trim();
  if (name.includes("FRANC CONGOLAIS")) return "CDF";
  if (/&#|&[a-z]+;|Â|â|à/i.test(rawSymbol) && currencySymbolFallbacks[name]) return currencySymbolFallbacks[name];
  if (decoded && !/[&;Ââà]/.test(decoded)) return decoded;
  return currencySymbolFallbacks[name] || decoded || "";
}

export function getCurrencyValue(currency) {
  return currency?.currencyId ?? currency?.id;
}

export function buildCurrencyOptions(currencies = []) {
  return currencies
    .map((currency) => {
      const value = getCurrencyValue(currency);
      if (value === undefined || value === null) return null;
      const name = decodeCurrencyText(currency?.currencyName).trim();
      const code = decodeCurrencyText(currency?.currencyCode).trim();
      const symbol = cleanCurrencySymbol(currency);
      const main = code ? `${code} - ${name}` : name;
      return {
        label: symbol ? `${main} (${symbol})` : main,
        value,
        symbol: symbol || "CDF",
        searchText: [code, name, symbol].filter(Boolean).join(" "),
      };
    })
    .filter(Boolean);
}

export function normalizeCurrencyModule(currenciesRaw, setting) {
  const list = Array.isArray(currenciesRaw?.getAllCurrency)
    ? currenciesRaw.getAllCurrency
    : Array.isArray(currenciesRaw)
      ? currenciesRaw
      : [];
  const activeCurrencies = list.filter((c) => c?.status === true || c?.status === "true" || c?.status === undefined);
  const currencyOptions = buildCurrencyOptions(activeCurrencies);
  const currencyById = new Map();
  list.forEach((currency) => {
    if (currency?.id != null) currencyById.set(Number(currency.id), currency);
    if (currency?.currencyId != null) currencyById.set(Number(currency.currencyId), currency);
  });
  const defaultCurrencyId = setting?.currencyId ?? setting?.currency?.id ?? currencyOptions[0]?.value ?? "";
  const defaultCurrency = defaultCurrencyId ? currencyById.get(Number(defaultCurrencyId)) : null;
  const defaultCurrencySymbol = (defaultCurrency ? cleanCurrencySymbol(defaultCurrency) : "") || currencyOptions[0]?.symbol || "CDF";
  return { currencyList: list, activeCurrencies, currencyOptions, currencyById, defaultCurrencyId, defaultCurrencySymbol };
}

export function groupAmountsByCurrency(rows = [], amountSelector = (row) => row.amount, fallbackSymbol = "CDF") {
  const grouped = new Map();
  rows.forEach((row) => {
    const currencyId = row?.currencyId ?? row?.currency_id ?? row?.currencySymbol ?? "default";
    const key = String(currencyId ?? "default");
    const current = grouped.get(key) || {
      currencyId,
      currencySymbol: row?.currencySymbol || row?.currencyName || fallbackSymbol,
      amount: 0,
    };
    current.amount += Number(amountSelector(row) || 0);
    grouped.set(key, current);
  });
  return Array.from(grouped.values());
}

export function formatCurrencyRows(rows = [], fallbackSymbol = "CDF") {
  if (!rows.length) return money(0, fallbackSymbol);
  if (rows.length === 1) return money(rows[0].amount, rows[0].currencySymbol || fallbackSymbol);
  return rows.map((row) => money(row.amount, row.currencySymbol || fallbackSymbol)).join(" / ");
}

export function money(n, currency = "CDF") {
  const v = Number(n || 0);
  const symbol = decodeCurrencyText(currency || "CDF").trim() || "CDF";
  if (Math.abs(v) >= 1_000_000) return `${symbol} ${(v / 1_000_000).toFixed(1).replace(".0", "")}M`;
  if (Math.abs(v) >= 1_000) return `${symbol} ${Math.round(v / 1000)}K`;
  return `${symbol} ${v.toLocaleString("fr-FR")}`;
}

// Montant complet, sans abréviation (ex. « $ 9 591 450 »). Utilisé pour
// l'affichage empilé multi-devises (composant MoneyStack).
export function moneyExact(n, currency = "CDF") {
  const v = Number(n || 0);
  const symbol = decodeCurrencyText(currency || "CDF").trim() || "CDF";
  return `${symbol} ${v.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}`;
}
