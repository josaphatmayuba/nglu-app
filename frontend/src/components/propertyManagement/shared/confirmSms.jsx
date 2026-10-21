import { Modal } from "antd";

// Aperçu obligatoire avant un envoi SMS depuis le CRM : le texte affiché est
// exactement celui envoyé à POST /send-sms (construit ici, côté navigateur).
// Résout true sur « Confirmer l'envoi », false sur « Annuler ».

// Jeu GSM 7 bits (de base) ; les caractères d'extension comptent double.
// Même table que domus-app/src/screens/communiques.jsx (smsInfo).
const GSM_BASIC = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM_EXT = "^{}\\[~]|€";

function smsInfo(text) {
  const s = String(text || "");
  let septets = 0;
  let unicode = false;
  for (const ch of s) {
    if (GSM_BASIC.includes(ch)) septets += 1;
    else if (GSM_EXT.includes(ch)) septets += 2;
    else { unicode = true; break; }
  }
  const units = unicode ? [...s].length : septets;
  const single = unicode ? 70 : 160;
  const multi = unicode ? 67 : 153;
  const segments = units === 0 ? 0 : units <= single ? 1 : Math.ceil(units / multi);
  return { length: [...s].length, segments, unicode };
}

export function confirmSms({ phone, text, title = "Vérifier le SMS avant l'envoi" }) {
  const info = smsInfo(text);
  return new Promise((resolve) => {
    Modal.confirm({
      title,
      width: 520,
      okText: "Confirmer l'envoi",
      cancelText: "Annuler",
      content: (
        <div>
          <p style={{ margin: "8px 0" }}>
            <strong>Destinataire :</strong> {phone}
          </p>
          <div
            style={{
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
              background: "#f1f5f9",
              border: "1px solid #e2e8f0",
              borderRadius: "12px 12px 12px 4px",
              padding: "10px 12px",
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            {text}
          </div>
          <p style={{ fontSize: 12, color: "#64748b", margin: "6px 0 0" }}>
            {info.length} caractères · {info.segments} SMS
            {info.unicode ? " · caractères spéciaux : 70 par SMS" : ""}
          </p>
        </div>
      ),
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    });
  });
}
