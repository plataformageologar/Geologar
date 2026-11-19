import { MEDIA_PAGE_SIZE, isMediaObjectName, mediaPublicUrl } from "@/lib/media/config";
import { createClient } from "@/lib/supabase/server";

import type { AdminResult } from "./admin-content";
import { logQueryError } from "./shared";

/**
 * Leituras da biblioteca de mídia com a sessão do usuário: a função
 * list_media lê storage.objects, e a policy do bucket só devolve linhas a
 * admin e editor ativos.
 */

export type MediaItem = {
  name: string;
  url: string;
  createdAt: string;
  size: number | null;
  mimeType: string | null;
  originalName: string | null;
  width: number | null;
  height: number | null;
  usageCount: number;
};

export type MediaUsage = { entity: string; recordId: string; label: string };

export type MediaListFilters = { search?: string; unusedOnly?: boolean; page: number };

export async function getMediaLibrary(
  filters: MediaListFilters,
): Promise<AdminResult<{ items: MediaItem[]; total: number }>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_media", {
    p_search: filters.search || undefined,
    p_unused_only: filters.unusedOnly ?? false,
    p_limit: MEDIA_PAGE_SIZE,
    p_offset: (filters.page - 1) * MEDIA_PAGE_SIZE,
  });

  if (error) {
    logQueryError("biblioteca de mídia", error);
    return { status: "error" };
  }

  const items: MediaItem[] = [];
  for (const row of data) {
    const url = isMediaObjectName(row.name) ? mediaPublicUrl(row.name) : null;
    if (!url) continue;
    items.push({
      name: row.name,
      url,
      createdAt: row.created_at,
      size: row.size_bytes,
      mimeType: row.mime_type,
      originalName: row.original_name,
      width: row.width,
      height: row.height,
      usageCount: row.usage_count,
    });
  }
  return { status: "ready", data: { items, total: Number(data[0]?.total_count ?? 0) } };
}

/** Conteúdos que usam um arquivo (homepage, linhas, projetos, instituições…). */
export async function getMediaUsage(name: string): Promise<AdminResult<MediaUsage[]>> {
  if (!isMediaObjectName(name)) return { status: "ready", data: [] };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("media_usage", { p_name: name });
  if (error) {
    logQueryError("uso de mídia", error);
    return { status: "error" };
  }
  return {
    status: "ready",
    data: data.map((row) => ({ entity: row.entity, recordId: row.record_id, label: row.label })),
  };
}

/** Total de arquivos na biblioteca (painel), ou `null` se indisponível. */
export async function countMedia(): Promise<number | null> {
  const result = await getMediaLibrary({ page: 1 });
  return result.status === "ready" ? result.data.total : null;
}
