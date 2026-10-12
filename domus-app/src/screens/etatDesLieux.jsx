// Domus — etats des lieux d'entree / sortie par bail : edition mobile, double signature,
// comparaison entree/sortie, impression. Photos chargees en blob via API authentifiee.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, ChevronDown, ChevronRight, Plus, Printer, Trash2, X } from "lucide-react";
import { api } from "../api.js";
import { t, tf } from "../i18n.js";
import { CONTRACT_PRINT_CSS, escapeHtml } from "../contractUtils.js";
import { useAuthenticatedImage } from "../useAuthenticatedImage.js";
import { SignaturePad } from "../components/SignaturePad.jsx";
import { useConfirm, useToast } from "../components/Dialog.jsx";

export const CONDITIONS = [
  ["new", "Neuf", "#15803d"],
  ["good", "Bon", "#65a30d"],
  ["fair", "Passable", "#ca8a04"],
  ["poor", "Mauvais", "#ea580c"],
  ["damaged", "Dégradé", "#dc2626"],
  ["na", "N/A", "#71717a"],
];
const COND_LABEL = Object.fromEntries(CONDITIONS.map(([k, l]) => [k, l]));
const COND_COLOR = Object.fromEntries(CONDITIONS.map(([k, , c]) => [k, c]));
const METERS = [["water", "Eau"], ["electricity", "Électricité"], ["gas", "Gaz"]];

const condLabel = (c) => (c ? t(COND_LABEL[c] || c) : "—");
const todayISO = () => new Date().toISOString().slice(0, 10);
const dateOnly = (v) => (v ? String(v).slice(0, 10) : "");
export const inspectionTypeLabel = (type) => (type === "exit" ? t("État des lieux de sortie") : t("État des lieux d'entrée"));
const leaseTenantName = (l) =>
  [l?.tenantFirstName, l?.tenantLastName].filter(Boolean).join(" ") || l?.tenantName || "";

// Reduit une signature PNG (canvas 520x180 ou image importee) pour rester sous la limite JSON de 100 Ko.
async function shrinkSignature(dataUrl) {
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });
  let w = Math.min(360, img.width);
  for (let attempt = 0; attempt < 5; attempt++) {
    const h = Math.max(1, Math.round((img.height * w) / img.width));
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const out = c.toDataURL("image/png");
    if (out.length < 80000) return out;
    w = Math.round(w * 0.7);
  }
  throw new Error(t("Signature trop volumineuse."));
}

function Thumb({ photo, onDelete, readOnly }) {
  const { src, error } = useAuthenticatedImage(`/inspections/photos/${photo.id}/file`);
  const [big, setBig] = useState(false);
  return (
    <span className="edl-thumb">
      {src ? <img src={src} alt={photo.originalName || ""} onClick={() => setBig(true)} /> : <span className="edl-thumb-ph">{error ? "!" : "…"}</span>}
      {!readOnly && onDelete && (
        <button type="button" className="edl-thumb-del" aria-label={t("Supprimer")} onClick={() => onDelete(photo)}><X size={14} /></button>
      )}
      {big && src && (
        <div className="edl-lightbox" onClick={() => setBig(false)} role="dialog">
          <img src={src} alt="" />
        </div>
      )}
    </span>
  );
}

function mergeFromServer(server) {
  return { ...server, items: server.items || [], photos: server.photos || [] };
}

// ── Editeur ─────────────────────────────────────────────────────────────────

export function InspectionEditor({ inspectionId, lease, onClose, onChanged }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [insp, setInsp] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState("edit");
  const [open, setOpen] = useState({});
  const [lSig, setLSig] = useState(null);
  const [tSig, setTSig] = useState(null);
  const [lName, setLName] = useState("");
  const [tName, setTName] = useState(leaseTenantName(lease));
  const tempId = useRef(-1);
  const fileRef = useRef(null);
  const photoTarget = useRef(null);
  const inspRef = useRef(null);
  inspRef.current = insp;

  const load = useCallback(async () => {
    try {
      setInsp(mergeFromServer(await api.inspection(inspectionId)));
    } catch (e) {
      setError(e.message || String(e));
    }
  }, [inspectionId]);
  useEffect(() => { load(); }, [load]);

  const signed = insp?.status === "signed";
  const readOnly = signed;

  const patchLocal = (fn) => setInsp((cur) => fn(cur));
  const setItem = (id, patch) => patchLocal((cur) => ({ ...cur, items: cur.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));

  // Envoie l'etat courant (en-tete, compteurs, cles, elements). Jamais de photo ni de base64.
  const save = useCallback(async (quiet = false) => {
    const cur = inspRef.current;
    if (!cur || cur.status === "signed") return cur;
    setBusy(true);
    try {
      const body = {
        inspectionDate: dateOnly(cur.inspectionDate) || undefined,
        generalNotes: cur.generalNotes ?? "",
        meters: cur.meters || {},
        keysHanded: (cur.keysHanded || []).filter((k) => k.label?.trim()).map((k) => ({ label: k.label.trim(), count: Number(k.count) || 0 })),
        items: cur.items.map((i, idx) => ({
          ...(i.id > 0 ? { id: i.id } : {}),
          room: i.room,
          element: i.element,
          condition: i.condition,
          remarks: i.remarks || "",
          sortOrder: idx,
          ...(i._removed ? { isDeleted: true } : {}),
        })).filter((i) => !(i.isDeleted && i.id == null)),
      };
      const server = mergeFromServer(await api.updateInspection(cur.id, body));
      setInsp(server);
      inspRef.current = server;
      onChanged?.();
      if (!quiet) toast.success(t("Enregistré."));
      return server;
    } catch (e) {
      toast.error(e.message || String(e));
      throw e;
    } finally {
      setBusy(false);
    }
  }, [onChanged, toast]);

  const rooms = useMemo(() => {
    const map = new Map();
    for (const it of insp?.items || []) {
      if (it._removed) continue;
      if (!map.has(it.room)) map.set(it.room, []);
      map.get(it.room).push(it);
    }
    return [...map.entries()];
  }, [insp]);

  const addRoom = () => {
    const name = window.prompt(t("Nom de la pièce"));
    if (!name?.trim()) return;
    patchLocal((cur) => ({ ...cur, items: [...cur.items, { id: tempId.current--, room: name.trim(), element: t("Général"), condition: cur.type === "exit" ? "na" : "good", remarks: "" }] }));
    setOpen((o) => ({ ...o, [name.trim()]: true }));
  };
  const addElement = (room) => {
    const name = window.prompt(t("Nom de l'élément"));
    if (!name?.trim()) return;
    patchLocal((cur) => ({ ...cur, items: [...cur.items, { id: tempId.current--, room, element: name.trim(), condition: cur.type === "exit" ? "na" : "good", remarks: "" }] }));
  };
  const removeItem = (id) =>
    patchLocal((cur) => ({ ...cur, items: id < 0 ? cur.items.filter((i) => i.id !== id) : cur.items.map((i) => (i.id === id ? { ...i, _removed: true } : i)) }));
  const removeRoom = async (room) => {
    if (!(await confirm({ title: t("Retirer la pièce"), message: tf("Retirer la pièce {room} et ses éléments ?", { room }), confirmLabel: t("Retirer") }))) return;
    patchLocal((cur) => ({
      ...cur,
      items: cur.items.filter((i) => !(i.room === room && i.id < 0)).map((i) => (i.room === room ? { ...i, _removed: true } : i)),
    }));
  };

  const pickPhoto = (itemId) => {
    photoTarget.current = itemId;
    fileRef.current?.click();
  };
  const onPhotoFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      // Les elements nouveaux doivent exister cote serveur avant d'y rattacher une photo.
      const hasUnsaved = inspRef.current.items.some((i) => i.id < 0);
      let itemId = photoTarget.current;
      let room = null;
      let element = null;
      if (itemId != null && itemId < 0) {
        const it = inspRef.current.items.find((i) => i.id === itemId);
        room = it?.room; element = it?.element;
      }
      if (hasUnsaved || itemId == null) await save(true);
      if (room) {
        const found = inspRef.current.items.find((i) => i.room === room && i.element === element && i.id > 0);
        itemId = found?.id ?? null;
      }
      const photo = await api.uploadInspectionPhoto(inspRef.current.id, file, itemId);
      patchLocal((cur) => ({ ...cur, photos: [...cur.photos, photo] }));
    } catch (err) {
      toast.error(err.message || String(err));
    } finally {
      setBusy(false);
    }
  };
  const deletePhoto = async (photo) => {
    try {
      await api.deleteInspectionPhoto(photo.id);
      patchLocal((cur) => ({ ...cur, photos: cur.photos.filter((p) => p.id !== photo.id) }));
    } catch (err) {
      toast.error(err.message || String(err));
    }
  };

  const sign = async (role) => {
    const raw = role === "landlord" ? lSig : tSig;
    const name = (role === "landlord" ? lName : tName).trim();
    if (!raw) return toast.error(t("Signature requise."));
    if (!name) return toast.error(t("Nom du signataire requis."));
    setBusy(true);
    try {
      await save(true);
      const signatureData = await shrinkSignature(raw);
      const server = mergeFromServer(await api.signInspection(inspRef.current.id, { role, signatureData, signerName: name }));
      setInsp(server);
      onChanged?.();
      toast.success(server.status === "signed" ? t("État des lieux signé et verrouillé.") : t("Signature enregistrée."));
    } catch (err) {
      toast.error(err.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  const close = async () => {
    if (insp && !signed) {
      try { await save(true); } catch { return; }
    }
    onClose();
  };

  if (error) return <div className="edl-screen"><div className="edl-body"><p className="domus-floating-error">{error}</p><button className="immo-btn" onClick={onClose}>{t("Fermer")}</button></div></div>;
  if (!insp) return <div className="edl-screen"><div className="edl-body"><p>{t("Chargement…")}</p></div></div>;

  const photosOf = (itemId) => insp.photos.filter((p) => p.itemId === itemId);
  const generalPhotos = insp.photos.filter((p) => p.itemId == null);
  const keys = insp.keysHanded || [];

  return (
    <div className="edl-screen" role="dialog" aria-label={inspectionTypeLabel(insp.type)}>
      <div className="edl-head">
        <button type="button" className="edl-back" onClick={close} aria-label={t("Fermer")}><X size={20} /></button>
        <div className="edl-head-title">
          <strong>{inspectionTypeLabel(insp.type)}</strong>
          <small>{leaseTenantName(lease)}{signed ? ` · ${t("Signé")}` : ""}</small>
        </div>
        <button type="button" className="edl-btn" onClick={() => openInspectionPrint(insp, lease)} aria-label={t("Imprimer")}><Printer size={18} /></button>
      </div>
      <div className="edl-tabs">
        <button type="button" className={step === "edit" ? "on" : ""} onClick={() => setStep("edit")}>{t("Relevé")}</button>
        <button type="button" className={step === "sign" ? "on" : ""} onClick={async () => { if (!signed) { try { await save(true); } catch { return; } } setStep("sign"); }}>{t("Signatures")}</button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onPhotoFile} />

      <div className="edl-body">
        {step === "edit" && (
          <>
            <section className="edl-card">
              <label className="immo-field"><span>{t("Date")}</span>
                <input type="date" disabled={readOnly} value={dateOnly(insp.inspectionDate) || todayISO()} onChange={(e) => patchLocal((c) => ({ ...c, inspectionDate: e.target.value }))} /></label>
              <label className="immo-field"><span>{t("Remarques générales")}</span>
                <textarea rows={3} disabled={readOnly} value={insp.generalNotes || ""} onChange={(e) => patchLocal((c) => ({ ...c, generalNotes: e.target.value }))} /></label>
            </section>

            <section className="edl-card">
              <h3>{t("Compteurs")}</h3>
              <div className="edl-meters">
                {METERS.map(([k, label]) => (
                  <label key={k} className="immo-field"><span>{t(label)}</span>
                    <input inputMode="decimal" disabled={readOnly} value={insp.meters?.[k] ?? ""}
                      onChange={(e) => patchLocal((c) => ({ ...c, meters: { ...(c.meters || {}), [k]: e.target.value } }))} /></label>
                ))}
              </div>
            </section>

            <section className="edl-card">
              <h3>{t("Clés remises")}</h3>
              {keys.map((k, idx) => (
                <div key={idx} className="edl-key-row">
                  <input disabled={readOnly} placeholder={t("Libellé (ex. Porte d'entrée)")} value={k.label}
                    onChange={(e) => patchLocal((c) => ({ ...c, keysHanded: c.keysHanded.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)) }))} />
                  <input type="number" min="0" inputMode="numeric" disabled={readOnly} value={k.count}
                    onChange={(e) => patchLocal((c) => ({ ...c, keysHanded: c.keysHanded.map((x, i) => (i === idx ? { ...x, count: e.target.value } : x)) }))} />
                  {!readOnly && <button type="button" className="edl-btn" aria-label={t("Retirer")} onClick={() => patchLocal((c) => ({ ...c, keysHanded: c.keysHanded.filter((_, i) => i !== idx) }))}><Trash2 size={16} /></button>}
                </div>
              ))}
              {!readOnly && <button type="button" className="immo-btn edl-tap" onClick={() => patchLocal((c) => ({ ...c, keysHanded: [...(c.keysHanded || []), { label: "", count: 1 }] }))}><Plus size={15} /> {t("Ajouter une clé")}</button>}
            </section>

            {rooms.map(([room, items]) => {
              const isOpen = open[room];
              const degradedCount = items.filter((i) => i.condition === "poor" || i.condition === "damaged").length;
              return (
                <section key={room} className="edl-card edl-room">
                  <button type="button" className="edl-room-head" onClick={() => setOpen((o) => ({ ...o, [room]: !o[room] }))} aria-expanded={!!isOpen}>
                    {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    <strong>{room}</strong>
                    <small>{items.length} {t("élément(s)")}{degradedCount ? ` · ${degradedCount} ⚠` : ""}</small>
                  </button>
                  {isOpen && (
                    <div className="edl-room-body">
                      {items.map((it) => (
                        <div key={it.id} className="edl-item">
                          <div className="edl-item-title">
                            <strong>{it.element}</strong>
                            {!readOnly && <button type="button" className="edl-btn" aria-label={t("Retirer")} onClick={() => removeItem(it.id)}><Trash2 size={16} /></button>}
                          </div>
                          <div className="edl-conds" role="group" aria-label={t("État")}>
                            {CONDITIONS.map(([k, label, color]) => (
                              <button key={k} type="button" disabled={readOnly}
                                className={`edl-cond${it.condition === k ? " on" : ""}`}
                                style={it.condition === k ? { background: color, borderColor: color, color: "#fff" } : undefined}
                                onClick={() => setItem(it.id, { condition: k })}>{t(label)}</button>
                            ))}
                          </div>
                          <textarea rows={2} disabled={readOnly} placeholder={t("Remarques")} value={it.remarks || ""} onChange={(e) => setItem(it.id, { remarks: e.target.value })} />
                          <div className="edl-photos">
                            {photosOf(it.id).map((p) => <Thumb key={p.id} photo={p} readOnly={readOnly} onDelete={deletePhoto} />)}
                            {!readOnly && <button type="button" className="edl-btn edl-photo-add" disabled={busy} onClick={() => pickPhoto(it.id)} aria-label={t("Ajouter une photo")}><Camera size={18} /></button>}
                          </div>
                        </div>
                      ))}
                      {!readOnly && (
                        <div className="edl-room-actions">
                          <button type="button" className="immo-btn edl-tap" onClick={() => addElement(room)}><Plus size={15} /> {t("Ajouter un élément")}</button>
                          <button type="button" className="immo-btn edl-tap" onClick={() => removeRoom(room)}><Trash2 size={15} /> {t("Retirer la pièce")}</button>
                        </div>
                      )}
                    </div>
                  )}
                </section>
              );
            })}
            {!readOnly && <button type="button" className="immo-btn edl-tap" onClick={addRoom}><Plus size={15} /> {t("Ajouter une pièce")}</button>}

            <section className="edl-card">
              <h3>{t("Photos générales")}</h3>
              <div className="edl-photos">
                {generalPhotos.map((p) => <Thumb key={p.id} photo={p} readOnly={readOnly} onDelete={deletePhoto} />)}
                {!readOnly && <button type="button" className="edl-btn edl-photo-add" disabled={busy} onClick={() => pickPhoto(null)} aria-label={t("Ajouter une photo")}><Camera size={18} /></button>}
              </div>
            </section>
          </>
        )}

        {step === "sign" && (
          <>
            {[["landlord", t("Bailleur"), lSig, setLSig, lName, setLName, insp.landlordSignatureData, insp.landlordSignerName, insp.landlordSignedAt],
              ["tenant", t("Locataire"), tSig, setTSig, tName, setTName, insp.tenantSignatureData, insp.tenantSignerName, insp.tenantSignedAt]]
              .map(([role, label, sig, setSig, name, setName, savedSig, savedName, savedAt]) => (
                <section key={role} className="edl-card">
                  <h3>{label}</h3>
                  {savedSig ? (
                    <div>
                      <img className="edl-sig-img" src={savedSig} alt={label} />
                      <p className="muted">{savedName} · {dateOnly(savedAt)}</p>
                    </div>
                  ) : readOnly ? (
                    <p className="muted">{t("Non signé")}</p>
                  ) : (
                    <>
                      <label className="immo-field"><span>{t("Nom du signataire")}</span>
                        <input value={name} onChange={(e) => setName(e.target.value)} /></label>
                      <SignaturePad value={sig} onChange={setSig} onError={(m) => toast.error(m)} />
                      <button type="button" className="immo-btn primary edl-tap" disabled={busy || !sig} onClick={() => sign(role)}>{t("Signer")}</button>
                    </>
                  )}
                </section>
              ))}
            {!signed && <p className="muted">{t("Une fois les deux signatures posées, l'état des lieux est verrouillé.")}</p>}
          </>
        )}
      </div>

      {!readOnly && step === "edit" && (
        <div className="edl-foot">
          <button type="button" className="immo-btn primary edl-tap" disabled={busy} onClick={() => save(false).catch(() => {})}>{busy ? t("Enregistrement…") : t("Enregistrer")}</button>
        </div>
      )}
    </div>
  );
}

// ── Ouverture / creation depuis le menu des baux ────────────────────────────

export function InspectionLauncher({ lease, type, onClose }) {
  const toast = useToast();
  const [id, setId] = useState(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await api.leaseInspections(lease.id);
        const existing = list.find((i) => i.type === type);
        const target = existing || (await api.createInspection(lease.id, { type, inspectionDate: todayISO() }));
        if (!cancelled) setId(target.id);
      } catch (e) {
        toast.error(e.message || String(e));
        if (!cancelled) onClose();
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lease.id, type]);
  if (!id) return <div className="edl-screen"><div className="edl-body"><p>{t("Chargement…")}</p></div></div>;
  return <InspectionEditor inspectionId={id} lease={lease} onClose={onClose} />;
}

// ── Comparaison ─────────────────────────────────────────────────────────────

function CompareThumbs({ photos }) {
  if (!photos?.length) return <span className="muted">—</span>;
  return <span className="edl-photos">{photos.map((p) => <Thumb key={p.id} photo={p} readOnly />)}</span>;
}

export function InspectionComparison({ lease, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api.inspectionComparison(lease.id).then(setData).catch((e) => setError(e.message || String(e)));
  }, [lease.id]);

  return (
    <div className="edl-screen" role="dialog" aria-label={t("Comparer entrée / sortie")}>
      <div className="edl-head">
        <button type="button" className="edl-back" onClick={onClose} aria-label={t("Fermer")}><X size={20} /></button>
        <div className="edl-head-title"><strong>{t("Comparaison entrée / sortie")}</strong><small>{leaseTenantName(lease)}</small></div>
      </div>
      <div className="edl-body">
        {error && <p className="domus-floating-error">{error}</p>}
        {!data && !error && <p>{t("Chargement…")}</p>}
        {data && (
          <>
            <section className="edl-card">
              <p>
                <strong>{data.summary.degraded}</strong> {t("élément(s) dégradé(s)")} · <strong>{data.summary.changed}</strong> {t("modifié(s)")} / {data.summary.total}
                {data.summary.missingKeys > 0 && <> · <span className="edl-badge">{tf("{n} clé(s) manquante(s)", { n: data.summary.missingKeys })}</span></>}
              </p>
              {data.exit.status !== "signed" && <p className="muted">{t("L'état des lieux de sortie n'est pas encore signé.")}</p>}
            </section>

            <section className="edl-card">
              <h3>{t("Compteurs")}</h3>
              {data.meters.map((m) => (
                <div key={m.kind} className="edl-cmp-row">
                  <strong>{t(METERS.find(([k]) => k === m.kind)?.[1] || m.kind)}</strong>
                  <span>{m.entry ?? "—"} → {m.exit ?? "—"}</span>
                  <span>{m.consumption != null ? `Δ ${m.consumption}` : ""}</span>
                </div>
              ))}
            </section>

            {data.keys.length > 0 && (
              <section className="edl-card">
                <h3>{t("Clés")}</h3>
                {data.keys.map((k) => (
                  <div key={k.label} className="edl-cmp-row">
                    <strong>{k.label}</strong>
                    <span>{k.entryCount} → {k.exitCount}</span>
                    {k.missing > 0 && <span className="edl-badge">{tf("{n} manquante(s)", { n: k.missing })}</span>}
                  </div>
                ))}
              </section>
            )}

            <div className="edl-cmp-cards">
              {data.items.map((i, idx) => (
                <section key={idx} className={`edl-card edl-cmp-card${i.degraded ? " degraded" : ""}`}>
                  <div className="edl-item-title">
                    <strong>{i.room} · {i.element}</strong>
                    {i.degraded && <span className="edl-badge">{t("Dégradé")}</span>}
                  </div>
                  <div className="edl-cmp-sides">
                    <div>
                      <small>{t("Entrée")}</small>
                      <div><span className="edl-pill" style={{ background: COND_COLOR[i.entryCondition] || "#a1a1aa" }}>{condLabel(i.entryCondition)}</span></div>
                      {i.entryRemarks && <p>{i.entryRemarks}</p>}
                      <CompareThumbs photos={i.entryPhotos} />
                    </div>
                    <div>
                      <small>{t("Sortie")}</small>
                      <div><span className="edl-pill" style={{ background: COND_COLOR[i.exitCondition] || "#a1a1aa" }}>{condLabel(i.exitCondition)}</span></div>
                      {i.exitRemarks && <p>{i.exitRemarks}</p>}
                      <CompareThumbs photos={i.exitPhotos} />
                    </div>
                  </div>
                </section>
              ))}
            </div>

            <table className="edl-cmp-table">
              <thead>
                <tr><th>{t("Pièce")}</th><th>{t("Élément")}</th><th>{t("Entrée")}</th><th>{t("Sortie")}</th><th>{t("Photos avant")}</th><th>{t("Photos après")}</th></tr>
              </thead>
              <tbody>
                {data.items.map((i, idx) => (
                  <tr key={idx} className={i.degraded ? "degraded" : ""}>
                    <td>{i.room}</td>
                    <td>{i.element}{i.degraded && <> <span className="edl-badge">{t("Dégradé")}</span></>}</td>
                    <td><span className="edl-pill" style={{ background: COND_COLOR[i.entryCondition] || "#a1a1aa" }}>{condLabel(i.entryCondition)}</span>{i.entryRemarks && <div className="muted">{i.entryRemarks}</div>}</td>
                    <td><span className="edl-pill" style={{ background: COND_COLOR[i.exitCondition] || "#a1a1aa" }}>{condLabel(i.exitCondition)}</span>{i.exitRemarks && <div className="muted">{i.exitRemarks}</div>}</td>
                    <td><CompareThumbs photos={i.entryPhotos} /></td>
                    <td><CompareThumbs photos={i.exitPhotos} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}

// ── Section dans le detail du bail ──────────────────────────────────────────

export function LeaseInspectionsSection({ lease }) {
  const [list, setList] = useState([]);
  const [err, setErr] = useState("");
  const [view, setView] = useState(null); // { kind: "edit", id } | { kind: "compare" }
  const load = useCallback(() => {
    api.leaseInspections(lease.id).then(setList).catch((e) => setErr(e.message || String(e)));
  }, [lease.id]);
  useEffect(() => { load(); }, [load]);
  const hasBoth = list.some((i) => i.type === "entry") && list.some((i) => i.type === "exit");

  return (
    <div className="domus-detail-notes">
      <p><strong>{t("États des lieux")}</strong></p>
      {err && <div className="domus-floating-error">{err}</div>}
      {list.length === 0 && !err && <p className="muted">{t("Aucun état des lieux.")}</p>}
      <ul className="domus-lease-documents">
        {list.map((i) => (
          <li key={i.id}>
            <button type="button" className="immo-linklike" onClick={() => setView({ kind: "edit", id: i.id })}>
              {inspectionTypeLabel(i.type)} · {dateOnly(i.inspectionDate)} · {i.status === "signed" ? t("Signé") : t("Brouillon")}
            </button>
          </li>
        ))}
      </ul>
      <div className="edl-room-actions">
        {!list.some((i) => i.type === "entry") && <button type="button" className="immo-btn edl-tap" onClick={() => setView({ kind: "launch", type: "entry" })}>{t("État des lieux d'entrée")}</button>}
        {!list.some((i) => i.type === "exit") && <button type="button" className="immo-btn edl-tap" onClick={() => setView({ kind: "launch", type: "exit" })}>{t("État des lieux de sortie")}</button>}
        {hasBoth && <button type="button" className="immo-btn edl-tap" onClick={() => setView({ kind: "compare" })}>{t("Comparer")}</button>}
      </div>
      {view?.kind === "edit" && <InspectionEditor inspectionId={view.id} lease={lease} onChanged={load} onClose={() => { setView(null); load(); }} />}
      {view?.kind === "launch" && <InspectionLauncher lease={lease} type={view.type} onClose={() => { setView(null); load(); }} />}
      {view?.kind === "compare" && <InspectionComparison lease={lease} onClose={() => setView(null)} />}
    </div>
  );
}

// ── Impression ──────────────────────────────────────────────────────────────

export function inspectionPrintHtml(insp, lease) {
  const rooms = new Map();
  for (const it of insp.items || []) {
    if (!rooms.has(it.room)) rooms.set(it.room, []);
    rooms.get(it.room).push(it);
  }
  const photoCount = (id) => (insp.photos || []).filter((p) => p.itemId === id).length;
  const meters = METERS.map(([k, l]) => `<tr><td>${escapeHtml(l)}</td><td>${escapeHtml(String(insp.meters?.[k] ?? "—"))}</td></tr>`).join("");
  const keys = (insp.keysHanded || []).map((k) => `<tr><td>${escapeHtml(k.label)}</td><td>${escapeHtml(String(k.count))}</td></tr>`).join("");
  const roomsHtml = [...rooms.entries()].map(([room, items]) => `
    <h3>${escapeHtml(room)}</h3>
    <table class="edl-print-table"><thead><tr><th>Élément</th><th>État</th><th>Remarques</th><th>Photos</th></tr></thead><tbody>
    ${items.map((i) => `<tr><td>${escapeHtml(i.element)}</td><td>${escapeHtml(COND_LABEL[i.condition] || i.condition)}</td><td>${escapeHtml(i.remarks || "")}</td><td>${photoCount(i.id) || ""}</td></tr>`).join("")}
    </tbody></table>`).join("");
  const sigBlock = (label, img, name, at) => `<div class="sig-col"><strong>${escapeHtml(label)}</strong>${img ? `<img class="signature-image" src="${escapeHtml(img)}" alt="" />` : '<div class="signature-line"></div>'}<div class="signature-name">${escapeHtml(name || "")}</div><small>${escapeHtml(dateOnly(at))}</small></div>`;
  return `<!doctype html>
<html><head><meta charset="utf-8" /><title>${escapeHtml(inspectionTypeLabel(insp.type))}</title>
<style>
@page { size: A4; margin: 12mm 15mm; }
body { margin: 0; }
${CONTRACT_PRINT_CSS}
.print-actions { margin: 10px 0 14px; text-align: right; }
@media print { .print-actions { display: none; } }
.edl-print-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
.edl-print-table th, .edl-print-table td { border: 1px solid #999; padding: 4px 6px; text-align: left; vertical-align: top; }
.sigs { display: flex; gap: 30px; margin-top: 24px; }
.sig-col { flex: 1; }
.sig-col img { max-height: 80px; display: block; }
</style></head>
<body class="contract-doc">
<div class="print-actions"><button type="button">Imprimer / PDF</button></div>
<h2>${escapeHtml(inspectionTypeLabel(insp.type))}</h2>
<p>Locataire : ${escapeHtml(leaseTenantName(lease))}<br/>Bien : ${escapeHtml([lease?.propertyName || lease?.propertyAddress, lease?.unitName].filter(Boolean).join(" · "))}<br/>Date : ${escapeHtml(dateOnly(insp.inspectionDate))}</p>
${insp.generalNotes ? `<p><strong>Remarques générales</strong><br/>${escapeHtml(insp.generalNotes).replace(/\n/g, "<br/>")}</p>` : ""}
<h3>Compteurs</h3><table class="edl-print-table"><tbody>${meters}</tbody></table>
${keys ? `<h3>Clés remises</h3><table class="edl-print-table"><tbody>${keys}</tbody></table>` : ""}
${roomsHtml}
<div class="sigs">${sigBlock("Bailleur", insp.landlordSignatureData, insp.landlordSignerName, insp.landlordSignedAt)}${sigBlock("Locataire", insp.tenantSignatureData, insp.tenantSignerName, insp.tenantSignedAt)}</div>
</body></html>`;
}

export function openInspectionPrint(insp, lease) {
  const win = window.open("", "_blank", "width=920,height=1100");
  if (!win) {
    window.alert(t("Autorisez les fenêtres popup pour imprimer."));
    return;
  }
  win.document.open();
  win.document.write(inspectionPrintHtml(insp, lease));
  win.document.close();
  win.focus();
  const btn = win.document.querySelector(".print-actions button");
  if (btn) btn.addEventListener("click", () => { try { win.focus(); win.print(); } catch { /* popup fermee */ } });
}
