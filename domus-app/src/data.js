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

// ── Moyens de paiement configurables (table paymentMethod partagée avec le CRM) ──
// Le backend ne stocke que methodName + sous-compte ; l'UI Domus dérive une
// couleur, une abréviation et le flag « mobile money » (qui affiche le champ
// numéro au lieu du n° de reçu) à partir du nom et du sous-compte.
//
// Catalogue mondial de moyens de paiement, proposé à l'ajout (datalist).
// cat → sous-compte comptable : "cash" = Cash ; tout le reste = Bank.
export const PAYMENT_PRESETS = [
  {
    group: "Espèces, banque & carte",
    items: [
      { name: "Espèces", cat: "cash" },
      { name: "Virement bancaire", cat: "bank" },
      { name: "Dépôt bancaire", cat: "bank" },
      { name: "Chèque", cat: "cheque" },
      { name: "Carte Visa", cat: "card" },
      { name: "Carte Mastercard", cat: "card" },
      { name: "American Express", cat: "card" },
      { name: "UnionPay", cat: "card" },
      { name: "Verve", cat: "card" },
    ],
  },
  {
    group: "Mobile money — RDC & Afrique centrale",
    items: [
      { name: "M-Pesa", cat: "mobile" },
      { name: "Airtel Money", cat: "mobile" },
      { name: "Orange Money", cat: "mobile" },
      { name: "Africell Money", cat: "mobile" },
      { name: "Illicocash", cat: "mobile" },
      { name: "Maxicash", cat: "mobile" },
      { name: "Pepele Mobile", cat: "mobile" },
      { name: "EquityBCDC", cat: "bank" },
    ],
  },
  {
    group: "Mobile money — Afrique de l'Est",
    items: [
      { name: "Tigo Pesa", cat: "mobile" },
      { name: "T-Kash", cat: "mobile" },
      { name: "HaloPesa", cat: "mobile" },
      { name: "MTN Mobile Money", cat: "mobile" },
      { name: "Equitel", cat: "mobile" },
    ],
  },
  {
    group: "Mobile money — Afrique de l'Ouest",
    items: [
      { name: "MTN MoMo", cat: "mobile" },
      { name: "Moov Money", cat: "mobile" },
      { name: "Wave", cat: "mobile" },
      { name: "Free Money", cat: "mobile" },
      { name: "T-Money", cat: "mobile" },
      { name: "Vodafone Cash", cat: "mobile" },
      { name: "AirtelTigo Money", cat: "mobile" },
    ],
  },
  {
    group: "Mobile money — Afrique australe & Nigéria",
    items: [
      { name: "EcoCash", cat: "mobile" },
      { name: "OneMoney", cat: "mobile" },
      { name: "OPay", cat: "mobile" },
      { name: "PalmPay", cat: "mobile" },
      { name: "Paga", cat: "mobile" },
    ],
  },
  {
    group: "Portefeuilles & paiement en ligne",
    items: [
      { name: "PayPal", cat: "wallet" },
      { name: "Apple Pay", cat: "wallet" },
      { name: "Google Pay", cat: "wallet" },
      { name: "Samsung Pay", cat: "wallet" },
      { name: "Skrill", cat: "wallet" },
      { name: "Wise", cat: "wallet" },
      { name: "Payoneer", cat: "wallet" },
      { name: "Revolut", cat: "wallet" },
      { name: "Stripe", cat: "wallet" },
      { name: "Alipay", cat: "wallet" },
      { name: "WeChat Pay", cat: "wallet" },
    ],
  },
  {
    group: "Mobile money & wallets — Asie",
    items: [
      { name: "bKash", cat: "mobile" },
      { name: "Nagad", cat: "mobile" },
      { name: "Rocket", cat: "mobile" },
      { name: "Paytm", cat: "mobile" },
      { name: "PhonePe", cat: "mobile" },
      { name: "UPI", cat: "mobile" },
      { name: "GCash", cat: "mobile" },
      { name: "Maya", cat: "mobile" },
      { name: "OVO", cat: "mobile" },
      { name: "GoPay", cat: "mobile" },
      { name: "DANA", cat: "mobile" },
      { name: "TrueMoney", cat: "mobile" },
      { name: "ZaloPay", cat: "mobile" },
    ],
  },
];

const PM_ALL_PRESETS = PAYMENT_PRESETS.flatMap((g) => g.items);
export const PAYMENT_PRESET_NAMES = [...new Set(PM_ALL_PRESETS.map((i) => i.name))];
export const PAYMENT_PRESET_BY_NAME = Object.fromEntries(PM_ALL_PRESETS.map((i) => [i.name.toLowerCase(), i]));

const PM_PALETTE = ["#475569", "#ef4444", "#f59e0b", "#2563eb", "#0d9488", "#7c3aed", "#db2777", "#0891b2"];
// Noms du catalogue marqués « mobile » → flag fiable, plus quelques indices
// génériques pour les noms personnalisés saisis à la main.
const PM_MOBILE_NAMES = new Set(PM_ALL_PRESETS.filter((i) => i.cat === "mobile").map((i) => i.name.toLowerCase()));
const PM_MOBILE_HINTS = [
  "mpesa", "m-pesa", "pesa", "airtel", "orange", "mobile", "momo", "mtn", "moov",
  "wave", "vodacom", "vodafone", "money", "ecocash", "gcash", "bkash", "nagad",
  "paytm", "phonepe", "tigo", "wallet",
];

export function derivePaymentStyle(name, subAccount = "", index = 0) {
  const label = String(name || "Méthode").trim();
  const norm = label.toLowerCase();
  const hay = `${norm} ${String(subAccount || "").toLowerCase()}`;
  const letters = label.replace(/[^A-Za-zÀ-ÿ0-9]/g, "");
  return {
    color: PM_PALETTE[index % PM_PALETTE.length],
    short: (letters.slice(0, 2) || "··").toUpperCase(),
    mobile: PM_MOBILE_NAMES.has(norm) || PM_MOBILE_HINTS.some((h) => hay.includes(h)),
  };
}

// Normalise la réponse /payment-method (tableau direct ou { getAllPaymentMethod }).
export function paymentMethodRows(raw) {
  const list = Array.isArray(raw?.getAllPaymentMethod)
    ? raw.getAllPaymentMethod
    : Array.isArray(raw) ? raw : [];
  return list
    .map((m, i) => {
      const name = String(m.methodName || "").trim() || "Méthode";
      const subAccount = m.subAccount?.name || "";
      return {
        id: m.id,
        name,
        subAccount,
        ownerAccount: m.ownerAccount || "",
        instruction: m.instruction || "",
        active: m.status === "true" || m.status === true || m.status === 1,
        locked: m.id === 1, // id 1 protégé côté backend (pas de suppression/renommage)
        ...derivePaymentStyle(name, subAccount, i),
      };
    })
    .filter((m) => m.id != null);
}
