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
    const onChange = (e) => {
      const changed = e.detail?.tables || [];
      if (changed.some((t) => tables.includes(t))) setTick((n) => n + 1);
    };
    const onVisible = () => { if (document.visibilityState === "visible") setTick((n) => n + 1); };
    window.addEventListener("farmos:data-changed", onChange);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("farmos:data-changed", onChange);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return tick;
}
