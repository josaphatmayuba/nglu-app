import React from "react";
import { Tooltip } from "antd";

const decodeText = (value) =>
  String(value || "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
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

const currencyCodeFallbacks = {
  FRANC_CONGOLAIS: "CDF",
  "FRANC CONGOLAIS": "CDF",
  DOLLAR: "USD",
  EURO: "EUR",
  POUND: "GBP",
  YEN: "JPY",
  RUPEE: "INR",
  WON: "KRW",
  YUAN: "CNY",
  PESO: "PHP",
  LIRA: "TRY",
  REAL: "BRL",
  RUBLE: "RUB",
  RINGGIT: "MYR",
  BDT: "BDT",
  CAD: "CAD",
};

const getCurrencyCode = (currency) => {
  if (!currency) return "N/A";

  // If already have currencyCode (ISO), use it directly
  const code = String(currency.currencyCode || currency.code || "").trim().toUpperCase();
  if (code && code.length === 3) return code;

  // Try to derive from currencyName
  const name = String(currency.currencyName || currency.name || "").trim().toUpperCase();
  if (currencyCodeFallbacks[name]) return currencyCodeFallbacks[name];

  // Last resort: decode symbol and try to guess
  const symbol = decodeText(currency.currencySymbol || currency.symbol || "");
  if (symbol === "$") return "USD";
  if (symbol === "€") return "EUR";
  if (symbol === "£") return "GBP";
  if (symbol === "¥") return "CNY";
  if (symbol === "₹") return "INR";
  if (symbol === "₩") return "KRW";
  if (symbol === "₱") return "PHP";
  if (symbol === "₺") return "TRY";
  if (symbol === "₣") return "FRF";
  if (symbol === "₽") return "RUB";

  return "N/A";
};

const formatNumber = (value, fractionDigits = 2) => {
  const num = Number(value || 0);
  return num.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
};

/**
 * FormattedAmount — Display amount + ISO currency code uniformly across the app.
 *
 * Props:
 *   amount: number — the monetary value
 *   currency: object | null — { currencyCode, currencyName, currencySymbol, ... }
 *   showSymbol: bool — also display the currency symbol (default: false)
 *   fractionDigits: number — decimal places (default: 2)
 *   compact: bool — hide decimals (0 fraction digits) (default: false)
 *   className: string — CSS class for the wrapper
 *   showTooltip: bool — show full currency name on hover (default: false)
 *
 * Output: "USD 1,234.56" or "USD 1,235" (compact) or "USD 1,234.56 ($)" (showSymbol)
 */
const FormattedAmount = ({
  amount,
  currency,
  showSymbol = false,
  fractionDigits = 2,
  compact = false,
  className = "",
  showTooltip = false,
  style,
}) => {
  const code = getCurrencyCode(currency);
  const symbol = showSymbol ? decodeText(currency?.currencySymbol || currency?.symbol || "") : "";
  const currencyName = currency?.currencyName || currency?.name || "";
  const digits = compact ? 0 : fractionDigits;
  const formatted = formatNumber(amount, digits);

  let displayText = `${code} ${formatted}`;
  if (symbol && symbol.trim()) {
    displayText += ` (${symbol})`;
  }

  if (showTooltip && currencyName) {
    return (
      <Tooltip title={currencyName}>
        <span className={className} style={style}>
          {displayText}
        </span>
      </Tooltip>
    );
  }

  return (
    <span className={className} style={style}>
      {displayText}
    </span>
  );
};

export default FormattedAmount;
