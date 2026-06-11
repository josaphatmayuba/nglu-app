// Microservice PDF — HTML -> PDF via Puppeteer (chromium système).
// Un seul endroit pour toute la génération PDF des apps nglu (HR, FarmOS, …),
// isolé du backend principal : s'il tombe/manque de mémoire, le reste tourne.
//
// API :
//   GET  /health                 -> { ok, chromium }
//   POST /render { html, options } -> application/pdf
//
// Le navigateur est lancé une fois et réutilisé (perf + mémoire).

const express = require("express");
const fs = require("fs");
const puppeteer = require("puppeteer-core");

const PORT = process.env.PORT || 8002;

// Résolution du binaire chromium (installé par apk dans le Dockerfile du service).
function resolveChromium() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/usr/lib/chromium/chrome",
    "/usr/lib/chromium/chromium",
  ].filter(Boolean);
  return candidates.find((p) => { try { return fs.existsSync(p); } catch { return false; } }) || null;
}

// Lancement à la demande : on ouvre chromium pour la durée d'un rendu puis on
// le ferme. Empreinte mémoire ~nulle au repos (adapté aux petites instances).
async function launchBrowser() {
  const executablePath = resolveChromium();
  if (!executablePath) throw new Error("chromium introuvable dans le conteneur pdf-service");
  return puppeteer.launch({
    headless: true,
    executablePath,
    protocolTimeout: 60000,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--single-process"],
  });
}

const app = express();
app.use(express.json({ limit: "10mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "pdf-service", chromium: resolveChromium() });
});

app.post("/render", async (req, res) => {
  const { html, options } = req.body || {};
  if (!html || typeof html !== "string") {
    return res.status(400).json({ error: "Champ `html` (string) requis." });
  }
  let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    // 'load' (pas networkidle0) : les images base64 inline ne déclenchent pas de
    // requête réseau et faisaient timeouter networkidle0.
    await page.setContent(html, { waitUntil: "load", timeout: 30000 });
    const pdf = await page.pdf({
      format: (options && options.format) || "A4",
      printBackground: true,
      margin: (options && options.margin) || { top: "1cm", bottom: "1cm", left: "1cm", right: "1cm" },
    });
    res.setHeader("Content-Type", "application/pdf");
    res.send(Buffer.from(pdf));
  } catch (err) {
    const msg = (err && err.message) || String(err);
    console.error("[pdf-service] render failed:", msg);
    res.status(500).json({ error: `PDF generation failed: ${msg}` });
  } finally {
    if (browser) { try { await browser.close(); } catch { /* ignore */ } }
  }
});

app.listen(PORT, () => console.log(`[pdf-service] listening on :${PORT}`));
