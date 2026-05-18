// Paramètres dédiés au module Immobilier (séparés des Paramètres globaux
// société). Pour l'instant : choix du type de signature du bailleur
// appliqué aux contrats de bail signés.
//
// 3 types de signatures (toutes stockées comme PNG data URL dans le
// même champ appSetting.landlord_signature) :
//   1. eIDAS — cachet électronique visuel auto-généré (canvas)
//   2. Tablette — dessin manuel sur canvas (souris / stylet / doigt)
//   3. Image — upload d'un PNG/JPG existant

import { UploadOutlined } from "@ant-design/icons";
import { Button, Card, Form, Radio, Upload, message } from "antd";
import { ArrowLeft, Building2, FileSignature, PenLine, Image as ImageIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";

import {
  getSetting,
  updateSetting,
} from "../../redux/rtk/features/setting/settingSlice";
import UserPrivateComponent from "../PrivacyComponent/UserPrivateComponent";

// ── Helpers ────────────────────────────────────────────────────────
const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// Génère un cachet visuel "type eIDAS" sur un canvas et renvoie le data URL.
// Note légale : ce n'est PAS une signature eIDAS qualifiée au sens du règlement
// européen (qui exige un certificat délivré par un prestataire de confiance
// agréé). C'est un cachet visuel reproduisant l'apparence, à valeur
// déclarative / probatoire renforcée par l'horodatage du contrat.
const generateEidasStamp = ({ companyName, hashShort }) => {
  const W = 520;
  const H = 200;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Fond crème + bordure verte
  ctx.fillStyle = "#f5f5dc";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#15803d";
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, W - 4, H - 4);

  // Titre
  ctx.fillStyle = "#14532d";
  ctx.font = "bold 14px Arial";
  ctx.textAlign = "center";
  ctx.fillText("✓ SIGNÉ NUMÉRIQUEMENT (eIDAS)", W / 2, 30);

  // Ligne séparation
  ctx.strokeStyle = "#86efac";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, 42);
  ctx.lineTo(W - 40, 42);
  ctx.stroke();

  // Nom société
  ctx.fillStyle = "#18181b";
  ctx.font = "bold 22px Arial";
  ctx.fillText(companyName || "Le Bailleur", W / 2, 78);

  // Date
  const dateStr = new Date().toLocaleString("fr-FR");
  ctx.fillStyle = "#52525b";
  ctx.font = "13px Arial";
  ctx.fillText(`Date : ${dateStr}`, W / 2, 108);

  // Hash (déterministe sur companyName + date)
  ctx.fillStyle = "#71717a";
  ctx.font = "11px monospace";
  ctx.fillText(`Hash : ${hashShort}…`, W / 2, 132);

  // Footer
  ctx.fillStyle = "#15803d";
  ctx.font = "italic 11px Arial";
  ctx.fillText("Cachet électronique — Horodaté au moment de la signature", W / 2, 162);

  // Icône cadenas (carré + symbol)
  ctx.fillStyle = "#15803d";
  ctx.fillRect(W / 2 - 95, 70, 20, 16);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 12px Arial";
  ctx.fillText("🔒", W / 2 - 85, 84);

  return canvas.toDataURL("image/png");
};

// Génère un hash court (8 chars) déterministe à partir d'une string. Pas
// crypto-grade, juste pour l'affichage du cachet eIDAS.
const shortHash = (str) => {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = (h * 33) ^ str.charCodeAt(i);
  return (h >>> 0).toString(16).padStart(8, "0");
};

// ── Composant ──────────────────────────────────────────────────────
const PropertyManagementSettings = () => {
  const dispatch = useDispatch();
  const data = useSelector((s) => s?.setting?.data) || null;
  const loading = useSelector((s) => s?.setting?.loading) || false;

  const [type, setType] = useState("image"); // "eidas" | "tablette" | "image"
  const [previewDataUrl, setPreviewDataUrl] = useState(null);
  const [clearFlag, setClearFlag] = useState(false);
  const [saving, setSaving] = useState(false);

  // Upload (type=image)
  const [fileList, setFileList] = useState([]);

  // Canvas (type=tablette)
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    if (data == null) dispatch(getSetting());
  }, [dispatch, data]);

  // Pré-remplissage : on n'a pas de type stocké en DB, donc on assume "image"
  // si la valeur existante ressemble à un PNG (toutes nos exports le sont).
  useEffect(() => {
    if (data?.landlordSignature) {
      setFileList([
        { uid: "current", name: "Signature actuelle", status: "done", url: data.landlordSignature },
      ]);
    } else {
      setFileList([]);
    }
  }, [data?.landlordSignature]);

  const companyName = data?.companyName || "Le Bailleur";

  // ── eIDAS ─────────────────────────────────────────────────────────
  const eidasDataUrl = useMemo(() => {
    if (type !== "eidas") return null;
    return generateEidasStamp({
      companyName,
      hashShort: shortHash(`${companyName}|${new Date().toISOString().slice(0, 10)}`),
    });
  }, [type, companyName]);

  // ── Canvas tablette ───────────────────────────────────────────────
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setPreviewDataUrl(null);
  };

  useEffect(() => {
    if (type === "tablette" && canvasRef.current) clearCanvas();
    // Si on change de type, on reset le pending state
    setPreviewDataUrl(null);
    setClearFlag(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const getCanvasPoint = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const src = event.touches ? event.touches[0] : event;
    return {
      x: ((src.clientX - rect.left) / rect.width) * canvas.width,
      y: ((src.clientY - rect.top) / rect.height) * canvas.height,
    };
  };
  const startDraw = (e) => {
    e.preventDefault();
    drawingRef.current = true;
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = getCanvasPoint(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = "#18181b";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
  };
  const draw = (e) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const { x, y } = getCanvasPoint(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const endDraw = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    setPreviewDataUrl(canvasRef.current.toDataURL("image/png"));
  };

  // ── Upload image ─────────────────────────────────────────────────
  const handleUploadChange = async ({ fileList: list }) => {
    setFileList(list);
    if (!list.length) {
      setPreviewDataUrl(null);
      setClearFlag(true);
      return;
    }
    const fileObj = list[0]?.originFileObj;
    if (fileObj) {
      try {
        const dataUrl = await fileToDataUrl(fileObj);
        setPreviewDataUrl(dataUrl);
        setClearFlag(false);
      } catch {
        message.error("Impossible de lire l'image.");
      }
    }
  };

  // ── Submit ────────────────────────────────────────────────────────
  const handleSave = async () => {
    // Type eIDAS : on prend toujours le cachet généré (eidasDataUrl)
    const toSend = type === "eidas" ? eidasDataUrl : previewDataUrl;
    if (!toSend && !clearFlag) {
      message.info("Aucun changement à sauvegarder.");
      return;
    }
    setSaving(true);
    try {
      const formData = new FormData();
      if (toSend) formData.append("landlordSignature", toSend);
      if (clearFlag) formData.append("clearLandlordSignature", "true");
      formData.append("_method", "PUT");
      const resp = await dispatch(updateSetting(formData));
      if (resp.payload?.message === "success") {
        message.success("Signature du bailleur mise à jour");
        dispatch(getSetting());
        setPreviewDataUrl(null);
        setClearFlag(false);
      } else {
        message.error("Échec de la mise à jour.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleClearStored = async () => {
    if (!window.confirm("Effacer la signature actuelle ? Le cachet textuel par défaut sera utilisé.")) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("clearLandlordSignature", "true");
      formData.append("_method", "PUT");
      const resp = await dispatch(updateSetting(formData));
      if (resp.payload?.message === "success") {
        message.success("Signature effacée");
        dispatch(getSetting());
        setFileList([]);
        setPreviewDataUrl(null);
        setClearFlag(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const typeOptions = [
    { value: "eidas",    label: "eIDAS",    icon: <FileSignature size={14} /> },
    { value: "tablette", label: "Tablette", icon: <PenLine size={14} /> },
    { value: "image",    label: "Image",    icon: <ImageIcon size={14} /> },
  ];

  return (
    <UserPrivateComponent permission={"readAll-propertyManagement"}>
      <div className="property-management-page immo-page">
        <div className="immo-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
              <Link
                to="/admin/property-management"
                style={{ color: "#71717a", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13 }}
              >
                <ArrowLeft size={14} /> Retour à l'Immobilier
              </Link>
            </div>
            <h1>Paramètres Immobilier</h1>
            <p>Réglages spécifiques au module Immobilier (contrats de bail, signatures, modèles…)</p>
          </div>
        </div>

        <div className="immo-panel" style={{ maxWidth: 820 }}>
          <Card
            title={
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <Building2 size={18} /> Signature du bailleur
              </span>
            }
            loading={loading && !data}
          >
            <p style={{ color: "#52525b", fontSize: 13, marginBottom: 16 }}>
              Choisissez le type de signature qui apparaîtra sur tous les contrats de bail signés
              (aperçu, impression et PDF). Si rien n'est configuré, un cachet électronique textuel
              automatique est utilisé par défaut.
            </p>

            {data?.landlordSignature && (
              <div style={{ background: "#f4f4f5", border: "1px solid #e4e4e7", borderRadius: 10, padding: 12, marginBottom: 18, display: "flex", alignItems: "center", gap: 14 }}>
                <img src={data.landlordSignature} alt="Signature actuelle" style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 6, maxHeight: 70, padding: 4 }} />
                <div style={{ flex: 1 }}>
                  <strong style={{ display: "block", fontSize: 13 }}>Signature actuelle</strong>
                  <small style={{ color: "#71717a" }}>Utilisée sur les contrats de bail signés.</small>
                </div>
                <Button danger size="small" onClick={handleClearStored}>Effacer</Button>
              </div>
            )}

            <Form layout="vertical">
              <Form.Item label="Type de signature">
                <Radio.Group
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  optionType="button"
                  buttonStyle="solid"
                >
                  {typeOptions.map((opt) => (
                    <Radio.Button key={opt.value} value={opt.value}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        {opt.icon} {opt.label}
                      </span>
                    </Radio.Button>
                  ))}
                </Radio.Group>
              </Form.Item>

              {/* ── eIDAS ─────────────────────────────────────────── */}
              {type === "eidas" && (
                <Form.Item label="Cachet électronique généré (aperçu)">
                  <div style={{ display: "flex", justifyContent: "center", padding: 16, background: "#fafafa", border: "1px solid #e4e4e7", borderRadius: 10 }}>
                    {eidasDataUrl && <img src={eidasDataUrl} alt="Cachet eIDAS" style={{ maxWidth: "100%", height: "auto" }} />}
                  </div>
                  <p style={{ color: "#a1a1aa", fontSize: 12, marginTop: 8 }}>
                    Cachet visuel inspiré du format eIDAS, généré automatiquement à partir du nom
                    de la société et d'un hash déterministe. <strong>Ce n'est pas une signature
                    eIDAS qualifiée légalement</strong> (qui nécessite un certificat délivré par
                    un prestataire de confiance agréé), mais un cachet à valeur probatoire
                    renforcée par l'horodatage du contrat.
                  </p>
                </Form.Item>
              )}

              {/* ── Tablette (canvas) ─────────────────────────────── */}
              {type === "tablette" && (
                <Form.Item label="Signez avec votre souris, stylet ou doigt">
                  <div style={{ background: "#fafafa", border: "1px solid #e4e4e7", borderRadius: 10, padding: 12 }}>
                    <canvas
                      ref={canvasRef}
                      width={520}
                      height={180}
                      style={{ background: "#fff", border: "1px dashed #d4d4d8", borderRadius: 6, cursor: "crosshair", touchAction: "none", width: "100%", maxWidth: 520 }}
                      onMouseDown={startDraw}
                      onMouseMove={draw}
                      onMouseUp={endDraw}
                      onMouseLeave={endDraw}
                      onTouchStart={startDraw}
                      onTouchMove={draw}
                      onTouchEnd={endDraw}
                    />
                    <div style={{ marginTop: 8, textAlign: "right" }}>
                      <Button size="small" onClick={clearCanvas}>Effacer le tracé</Button>
                    </div>
                  </div>
                </Form.Item>
              )}

              {/* ── Image upload ──────────────────────────────────── */}
              {type === "image" && (
                <Form.Item label="Image PNG/JPG (largeur ≤ 360px, fond transparent recommandé)">
                  <Upload
                    listType="picture-card"
                    beforeUpload={() => false}
                    accept="image/png,image/jpeg"
                    fileList={fileList}
                    maxCount={1}
                    onChange={handleUploadChange}
                  >
                    {fileList.length === 0 && (
                      <div>
                        <UploadOutlined />
                        <div style={{ marginTop: 8 }}>Upload</div>
                      </div>
                    )}
                  </Upload>
                </Form.Item>
              )}

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Button
                  type="primary"
                  onClick={handleSave}
                  loading={saving}
                  disabled={type === "eidas" ? !eidasDataUrl : !previewDataUrl && !clearFlag}
                >
                  {type === "eidas" ? "Appliquer ce cachet" : "Enregistrer"}
                </Button>
              </div>
            </Form>
          </Card>
        </div>
      </div>
    </UserPrivateComponent>
  );
};

export default PropertyManagementSettings;
