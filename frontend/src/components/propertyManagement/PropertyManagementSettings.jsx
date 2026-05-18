// Paramètres dédiés au module Immobilier (séparés des Paramètres globaux
// société). Pour l'instant : signature du bailleur appliquée aux contrats
// de bail signés. Extensible : on pourra y ajouter d'autres réglages
// spécifiques (modèle par défaut, clauses par défaut, etc.).

import { UploadOutlined } from "@ant-design/icons";
import { Button, Card, Form, Upload, message } from "antd";
import { ArrowLeft, Building2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";

import {
  getSetting,
  updateSetting,
} from "../../redux/rtk/features/setting/settingSlice";
import UserPrivateComponent from "../PrivacyComponent/UserPrivateComponent";

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const PropertyManagementSettings = () => {
  const dispatch = useDispatch();
  const data = useSelector((s) => s?.setting?.data) || null;
  const loading = useSelector((s) => s?.setting?.loading) || false;

  const [fileList, setFileList] = useState([]);
  const [pendingDataUrl, setPendingDataUrl] = useState(null);
  const [clearFlag, setClearFlag] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data == null) dispatch(getSetting());
  }, [dispatch, data]);

  useEffect(() => {
    if (data?.landlordSignature) {
      setFileList([
        {
          uid: "landlord-signature",
          name: "Signature du bailleur",
          status: "done",
          url: data.landlordSignature,
        },
      ]);
      setPendingDataUrl(null);
      setClearFlag(false);
    } else {
      setFileList([]);
    }
  }, [data?.landlordSignature]);

  const handleChange = async ({ fileList: list }) => {
    setFileList(list);
    if (!list.length) {
      setPendingDataUrl(null);
      setClearFlag(true);
      return;
    }
    const fileObj = list[0]?.originFileObj;
    if (fileObj) {
      try {
        const dataUrl = await fileToDataUrl(fileObj);
        setPendingDataUrl(dataUrl);
        setClearFlag(false);
      } catch {
        message.error("Impossible de lire l'image de signature.");
      }
    }
  };

  const handleSave = async () => {
    if (!pendingDataUrl && !clearFlag) {
      message.info("Aucun changement à sauvegarder.");
      return;
    }
    setSaving(true);
    try {
      const formData = new FormData();
      if (pendingDataUrl) formData.append("landlordSignature", pendingDataUrl);
      if (clearFlag) formData.append("clearLandlordSignature", "true");
      formData.append("_method", "PUT");

      const resp = await dispatch(updateSetting(formData));
      if (resp.payload?.message === "success") {
        message.success("Signature du bailleur mise à jour");
        dispatch(getSetting());
        setPendingDataUrl(null);
        setClearFlag(false);
      } else {
        message.error("Échec de la mise à jour.");
      }
    } finally {
      setSaving(false);
    }
  };

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

        <div className="immo-panel" style={{ maxWidth: 720 }}>
          <Card
            title={
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <Building2 size={18} /> Signature du bailleur
              </span>
            }
            loading={loading && !data}
          >
            <p style={{ color: "#52525b", fontSize: 13, marginBottom: 16 }}>
              Cette signature apparaîtra sur tous les contrats de bail signés à la place du cachet
              électronique textuel par défaut. Elle est utilisée dans l'aperçu, l'impression et le PDF
              téléchargeable.
            </p>

            <Form layout="vertical">
              <Form.Item label="Image PNG/JPG (largeur ≤ 360px, fond transparent recommandé)">
                <Upload
                  listType="picture-card"
                  beforeUpload={() => false}
                  accept="image/png,image/jpeg"
                  fileList={fileList}
                  maxCount={1}
                  onChange={handleChange}
                >
                  {fileList.length === 0 && (
                    <div>
                      <UploadOutlined />
                      <div style={{ marginTop: 8 }}>Upload</div>
                    </div>
                  )}
                </Upload>
                <p style={{ color: "#a1a1aa", fontSize: 12, marginTop: 4 }}>
                  Laisser vide = cachet électronique textuel généré automatiquement avec le nom de la
                  société et la date d'envoi du contrat.
                </p>
              </Form.Item>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Button
                  onClick={() => {
                    if (data?.landlordSignature) {
                      setFileList([
                        {
                          uid: "landlord-signature",
                          name: "Signature du bailleur",
                          status: "done",
                          url: data.landlordSignature,
                        },
                      ]);
                    } else {
                      setFileList([]);
                    }
                    setPendingDataUrl(null);
                    setClearFlag(false);
                  }}
                  disabled={!pendingDataUrl && !clearFlag}
                >
                  Annuler
                </Button>
                <Button
                  type="primary"
                  onClick={handleSave}
                  loading={saving}
                  disabled={!pendingDataUrl && !clearFlag}
                >
                  Enregistrer
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
