// Formatting + currency helpers.
// Copied from PropertyManagement.jsx — keep both in sync during the soft migration.

import { currencySymbolFallbacks } from "./constants";

export const money = (value) =>
  Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const decodeCurrencyText = (value) => {
  const text = String(value || "");
  return text.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&")
    .replace(/&euro;/gi, "€")
    .replace(/&pound;/gi, "£")
    .replace(/&yen;/gi, "¥")
    .replace(/â‚¬/g, "€")
    .replace(/à§³/g, "৳")
    .replace(/Â£/g, "£")
    .replace(/â‚¹/g, "₹")
    .replace(/Â¥/g, "¥")
    .replace(/â‚©/g, "₩")
    .replace(/â‚±/g, "₱")
    .replace(/â‚º/g, "₺")
    .replace(/â‚£/g, "₣")
    .replace(/â‚½/g, "₽");
};

export const cleanCurrencySymbol = (currency) => {
  const name = String(currency?.currencyName || "").toUpperCase();
  const rawSymbol = String(currency?.currencySymbol || "");
  const decoded = decodeCurrencyText(rawSymbol).trim();
  if (name.includes("FRANC CONGOLAIS")) return "FC";
  if (/&#|&[a-z]+;|Â|â|à/i.test(rawSymbol) && currencySymbolFallbacks[name]) {
    return currencySymbolFallbacks[name];
  }
  if (decoded && !/[&;Ââà]/.test(decoded)) return decoded;
  return currencySymbolFallbacks[name] || decoded || "";
};

export const getCurrencyValue = (currency) => currency?.currencyId ?? currency?.id;

export const optionalNumber = (value) =>
  value === undefined || value === null || value === "" ? undefined : Number(value);

export const buildCurrencyOptions = (currencies) =>
  currencies
    .map((currency) => {
      const value = getCurrencyValue(currency);
      if (value === undefined || value === null) return null;
      const name = decodeCurrencyText(currency?.currencyName).trim();
      const symbol = cleanCurrencySymbol(currency);
      return {
        label: symbol ? `${name} (${symbol})` : name,
        value,
      };
    })
    .filter(Boolean);

export const compactMoney = (value, symbol) =>
  `${decodeCurrencyText(symbol || "CDF")} ${Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })}`;

export const shortMoney = (value, symbol) => {
  const amount = Number(value || 0);
  const sym = symbol || "CDF";
  if (Math.abs(amount) >= 1000000) {
    const millions = amount / 1000000;
    const formatted = Number.isInteger(millions) ? millions.toFixed(0) : millions.toFixed(1);
    return `${sym} ${formatted}M`;
  }
  if (Math.abs(amount) >= 1000) return `${sym} ${Math.round(amount / 1000)}K`;
  return compactMoney(amount, sym);
};

export const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
