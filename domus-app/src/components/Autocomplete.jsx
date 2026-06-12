// Autocomplete recherchable — remplace les <select> de listes de données.
// options = tableau de [value, label] (compatible LeaseSelect) OU [{ value, label }].
import React from "react";
import { X } from "lucide-react";

export function Autocomplete({ value, onChange, options, placeholder = "Choisir…", allowClear = true }) {
  const norm = (options || []).map((o) =>
    Array.isArray(o) ? { value: o[0], label: o[1] } : { value: o.value, label: o.label },
  );
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const wrapRef = React.useRef(null);
  const selected = norm.find((o) => String(o.value) === String(value));
  const display = open ? query : (selected ? selected.label : "");
  const q = query.trim().toLowerCase();
  const filtered = !open ? norm : (q ? norm.filter((o) => String(o.label).toLowerCase().includes(q)) : norm);

  React.useEffect(() => {
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) { setOpen(false); setQuery(""); } };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (o) => { onChange(o.value); setOpen(false); setQuery(""); };
  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <input
        className="domus-input"
        autoComplete="off"
        placeholder={placeholder}
        value={display}
        onFocus={() => { setQuery(""); setOpen(true); }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onKeyDown={(e) => { if (e.key === "Escape") { setOpen(false); setQuery(""); } else if (e.key === "Enter" && filtered.length) { e.preventDefault(); pick(filtered[0]); } }}
        style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--domus-border, #d8d5cc)", fontSize: 14 }}
      />
      {allowClear && value && !open && (
        <button type="button" onMouseDown={(e) => { e.preventDefault(); onChange(""); }} aria-label="effacer"
          style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "transparent", border: 0, cursor: "pointer", color: "#888", padding: 2, lineHeight: 1 }}>
          <X size={14} />
        </button>
      )}
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1px solid var(--domus-border, #d8d5cc)", borderRadius: 8, boxShadow: "0 8px 24px -8px rgba(20,16,40,0.18)", maxHeight: 240, overflowY: "auto", zIndex: 300 }}>
          {filtered.length === 0 && <div style={{ padding: "10px 12px", fontSize: 13, color: "#888" }}>—</div>}
          {filtered.map((o) => (
            <div key={o.value} onMouseDown={(e) => { e.preventDefault(); pick(o); }}
              style={{ padding: "9px 12px", fontSize: 14, cursor: "pointer", background: String(o.value) === String(value) ? "#f4f3ef" : "transparent" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f4f3ef")}
              onMouseLeave={(e) => (e.currentTarget.style.background = String(o.value) === String(value) ? "#f4f3ef" : "transparent")}>
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
