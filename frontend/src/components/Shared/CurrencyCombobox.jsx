import { Select } from "antd";
import { SearchOutlined } from "@ant-design/icons";

const decodeText = (value) =>
  String(value || "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&")
    .replace(/&euro;/gi, "€")
    .replace(/&pound;/gi, "£")
    .replace(/&yen;/gi, "¥");

const currencyValue = (currency) => currency?.currencyId ?? currency?.id ?? currency?.value;

const currencyCode = (currency) =>
  decodeText(currency?.currencyCode || currency?.code || currency?.currencyName || currency?.label)
    .split(" ")
    .shift()
    .replace(/[()]/g, "")
    .trim();

const currencyName = (currency) =>
  decodeText(currency?.currencyName || currency?.name || currency?.label || "").trim();

const currencySymbol = (currency) =>
  decodeText(currency?.currencySymbol || currency?.symbol || "").trim();

const currencyOptionLabel = (currency) => {
  const code = currencyCode(currency);
  const name = currencyName(currency);
  const symbol = currencySymbol(currency);
  const main = code && name && !name.startsWith(`${code} `) ? `${code} - ${name}` : name || code;
  return symbol ? `${main} (${symbol})` : main;
};

const buildCurrencyComboboxOptions = (currencies = []) =>
  currencies
    .map((currency) => {
      const value = currencyValue(currency);
      if (value === undefined || value === null) return null;
      const label = currencyOptionLabel(currency);
      const searchText = [
        label,
        currencyCode(currency),
        currencyName(currency),
        currencySymbol(currency),
      ].join(" ");
      return { value, label, searchText };
    })
    .filter(Boolean);

const CurrencyCombobox = ({
  currencies,
  options,
  placeholder = "Rechercher une devise",
  popupClassName,
  ...props
}) => {
  const normalizedOptions = buildCurrencyComboboxOptions(currencies || options || []);

  return (
    <Select
      {...props}
      showSearch
      options={normalizedOptions}
      placeholder={placeholder}
      optionFilterProp="searchText"
      suffixIcon={<SearchOutlined />}
      popupClassName={popupClassName}
      filterOption={(input, option) =>
        String(option?.searchText || option?.label || "")
          .toLowerCase()
          .includes(String(input || "").toLowerCase())
      }
    />
  );
};

export default CurrencyCombobox;
