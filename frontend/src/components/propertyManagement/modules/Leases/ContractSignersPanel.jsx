import axios from "axios";
import { message } from "antd";
import { useCallback, useEffect, useState } from "react";

const STATUS = {
  pending: { label: "En attente", color: "#888" },
  sent: { label: "Envoyé", color: "#fa8c16" },
  viewed: { label: "Vu", color: "#1677ff" },
  signed: { label: "Signé", color: "#52c41a" },
};
const ROLE = { principal: "Principal", cotenant: "Co-locataire" };

const btn = {
  minHeight: 44,
  minWidth: 44,
  padding: "0 14px",
  border: "1px solid #d9d9d9",
  borderRadius: 6,
  background: "#fff",
  cursor: "pointer",
  fontSize: 13,
  flex: "1 1 140px",
};

// Signataires d'un bail multi-locataires. Rien d'affiche pour 0 ou 1 signataire.
export default function ContractSignersPanel({ contract }) {
  const contractId = contract?.id;
  const [data, setData] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [links, setLinks] = useState({});

  const load = useCallback(async () => {
    if (!contractId) return;
    try {
      const res = await axios.get(`property-management/contracts/${contractId}/signers`);
      setData(res.data);
    } catch {
      setData(null);
    }
  }, [contractId]);

  useEffect(() => { load(); }, [load]);

  const signers = Array.isArray(data?.signers) ? data.signers : [];
  if (signers.length < 2) return null;

  const canResend = ["sent", "viewed"].includes(contract?.status);

  const resend = async (s) => {
    setBusyId(s.id);
    try {
      const res = await axios.post(`property-management/contracts/${contractId}/signers/${s.id}/resend`);
      if (res.data?.signingUrl) setLinks((prev) => ({ ...prev, [s.id]: res.data.signingUrl }));
      message.success(`Lien renvoyé à ${s.name || "ce signataire"}.`);
      load();
    } catch (e) {
      message.error(
        e.response?.status === 429
          ? "Un lien a déjà été renvoyé à ce signataire il y a moins de 10 minutes. Réessayez plus tard."
          : e.response?.data?.message || "Impossible de renvoyer le lien.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const copy = (url) =>
    navigator.clipboard.writeText(url).then(
      () => message.success("Lien de signature copié."),
      () => message.error("Copie impossible. Sélectionnez le lien manuellement."),
    );

  return (
    <section>
      <h3>Signataires · {data.signersSigned ?? 0}/{data.signersTotal ?? signers.length} signés</h3>
      {signers.map((s) => {
        const meta = STATUS[s.status] || STATUS.pending;
        return (
          <div key={s.id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid #eee" }}>
            <div style={{ flex: "1 1 140px", minWidth: 0 }}>
              <strong style={{ overflowWrap: "anywhere" }}>{s.name || "—"}</strong>
              <div style={{ fontSize: 12, color: "#888" }}>{ROLE[s.role] || s.role || ""}</div>
            </div>
            <span style={{ background: meta.color, color: "#fff", borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 600 }}>
              {meta.label}
            </span>
            {s.status !== "signed" && canResend && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, width: "100%" }}>
                <button type="button" style={btn} disabled={busyId === s.id} onClick={() => resend(s)}>
                  Renvoyer le lien
                </button>
                {links[s.id] && (
                  <button type="button" style={btn} onClick={() => copy(links[s.id])}>
                    Copier le lien
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
