// Combined amount + currency widget used wherever a form captures a money
// value. Renders an antd InputNumber side-by-side with a compact searchable
// currency selector so the two fields read as a single visual unit instead
// of two separate Form.Items.
//
// The amount is bound to its parent Form.Item via the standard value/onChange
// props. The currency lives in the same antd Form under `currencyField`
// (typically "currencyId" or "salary_currency_id"); render a hidden Form.Item
// for that name so it ships with form.getFieldsValue().

import { Form, InputNumber, Select } from "antd";
import "./MoneyInput.css";

const decodeText = (value) =>
  String(value || "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&")
    .replace(/&euro;/gi, "€")
    .replace(/&pound;/gi, "£")
    .replace(/&yen;/gi, "¥");

const cId = (c) => c?.id ?? c?.currencyId ?? c?.value;
const cCode = (c) => decodeText(c?.currencyCode || c?.code || "").trim();
const cSymbol = (c) => decodeText(c?.currencySymbol || c?.symbol || "").trim();
const cName = (c) => decodeText(c?.currencyName || c?.name || c?.label || "").trim();

const compactLabel = (c) => cCode(c) || cSymbol(c) || cName(c)?.slice(0, 3) || "—";

const optionLabel = (c) => {
  const code = cCode(c);
  const name = cName(c);
  const symbol = cSymbol(c);
  const main = code && name && !name.startsWith(`${code} `) ? `${code} — ${name}` : name || code;
  return symbol ? `${main} (${symbol})` : main;
};

const MoneyInput = ({
  value,
  onChange,
  currencies = [],
  form,
  currencyField = "currencyId",
  min = 0,
  placeholder,
  disabled,
  ...rest
}) => {
  const currencyId = Form.useWatch(currencyField, form);

  const options = currencies
    .map((c) => {
      const id = cId(c);
      if (id == null) return null;
      return {
        value: id,
        label: compactLabel(c),
        searchText: [optionLabel(c), cCode(c), cName(c), cSymbol(c)].join(" "),
        fullLabel: optionLabel(c),
      };
    })
    .filter(Boolean);

  return (
    <div className="nglu-money-input">
      <InputNumber
        value={value}
        onChange={onChange}
        min={min}
        placeholder={placeholder}
        disabled={disabled}
        className="nglu-money-amount"
        controls={false}
        {...rest}
      />
      <Select
        value={currencyId ?? undefined}
        onChange={(v) => form?.setFieldValue(currencyField, v ?? null)}
        disabled={disabled}
        showSearch
        popupMatchSelectWidth={260}
        optionFilterProp="searchText"
        filterOption={(input, opt) =>
          String(opt?.searchText || opt?.label || "").toLowerCase().includes(input.toLowerCase())
        }
        className="nglu-money-currency"
        placeholder="—"
        optionRender={(o) => (
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ minWidth: 36, color: "#52525b", fontWeight: 600 }}>{o.data.label}</span>
            <span style={{ color: "#71717a", fontSize: 12 }}>{o.data.fullLabel}</span>
          </span>
        )}
        options={options}
      />
    </div>
  );
};

export default MoneyInput;
