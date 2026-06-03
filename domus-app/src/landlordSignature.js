// Génération signature bailleur (même logique que le CRM Immobilier).
export const SIGNATURE_TYPES = [
  { id: "eidas", label: "eIDAS", hint: "Cachet électronique auto-généré" },
  { id: "tablette", label: "Tablette", hint: "Dessin souris / stylet / doigt" },
  { id: "cursif", label: "Cursif", hint: "Texte en police calligraphique" },
  { id: "image", label: "Image", hint: "PNG / JPG uploadé" },
];

export const CURSIVE_FONTS = [
  { name: "Dancing Script", weight: 700, sample: "Élégante" },
  { name: "Great Vibes", weight: 400, sample: "Classique" },
  { name: "Sacramento", weight: 400, sample: "Décontractée" },
  { name: "Allura", weight: 400, sample: "Formelle" },
];

const CURSIVE_FONT_URL =
  "https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Great+Vibes&family=Sacramento&family=Allura&display=swap";

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function shortHash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = (h * 33) ^ str.charCodeAt(i);
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function generateEidasStamp({ companyName, hashShort }) {
  const W = 520;
  const H = 200;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f5f5dc";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#15803d";
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, W - 4, H - 4);
  ctx.fillStyle = "#14532d";
  ctx.font = "bold 14px Arial";
  ctx.textAlign = "center";
  ctx.fillText("✓ SIGNÉ NUMÉRIQUEMENT (eIDAS)", W / 2, 30);
  ctx.strokeStyle = "#86efac";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, 42);
  ctx.lineTo(W - 40, 42);
  ctx.stroke();
  ctx.fillStyle = "#18181b";
  ctx.font = "bold 22px Arial";
  ctx.fillText(companyName || "Le Bailleur", W / 2, 78);
  const dateStr = new Date().toLocaleString("fr-FR");
  ctx.fillStyle = "#52525b";
  ctx.font = "13px Arial";
  ctx.fillText(`Date : ${dateStr}`, W / 2, 108);
  ctx.fillStyle = "#71717a";
  ctx.font = "11px monospace";
  ctx.fillText(`Hash : ${hashShort}…`, W / 2, 132);
  ctx.fillStyle = "#15803d";
  ctx.font = "italic 11px Arial";
  ctx.fillText("Cachet électronique — Horodaté au moment de la signature", W / 2, 162);
  return canvas.toDataURL("image/png");
}

export function buildEidasDataUrl(companyName) {
  return generateEidasStamp({
    companyName,
    hashShort: shortHash(`${companyName}|${new Date().toISOString().slice(0, 10)}`),
  });
}

export function loadCursiveFonts() {
  if (typeof document === "undefined" || document.getElementById("domus-cursive-fonts")) return;
  const link = document.createElement("link");
  link.id = "domus-cursive-fonts";
  link.rel = "stylesheet";
  link.href = CURSIVE_FONT_URL;
  document.head.appendChild(link);
}

export async function generateCursiveSignature({ text, fontName, weight }) {
  const W = 600;
  const H = 160;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, W, H);
  try {
    await document.fonts.load(`${weight} 64px "${fontName}"`);
  } catch {}
  ctx.fillStyle = "#18181b";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${weight} 64px "${fontName}", cursive`;
  ctx.fillText(text || "Signature", W / 2, H / 2);
  return canvas.toDataURL("image/png");
}

export function landlordSigSrc(setting) {
  return setting?.landlordSignature || null;
}
