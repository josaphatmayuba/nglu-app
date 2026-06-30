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

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

function detectedMime(buffer: Buffer): string | null {
  const s = buffer.subarray(0, 12);
  if (s[0] === 0xff && s[1] === 0xd8 && s[2] === 0xff) return "image/jpeg";
  if (s.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (s.subarray(0, 4).toString("ascii") === "RIFF" && s.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (s.subarray(0, 4).toString("ascii") === "%PDF") return "application/pdf";
  return null;
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
  if (!file?.buffer?.length) throw new BadRequestException("Aucun fichier recu.");

  const maxBytes = options.maxBytes ?? 10 * 1024 * 1024;
  const size = file.size ?? file.buffer.length;
  if (size > maxBytes) throw new BadRequestException("Fichier trop volumineux.");

  const declared = file.mimetype || "";
  const actual = detectedMime(file.buffer);
  if (!actual || actual !== declared || !options.allowedMimeTypes.includes(actual)) {
    throw new BadRequestException("Le contenu du fichier ne correspond pas a un type autorise.");
  }

  if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

  const prefix = options.prefix ? `${options.prefix}-` : "";
  const name = `${prefix}${Date.now()}-${randomBytes(8).toString("hex")}.${MIME_TO_EXT[actual]}`;
  writeFileSync(join(uploadDir, name), file.buffer);
  return { name, mimetype: actual, extension: MIME_TO_EXT[actual] };
}
