import { useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

// Visionneuse plein ecran partagee (CSS .lightbox-* deja global dans app.css).
// items : [{ url, label }] ; index : photo courante ; onIndexChange : navigation.
export function Lightbox({ items, index, onIndexChange, onClose }) {
  const count = items?.length || 0;
  const current = count ? items[Math.max(0, Math.min(index, count - 1))] : null;

  const prev = useCallback(() => onIndexChange((index - 1 + count) % count), [index, count, onIndexChange]);
  const next = useCallback(() => onIndexChange((index + 1) % count), [index, count, onIndexChange]);

  // Clavier : Escape ferme, fleches naviguent (absent de la version du portail public).
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (count < 2) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      if (e.key === "ArrowRight") { e.preventDefault(); next(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, prev, next, count]);

  if (!current) return null;
  return (
    <div className="lightbox-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={current.label || ""}>
      <button className="lightbox-close" onClick={onClose} aria-label="Fermer"><X size={28} /></button>
      {count > 1 && (
        <button className="lightbox-nav lightbox-prev" onClick={(e) => { e.stopPropagation(); prev(); }} aria-label="Photo precedente">
          <ChevronLeft size={36} />
        </button>
      )}
      <img src={current.url} alt={current.label || ""} onClick={(e) => e.stopPropagation()} />
      {count > 1 && (
        <button className="lightbox-nav lightbox-next" onClick={(e) => { e.stopPropagation(); next(); }} aria-label="Photo suivante">
          <ChevronRight size={36} />
        </button>
      )}
      {count > 1 && <div className="lightbox-counter">{index + 1} / {count}{current.label ? ` · ${current.label}` : ""}</div>}
    </div>
  );
}
