import {
  MEDIA_EXTENSIONS,
  MEDIA_MAX_BYTES,
  MEDIA_MAX_DIMENSION,
  MEDIA_TYPES,
  formatBytes,
  type MediaMimeType,
} from "./config";

/**
 * Verificação de um arquivo no navegador, antes do envio. O tipo é detectado
 * pelo conteúdo (assinatura do arquivo), não pela extensão nem pelo
 * `file.type` informado pelo sistema. O bucket repete as restrições de tipo
 * declarado e tamanho no servidor do Storage.
 */
export type CheckedFile = {
  mimeType: MediaMimeType;
  extension: (typeof MEDIA_TYPES)[MediaMimeType];
  width: number;
  height: number;
};

export type FileCheck = { ok: true; file: CheckedFile } | { ok: false; error: string };

async function sniffType(file: File): Promise<MediaMimeType | null> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const at = (offset: number, values: number[]) => values.every((value, index) => bytes[offset + index] === value);

  if (at(0, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (at(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  // "RIFF" .... "WEBP"
  if (at(0, [0x52, 0x49, 0x46, 0x46]) && at(8, [0x57, 0x45, 0x42, 0x50])) return "image/webp";
  return null;
}

async function readDimensions(file: File): Promise<{ width: number; height: number } | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return null;
  }
}

export async function checkImageFile(file: File): Promise<FileCheck> {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!(MEDIA_EXTENSIONS as readonly string[]).includes(extension)) {
    return { ok: false, error: "Formato não permitido. Envie JPEG, PNG ou WebP." };
  }
  if (file.size === 0) return { ok: false, error: "O arquivo está vazio." };
  if (file.size > MEDIA_MAX_BYTES) {
    return {
      ok: false,
      error: `Arquivo com ${formatBytes(file.size)}: o limite é ${formatBytes(MEDIA_MAX_BYTES)}. Reduza a imagem antes de enviar.`,
    };
  }

  const mimeType = await sniffType(file);
  if (!mimeType) {
    return {
      ok: false,
      error: "O conteúdo do arquivo não é uma imagem JPEG, PNG ou WebP (a extensão pode ter sido alterada).",
    };
  }
  const expected = MEDIA_TYPES[mimeType];
  const extensionMatches = extension === expected || (expected === "jpg" && extension === "jpeg");
  if (!extensionMatches) {
    return {
      ok: false,
      error: `A extensão .${extension} não corresponde ao conteúdo do arquivo (${expected.toUpperCase()}). Renomeie ou exporte novamente.`,
    };
  }

  const size = await readDimensions(file);
  if (!size || size.width < 1 || size.height < 1) {
    return { ok: false, error: "Não foi possível ler a imagem: o arquivo pode estar corrompido." };
  }
  if (size.width > MEDIA_MAX_DIMENSION || size.height > MEDIA_MAX_DIMENSION) {
    return {
      ok: false,
      error: `Imagem com ${size.width} × ${size.height} px: o maior lado aceito é ${MEDIA_MAX_DIMENSION} px. Reduza a resolução antes de enviar.`,
    };
  }

  return { ok: true, file: { mimeType, extension: expected, ...size } };
}
