import { BadRequestException, Injectable, OnModuleDestroy } from "@nestjs/common";
import { createWorker, type Worker } from "tesseract.js";

/**
 * OCR best-effort pour le scan de devis/BC fournisseur (BâtiPro).
 * Supporte uniquement les images (jpeg/png/webp) en v1 : tesseract.js ne
 * décode pas nativement les PDF, on renvoie une erreur explicite plutôt
 * que de planter (le fichier PDF reste tout de même uploadé/archivé côté appelant).
 * Le worker tesseract est lourd à créer (~qq secondes) : on le réutilise
 * entre appels au lieu de le recréer à chaque scan.
 */
@Injectable()
export class OcrService implements OnModuleDestroy {
  private workerPromise: Promise<Worker> | null = null;

  private async getWorker(): Promise<Worker> {
    if (!this.workerPromise) {
      this.workerPromise = createWorker("fra+eng").catch((error) => {
        this.workerPromise = null;
        throw error;
      });
    }
    return this.workerPromise;
  }

  async extractText(buffer: Buffer, mime: string): Promise<string> {
    const supported = ["image/jpeg", "image/png", "image/webp"];
    if (!supported.includes(mime)) {
      throw new BadRequestException("PDF non supporté en v1, utilisez une image");
    }
    const worker = await this.getWorker();
    const { data } = await worker.recognize(buffer);
    return data.text ?? "";
  }

  async onModuleDestroy() {
    if (this.workerPromise) {
      try {
        const worker = await this.workerPromise;
        await worker.terminate();
      } catch {
        // best-effort, l'app s'arrête de toute facon
      }
    }
  }
}
