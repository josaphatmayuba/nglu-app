import { useEffect, useMemo, useState } from "react";
import { Building2, Check, FileSignature, Image as ImageIcon, PenLine, Save, Trash2, Type, Upload } from "lucide-react";
import { api } from "../api.js";
import { t, tf } from "../i18n.js";
import {
  SIGNATURE_TYPES, CURSIVE_FONTS, buildEidasDataUrl, fileToDataUrl,
  generateCursiveSignature, loadCursiveFonts,
} from "../landlordSignature.js";
import { useConfirm } from "../components/Dialog.jsx";
import { SignaturePad } from "../components/SignaturePad.jsx";

export function LandlordSignatureCard({ setting, onSaved }) {
  const confirm = useConfirm();
  const companyName = setting?.landlordName || setting?.companyName || "Le Bailleur";
  const stored = setting?.landlordSignature || null;

  const [type, setType] = useState("image");
  const [preview, setPreview] = useState(null);
  const [cursiveText, setCursiveText] = useState(companyName);
  const [cursiveFont, setCursiveFont] = useState(CURSIVE_FONTS[0].name);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  useEffect(() => { loadCursiveFonts(); }, []);
  useEffect(() => { if (companyName) setCursiveText(companyName); }, [companyName]);

  const eidasPreview = useMemo(
    () => (type === "eidas" ? buildEidasDataUrl(companyName) : null),
    [type, companyName],
  );

  const cursiveMeta = CURSIVE_FONTS.find((f) => f.name === cursiveFont) || CURSIVE_FONTS[0];

  useEffect(() => {
    setPreview(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setPreview(await fileToDataUrl(file));
      setMsg(null);
    } catch {
      setMsg({ type: "err", text: t("Impossible de lire l'image.") });
    }
    e.target.value = "";
  };

  const save = async () => {
    let dataUrl = null;
    if (type === "eidas") dataUrl = eidasPreview;
    else if (type === "cursif") {
      dataUrl = await generateCursiveSignature({
        text: cursiveText?.trim() || companyName,
        fontName: cursiveMeta.name,
        weight: cursiveMeta.weight,
      });
    } else dataUrl = preview;

    if (!dataUrl) {
      setMsg({ type: "err", text: t("Aucune signature à enregistrer.") });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await api.updateSetting({ landlordSignature: dataUrl });
      setMsg({ type: "ok", text: t("Signature du bailleur enregistrée.") });
      setPreview(null);
      onSaved?.();
    } catch (err) {
      setMsg({ type: "err", text: err.message || t("Échec de l'enregistrement.") });
    } finally {
      setBusy(false);
    }
  };

  const clearStored = async () => {
    if (!(await confirm({
      title: t("Effacer la signature"),
      message: t("Effacer la signature actuelle ? Le cachet textuel par défaut sera utilisé."),
      confirmLabel: t("Effacer"),
      danger: true,
    }))) return;
    setBusy(true);
    setMsg(null);
    try {
      await api.updateSetting({ clearLandlordSignature: "true" });
      setMsg({ type: "ok", text: t("Signature effacée.") });
      onSaved?.();
    } catch (err) {
      setMsg({ type: "err", text: err.message || t("Échec.") });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card settings-card landlord-sig-card">
      <h3><Building2 size={17} /> {t("Signature du bailleur")}</h3>
      <p className="muted" style={{ fontSize: 12, marginTop: -6 }}>
        {t("Signature par défaut sur tous les contrats (aperçu, impression, PDF). Partagée avec le CRM.")}
      </p>

      {stored && (
        <div className="landlord-sig-current">
          <img src={stored} alt={t("Signature actuelle")} />
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: 13 }}>{t("Signature actuelle")}</strong>
            <div className="muted" style={{ fontSize: 11 }}>{t("Utilisée sur les contrats signés.")}</div>
          </div>
          <button type="button" className="btn btn-sm" style={{ color: "#be123c" }} disabled={busy} onClick={clearStored}>
            <Trash2 size={14} /> {t("Effacer")}
          </button>
        </div>
      )}

      <div className="landlord-sig-types">
        {SIGNATURE_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`landlord-sig-type ${type === t.id ? "active" : ""}`}
            onClick={() => setType(t.id)}
          >
            {t.id === "eidas" && <FileSignature size={14} />}
            {t.id === "tablette" && <PenLine size={14} />}
            {t.id === "cursif" && <Type size={14} />}
            {t.id === "image" && <ImageIcon size={14} />}
            {t.label}
          </button>
        ))}
      </div>

      {type === "eidas" && eidasPreview && (
        <div className="landlord-sig-preview-box">
          <img src={eidasPreview} alt={t("Cachet eIDAS")} style={{ maxWidth: "100%" }} />
          <p className="muted" style={{ fontSize: 11, margin: "8px 0 0" }}>
            {t("Cachet visuel (non qualifié eIDAS légalement). Valeur probatoire avec horodatage contrat.")}
          </p>
        </div>
      )}

      {type === "tablette" && (
        <SignaturePad value={preview} onChange={setPreview} showUpload={false} onError={(msg) => setMsg({ type: "err", text: msg })} />
      )}

      {type === "cursif" && (
        <>
          <label className="domus-property-field">
            <span>{t("Texte")}</span>
            <input value={cursiveText} onChange={(e) => setCursiveText(e.target.value)} maxLength={48} />
          </label>
          <label className="domus-property-field">
            <span>{t("Police")}</span>
            <select value={cursiveFont} onChange={(e) => setCursiveFont(e.target.value)}>
              {CURSIVE_FONTS.map((f) => (
                <option key={f.name} value={f.name}>{f.name} — {f.sample}</option>
              ))}
            </select>
          </label>
          <div className="landlord-sig-cursive-preview" style={{ fontFamily: `'${cursiveFont}', cursive`, fontWeight: cursiveMeta.weight }}>
            {cursiveText || companyName}
          </div>
        </>
      )}

      {type === "image" && (
        <label className="landlord-sig-upload btn">
          <Upload size={16} /> {t("Choisir PNG / JPG")}
          <input type="file" accept="image/png,image/jpeg" hidden onChange={onFile} />
        </label>
      )}

      {preview && type === "image" && (
        <div className="landlord-sig-preview-box" style={{ marginTop: 10 }}>
          <img src={preview} alt={t("Aperçu")} style={{ maxHeight: 80 }} />
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={save}>
          {busy ? t("Enregistrement...") : <><Save size={15} /> {t("Enregistrer")}</>}
        </button>
        {msg && (
          <span style={{ fontSize: 12, color: msg.type === "err" ? "#dc2626" : "#059669", display: "inline-flex", alignItems: "center", gap: 5 }}>
            {msg.type === "ok" && <Check size={14} />}{msg.text}
          </span>
        )}
      </div>
    </section>
  );
}
