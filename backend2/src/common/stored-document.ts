import { NotFoundException } from "@nestjs/common";
import { basename } from "path";
import type { Readable } from "stream";

/**
 * Stockage structurel minimal attendu : seule la methode getObject est
 * necessaire, pas d'import direct d'ObjectStorageService ici pour eviter
 * tout couplage/risque de deplacement de ce fichier partage.
 */
export type ObjectStorageReader = {
  getObject(key: string): Promise<{ body: Readable; contentType: string; contentLength?: number }>;
};

/**
 * Distingue une cle objet MinIO (ex. `domus/payments/12/proofs/...`) d'une
 * ancienne valeur heritee : URL complete (`https://.../uploads/x.jpg`),
 * chemin absolu (`/files/x`) ou simple nom de fichier a plat
 * (`tenant-proof-123.jpg`, sans "/"). Ces anciennes valeurs ne peuvent plus
 * etre lues (fichier perdu au deploiement suivant, voir upload-security.ts) :
 * mieux vaut un 404 explicite qu'un comportement silencieux incorrect.
 */
export function isObjectKey(value: string): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.includes("://")) return false;
  if (trimmed.startsWith("/")) return false;
  if (!trimmed.includes("/")) return false;
  return true;
}

/**
 * Lit un document stocke sur MinIO a partir de la valeur de colonne
 * (proofUrl/receiptUrl/...). Meme forme de retour que l'ancien
 * readValidatedUploadFile, pour que les controllers restent inchanges.
 * A utiliser uniquement APRES verification d'appartenance (token/JWT +
 * scope organisation), jamais directement depuis une entree non verifiee.
 */
export async function readStoredDocument(storage: ObjectStorageReader, value: string | null | undefined) {
  if (!value || !isObjectKey(value)) {
    throw new NotFoundException("Fichier indisponible : il doit être téléversé à nouveau.");
  }

  const object = await storage.getObject(value);
  return {
    body: object.body,
    mimeType: object.contentType,
    originalName: basename(value),
    contentLength: object.contentLength,
  };
}
