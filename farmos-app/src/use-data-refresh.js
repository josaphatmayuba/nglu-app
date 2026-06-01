import React from "react";

// Bump un compteur quand l'une des tables passées est invalidée par une
// mutation (event farmos:data-changed) ou quand l'onglet redevient visible.
// À utiliser comme dépendance d'un useEffect pour relancer le fetch.
//
//   const reload = useDataRefresh(["medicines", "expenses"]);
//   React.useEffect(() => { fetchData(); }, [reload]);
export function useDataRefresh(tables) {
  const [tick, setTick] = React.useState(0);
  const key = tables.join(",");
  React.useEffect(() => {
    const bumpIfTableChanged = (changed) => {
      const list = Array.isArray(changed) ? changed : [changed];
      if (list.some((t) => tables.includes(t))) setTick((n) => n + 1);
    };
    const onChange = (e) => {
      const changed = e.detail?.tables || [];
      bumpIfTableChanged(changed);
    };
    const onCacheUpdated = (e) => {
      bumpIfTableChanged(e.detail);
    };
    const onVisible = () => { if (document.visibilityState === "visible") setTick((n) => n + 1); };
    window.addEventListener("farmos:data-changed", onChange);
    window.addEventListener("farmos:cache-updated", onCacheUpdated);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("farmos:data-changed", onChange);
      window.removeEventListener("farmos:cache-updated", onCacheUpdated);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return tick;
}
