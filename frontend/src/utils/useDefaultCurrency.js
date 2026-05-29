import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";

import { getSetting } from "@/redux/rtk/features/setting/settingSlice";
import { loadAllCurrency } from "@/redux/rtk/features/eCommerce/currency/currencySlice";
import { cleanCurrencySymbol, decodeCurrencyText } from "@/components/propertyManagement/shared/format";

// Resolves the symbol of the company's default currency (Paramètres > Entreprise).
// Use this anywhere a money KPI would otherwise hardcode "CDF" so empty/zero
// states reflect the currency the company actually selected.
export function useDefaultCurrencySymbol(fallback = "CDF") {
  const dispatch = useDispatch();
  const settingData = useSelector((s) => s?.setting?.data);
  const currencyList = useSelector((s) => s?.currency?.list) || [];

  useEffect(() => {
    if (!settingData) dispatch(getSetting());
    if (!currencyList.length) dispatch(loadAllCurrency());
  }, [dispatch, settingData, currencyList.length]);

  return useMemo(() => {
    const id = settingData?.currencyId;
    if (id == null) return fallback;
    const currency = currencyList.find((c) => c?.id === id || c?.currencyId === id);
    if (!currency) return fallback;
    return cleanCurrencySymbol(currency) || decodeCurrencyText(currency.currencyCode || "").trim() || fallback;
  }, [settingData, currencyList, fallback]);
}
