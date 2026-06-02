// Domus — petit hook de fetch avec état loading/error + reload.
import { useCallback, useEffect, useState } from "react";

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
export function money(n, currency = "$") {
  const v = Number(n || 0);
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(".0", "")} M${currency}`;
  if (Math.abs(v) >= 1_000) return `${Math.round(v / 1000)} k${currency}`;
  return `${v.toLocaleString("fr-FR")} ${currency}`;
}
