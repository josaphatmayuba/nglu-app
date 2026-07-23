import { useEffect, useMemo, useState } from "react";
import { Phone, Search, X } from "lucide-react";
import { api } from "../api.js";

// Choix du correspondant a appeler.
//
// Les discussions du chat sont des channels et des sujets, pas des tete-a-tete :
// il faut donc designer explicitement qui appeler. La liste se limite aux
// utilisateurs ayant acces a la discussion — le backend refuse tout autre appel.

export function CallPicker({ open, onClose, onPick, currentUserId }) {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.users()
      .then((list) => setUsers(list.filter((u) => u.id !== currentUserId)))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, [open, currentUserId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      `${u.firstName ?? ""} ${u.lastName ?? ""}`.toLowerCase().includes(q));
  }, [users, query]);

  if (!open) return null;

  return (
    <div className="call-picker-backdrop" onClick={onClose}>
      <div className="call-picker" onClick={(e) => e.stopPropagation()}>
        <div className="call-picker-head">
          <span>Appeler</span>
          <button className="call-picker-close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="call-picker-search">
          <Search size={14} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un collègue…"
          />
        </div>

        <div className="call-picker-list">
          {loading && <div className="call-picker-empty">Chargement…</div>}
          {!loading && filtered.length === 0 && (
            <div className="call-picker-empty">Aucun utilisateur</div>
          )}
          {filtered.map((u) => {
            const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || `Utilisateur ${u.id}`;
            return (
              <button
                key={u.id}
                className="call-picker-item"
                onClick={() => { onPick(u.id, name); onClose(); }}
              >
                <span className="call-picker-name">{name}</span>
                <Phone size={15} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
