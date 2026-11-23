/**
 * Biblioteca de mídia (Supabase Storage). Valores compartilhados entre
 * navegador e servidor; as mesmas regras estão na migration
 * enable_media_library (bucket, policies e constraints).
 */

/** Bucket público de imagens institucionais. */
export const MEDIA_BUCKET = "geologar-media";

/** 5 MB por arquivo (também configurado no bucket). */
export const MEDIA_MAX_BYTES = 5 * 1024 * 1024;

/** Maior lado aceito, em pixels: evita imagens gigantes mesmo comprimidas. */
export const MEDIA_MAX_DIMENSION = 8000;

/** Formatos aceitos: tipo MIME → extensão gravada no nome do objeto. */
export const MEDIA_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type MediaMimeType = keyof typeof MEDIA_TYPES;

/** Extensões aceitas no nome original do arquivo. */
export const MEDIA_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;

/** Atributo `accept` do campo de arquivo. */
export const MEDIA_ACCEPT = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

export const MEDIA_PAGE_SIZE = 24;

/** `uploads/<uuid v4>.<ext>` — igual a public.is_media_object_name. */
const MEDIA_OBJECT_NAME =
  /^uploads\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/;

/** Arquivo local de public/ (ex.: "/images/hero.jpg"), sem "..", "//" ou esquema. */
const LOCAL_IMAGE_PATH = /^\/[A-Za-z0-9_-][A-Za-z0-9/_.-]*\.(jpg|jpeg|png|webp|avif|svg)$/;

export function isMediaObjectName(value: string): boolean {
  return MEDIA_OBJECT_NAME.test(value);
}

export function isLocalImagePath(value: string): boolean {
  return LOCAL_IMAGE_PATH.test(value) && !value.includes("..") && !value.includes("//");
}

export function isMediaMimeType(value: string): value is MediaMimeType {
  return Object.hasOwn(MEDIA_TYPES, value);
}

/**
 * URL pública de um objeto da biblioteca. O host vem sempre da configuração
 * do projeto (NEXT_PUBLIC_SUPABASE_URL), nunca do banco.
 */
export function mediaPublicUrl(name: string): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base || !isMediaObjectName(name)) return null;
  try {
    const url = new URL(base);
    if (url.protocol !== "https:" && url.hostname !== "127.0.0.1" && url.hostname !== "localhost") return null;
    return `${url.origin}/storage/v1/object/public/${MEDIA_BUCKET}/${name}`;
  } catch {
    return null;
  }
}

/** Tamanho legível em pt-BR (ex.: "1,2 MB"). */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: value < 10 ? 1 : 0 })} ${units[unit]}`;
}

export const mediaTypeLabels: Record<string, string> = {
  "image/jpeg": "JPEG",
  "image/png": "PNG",
  "image/webp": "WebP",
};

/** Página de edição do conteúdo que usa um arquivo (entidades de media_usage). */
export function mediaUsageHref(entity: string, recordId: string | null, label = ""): string | null {
  switch (entity) {
    case "homepage":
      return "/admin/homepage";
    case "research-line":
      return `/admin/linhas-de-pesquisa/${recordId}/editar`;
    case "project":
      return `/admin/projetos/${recordId}/editar`;
    case "institution":
      return `/admin/instituicoes/${recordId}/editar`;
    case "site-logo":
    case "site-favicon":
    case "site-footer-logo":
      return "/admin/configuracoes";
    case "page-content":
      return "/admin/textos-das-paginas";
    case "custom-page":
      return recordId ? `/admin/paginas/${recordId}` : "/admin/paginas";
    case "page-section":
      // Para páginas personalizadas o id é o da página; para as demais, o da seção.
      if (label.includes("personalizada")) return recordId ? `/admin/paginas/${recordId}` : "/admin/paginas";
      return label.includes("rede") ? "/admin/secoes?pagina=rede" : "/admin/secoes";
    case "editorial-draft":
    case "editorial-revision":
      // Rascunhos e histórico: o id é o da unidade editorial.
      return recordId ? `/admin/historico?documento=${recordId}` : null;
    default:
      return null;
  }
}

const mediaDateFormat = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

/** Data de envio no fuso de Brasília (igual no servidor e no navegador). */
export function formatMediaDate(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : mediaDateFormat.format(date);
}
