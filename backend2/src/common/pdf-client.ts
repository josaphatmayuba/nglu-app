import { BadRequestException } from "@nestjs/common";

/**
 * Client du microservice PDF (pdf-service).
 *
 * Toute la génération PDF des apps passe par UN service dédié (HTML -> PDF via
 * Puppeteer), isolé du backend principal : plus de chromium embarqué dans
 * backend2, plus d'OOM au build, un seul endroit à maintenir.
 *
 * Configurer l'URL via PDF_SERVICE_URL (défaut : http://pdf-service:8002,
 * nom de service Docker sur le réseau interne).
 */
export async function renderPdfViaService(html: string, tag = "PDF"): Promise<Buffer> {
  const baseUrl = process.env.PDF_SERVICE_URL || "http://pdf-service:8002";
  try {
    const resp = await fetch(`${baseUrl}/render`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html }),
    });
    if (!resp.ok) {
      let detail = `${resp.status}`;
      try {
        const body = (await resp.json()) as { error?: string };
        if (body?.error) detail = body.error;
      } catch {
        /* réponse non-JSON */
      }
      throw new Error(detail);
    }
    const arrayBuffer = await resp.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    const msg = (err as Error)?.message || String(err);
    console.error(`[${tag}] PDF service call failed:`, msg, "| url=", baseUrl);
    throw new BadRequestException(`PDF generation failed: ${msg}`);
  }
}
