import { createClient } from "@/lib/supabase/server";
import type { ProjectSummary } from "@/types/content";

import type { AdminResult } from "./admin-content";
import { projectSummaryColumns, toProjectSummary } from "./projects";
import { logQueryError } from "./shared";

/** Quantidade máxima de rascunhos exibidos na prévia de demonstração. */
const DEMO_DRAFT_LIMIT = 6;

/**
 * Rascunhos de projeto para a prévia protegida (`/admin/demonstracao`). Usa a
 * sessão do usuário: a policy "CMS staff can read all projects" libera
 * rascunhos apenas para admin/editor ativos — anônimos não os recebem.
 */
export async function getDraftProjectsForDemo(): Promise<AdminResult<ProjectSummary[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(projectSummaryColumns)
    .eq("is_published", false)
    .order("sort_order")
    .order("title")
    .limit(DEMO_DRAFT_LIMIT);

  if (error) {
    logQueryError("projects (prévia de demonstração)", error);
    return { status: "error" };
  }
  return { status: "ready", data: data.map(toProjectSummary) };
}
