import React from "react";
import { currencyOptions } from "./currency";

export function AmountCurrencyInput({
  amount,
  onAmountChange,
  currencyId,
  onCurrencyChange,
  currencies = [],
  placeholder = "ex. 850000",
  min = "0",
  step = "0.01",
  disabled = false,
  amountDisabled = false,
  amountReadOnly = false,
  currencyDisabled = false,
  required = false,
  style,
}) {
  const amountLocked = disabled || amountDisabled;
  const currencyLocked = disabled || currencyDisabled;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        width: "100%",
        minWidth: 0,
        height: 42,
        marginTop: 4,
        border: "1px solid var(--border-2)",
        borderRadius: 10,
        overflow: "hidden",
        background: disabled ? "var(--bg-sunken)" : "var(--paper)",
        ...style,
      }}
    >
      <input
        className="mono"
        type="number"
        min={min}
        step={step}
        value={amount ?? ""}
        onChange={(e) => onAmountChange && onAmountChange(e.target.value)}
        placeholder={placeholder}
        disabled={amountLocked}
        readOnly={amountReadOnly}
        required={required}
        style={{
          flex: "1 1 auto",
          minWidth: 0,
          height: "100%",
          border: 0,
          outline: "none",
          background: amountLocked ? "var(--bg-sunken)" : "transparent",
          color: amountLocked ? "var(--fg-3)" : "var(--ink-950)",
          padding: "0 16px",
          fontFamily: "var(--font-mono)",
          fontSize: 14,
        }}
      />
      <select
        value={currencyId || ""}
        onChange={(e) => onCurrencyChange && onCurrencyChange(e.target.value ? Number(e.target.value) : "")}
        disabled={currencyLocked}
        aria-label="Currency"
        style={{
          flex: "0 0 112px",
          maxWidth: "42%",
          minWidth: 86,
          height: "100%",
          border: 0,
          borderLeft: "1px solid var(--border-1)",
          outline: "none",
          background: currencyLocked ? "var(--bg-sunken)" : "var(--paper)",
          color: currencyLocked ? "var(--fg-3)" : "#5b45ff",
          fontFamily: "var(--font-sans)",
          fontSize: 14,
          fontWeight: 700,
          padding: "0 12px",
          cursor: currencyLocked ? "not-allowed" : "pointer",
        }}
      >
        <option value="">---</option>
        {currencyOptions(currencies).map((currency) => (
          <option key={currency.id} value={currency.id}>{currency.label}</option>
        ))}
      </select>
    </div>
  );
}
