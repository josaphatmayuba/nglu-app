import { BadRequestException } from "@nestjs/common";
import { randomBytes } from "crypto";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

export type UploadedBufferFile = {
  buffer?: Buffer;
  mimetype?: string;
  originalname?: string;
  size?: number;
};

export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const DOCUMENT_MIME_TYPES = ["application/pdf"] as const;
export const IMAGE_OR_PDF_MIME_TYPES = [...IMAGE_MIME_TYPES, ...DOCUMENT_MIME_TYPES] as const;
// Messages vocaux du chat : conteneurs produits par MediaRecorder selon le
// navigateur — WebM/Opus (Chrome, Android), Ogg/Opus (Firefox), MP4/AAC (Safari).
export const AUDIO_MIME_TYPES = ["audio/webm", "audio/ogg", "audio/mp4"] as const;

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
};

function detectedMime(buffer: Buffer): string | null {
  const s = buffer.subarray(0, 12);
  if (s[0] === 0xff && s[1] === 0xd8 && s[2] === 0xff) return "image/jpeg";
  if (s.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (s.subarray(0, 4).toString("ascii") === "RIFF" && s.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (s.subarray(0, 4).toString("ascii") === "%PDF") return "application/pdf";

  // Conteneurs audio des messages vocaux.
  // WebM/Matroska : en-tete EBML 1A 45 DF A3.
  if (s.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return "audio/webm";
  // Ogg : "OggS".
  if (s.subarray(0, 4).toString("ascii") === "OggS") return "audio/ogg";
  // MP4/M4A : boite "ftyp" a l'offset 4 (la taille precede la signature).
  if (s.subarray(4, 8).toString("ascii") === "ftyp") return "audio/mp4";

  return null;
}

export function validateUploadedFile(
  file: UploadedBufferFile,
  options: {
    allowedMimeTypes: readonly string[];
    maxBytes?: number;
  },
) {
  if (!file?.buffer?.length) throw new BadRequestException("Aucun fichier recu.");

  const maxBytes = options.maxBytes ?? 10 * 1024 * 1024;
  const size = file.size ?? file.buffer.length;
  if (size > maxBytes) throw new BadRequestException("Fichier trop volumineux.");

  // Les navigateurs envoient le codec en parametre (ex. "audio/webm;codecs=opus").
  // La detection par signature ne retourne que le type de conteneur : on compare
  // donc sur le type de base, sans les parametres.
  const declared = (file.mimetype || "").split(";")[0].trim().toLowerCase();
  const actual = detectedMime(file.buffer);
  if (!actual || actual !== declared || !options.allowedMimeTypes.includes(actual)) {
    throw new BadRequestException("Le contenu du fichier ne correspond pas a un type autorise.");
  }

  return { mimetype: actual, extension: MIME_TO_EXT[actual], size };
}

export function saveValidatedUploadFile(
  file: UploadedBufferFile,
  uploadDir: string,
  options: {
    allowedMimeTypes: readonly string[];
    prefix?: string;
    maxBytes?: number;
  },
) {
  const validated = validateUploadedFile(file, options);

  if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

  const prefix = options.prefix ? `${options.prefix}-` : "";
  const name = `${prefix}${Date.now()}-${randomBytes(8).toString("hex")}.${validated.extension}`;
  writeFileSync(join(uploadDir, name), file.buffer!);
  return { name, mimetype: validated.mimetype, extension: validated.extension };
}

