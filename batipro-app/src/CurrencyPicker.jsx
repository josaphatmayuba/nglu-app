import React from "react";

/* ── Sélecteur de devise autocomplete (maison, sans dépendance npm) ──────
   Remplace les <select> natifs de devise partout où un montant est saisi.
   - Filtre les devises actives (status===true/"true") sur code + nom, insensible
     casse/accents.
   - Affiche "CODE — Nom (symbole)" dans la liste ; le champ (hors focus)
     n'affiche que le code résolu depuis `value`.
   - Fermeture au clic extérieur. Tactile-friendly (pas de survol requis). */

// Plage Unicode des diacritiques combinants (U+0300-U+036F), construite par
// code point pour éviter tout souci d'encodage de fichier avec des caractères
// combinants littéraux.
const DIACRITICS_RE = new RegExp(`[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`, "g");
function norm(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(DIACRITICS_RE, "")
    .toLowerCase();
}

function activeCurrencies(currencies) {
  return (currencies || []).filter((c) => c.status === true || String(c.status) === "true");
}

function currencyId(c) {
  return c.currencyId ?? c.id;
}
function currencyLabel(c) {
  const code = c.currencyCode || c.currencyName || c.name || "";
  const name = c.currencyName || c.name || "";
  const symbol = c.currencySymbol || c.symbol || "";
  const suffix = [name && name !== code ? name : null, symbol || null].filter(Boolean).join(" ");
  return suffix ? `${code} — ${suffix}` : code;
}

export default function CurrencyPicker({ value, onChange, currencies, disabled, placeholder, required }) {
  const list = React.useMemo(() => activeCurrencies(currencies), [currencies]);
  const selected = React.useMemo(
    () => list.find((c) => String(currencyId(c)) === String(value)) || null,
    [list, value]
  );

  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const rootRef = React.useRef(null);

  React.useEffect(() => {
    function onDocClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("touchstart", onDocClick);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("touchstart", onDocClick);
    };
  }, []);

  const filtered = React.useMemo(() => {
    const q = norm(query);
    if (!q) return list;
    return list.filter((c) => {
      const code = norm(c.currencyCode || "");
      const name = norm(c.currencyName || c.name || "");
      return code.includes(q) || name.includes(q);
    });
  }, [list, query]);

  const displayValue = open ? query : (selected ? (selected.currencyCode || currencyLabel(selected)) : "");

  const pick = (c) => {
    onChange(String(currencyId(c)));
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <input
        type="text"
        value={displayValue}
        placeholder={placeholder || "Devise…"}
        disabled={disabled}
        required={required}
        autoComplete="off"
        onFocus={() => { setOpen(true); setQuery(""); }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        style={{ minHeight: 44 }}
      />
      {open && !disabled && (
        <div
          role="listbox"
          style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 40,
            background: "#fff", border: "1px solid var(--ink-200, #cbd5e1)", borderRadius: 8,
            boxShadow: "0 10px 30px rgba(0,0,0,.15)", maxHeight: 220, overflowY: "auto",
          }}
        >
          {!filtered.length ? (
            <div style={{ padding: "10px 12px", fontSize: 13, color: "var(--ink-500)" }}>Aucune devise trouvée</div>
          ) : (
            filtered.map((c) => (
              <button
                key={currencyId(c)}
                type="button"
                onClick={() => pick(c)}
                style={{
                  display: "block", width: "100%", textAlign: "left", padding: "10px 12px",
                  minHeight: 40, border: "none", background: String(currencyId(c)) === String(value) ? "var(--amber-50, #fffbeb)" : "transparent",
                  cursor: "pointer", fontSize: 13, fontWeight: 400,
                }}
              >
                {currencyLabel(c)}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
