import { useMemo } from "react";
import { useSelector } from "react-redux";
import { sanitizeHtml } from "./sanitizeHtml";

export default function useCurrency() {
  const { data } = useSelector((state) => state.setting);

  return useMemo(() => {
    if (!data?.currency) return data?.currency;
    return {
      ...data.currency,
      currencySymbol: sanitizeHtml(data.currency.currencySymbol),
    };
  }, [data?.currency]);
}
