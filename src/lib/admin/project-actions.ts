"use server";

import { refresh } from "next/cache";

import { getAdminAccess, type AdminRole } from "@/lib/auth/access";
import { projectEditColumns } from "@/lib/queries/admin-content";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

import {
  classifyDatabaseError,
  fail,
  type FailureState,
  type RecordActionState,
} from "./action-results";
import {
  parseProjectValues,
  readProjectForm,
  toProjectFormValues,
  type ProjectField,
  type ProjectFormValues,
  type ProjectRecord,
} from "./projects";
import { isUuid } from "./validation";

/**
 * Server Actions de projetos. A gravação do projeto e de suas linhas de
 * pesquisa acontece numa única chamada à função save_project (uma transação,
 * SECURITY INVOKER): se qualquer parte falhar, nada é gravado.
 */

export type ProjectSaveState =
  | { status: "idle" }
  | { status: "created"; id: string; published: boolean }
  | { status: "success"; message: string; values: ProjectFormValues; updatedAt: string }
  | FailureState<ProjectField>;

const ENTITY = "project" as const;
const EDITOR_ROLES: readonly AdminRole[] = ["admin", "editor"];

type Access = Awaited<ReturnType<typeof getAdminAccess>>;
type SaveProjectArgs = Database["public"]["Functions"]["save_project"]["Args"];

function accessFailure(access: Access, roles: readonly AdminRole[]) {
  if (access.status === "anonymous") return fail("session", ENTITY);
  if (access.status === "forbidden" || !roles.includes(access.role)) {
    return fail("forbidden", ENTITY);
  }
  return null;
}

function text(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value : "";
}

const comparedFields = [
  "title",
  "slug",
  "short_description",
  "description",
  "project_status",
  "start_date",
  "end_date",
  "coordination",
  "funding",
  "result_or_contribution",
  "external_url",
  "sort_order",
  "is_featured",
  "is_published",
] as const satisfies readonly (keyof ProjectRecord)[];

function saveFailure(
  scope: string,
  error: Parameters<typeof classifyDatabaseError>[1],
  status: number,
): FailureState<ProjectField> {
  const reason = classifyDatabaseError(scope, error, status);
  if (reason === "duplicate-slug") {
    return fail(reason, ENTITY, {
      fieldErrors: { slug: "Este slug já está em uso por outro projeto. Escolha outro." },
    });
  }
  if (reason === "has-dependencies") {
    // FK de project_research_lines: uma linha selecionada deixou de existir.
    return fail("validation", ENTITY, {
      fieldErrors: {
        research_line_ids:
          "Uma das linhas selecionadas não existe mais. Recarregue a página e selecione novamente.",
      },
    });
  }
  return fail(reason, ENTITY);
}

export async function saveProject(
  _state: ProjectSaveState,
  formData: FormData,
): Promise<ProjectSaveState> {
  try {
    const denied = accessFailure(await getAdminAccess(), EDITOR_ROLES);
    if (denied) return denied;

    const rawId = text(formData, "id");
    const isNew = rawId === "";
    if (!isNew && !isUuid(rawId)) return fail("not-found", ENTITY);

    const supabase = await createClient();

    let current: { id: string; updated_at: string; image_path: string | null } | null = null;
    if (!isNew) {
      const read = await supabase
        .from("projects")
        .select("id, updated_at, image_path")
        .eq("id", rawId)
        .maybeSingle();
      if (read.error) return fail(classifyDatabaseError("leitura de projects", read.error, read.status), ENTITY);
      if (!read.data) return fail("not-found", ENTITY);
      current = read.data;
    }

    // Linhas existentes (o formulário não é prova de que o id existe).
    const lines = await supabase.from("research_lines").select("id").limit(1000);
    if (lines.error) return fail(classifyDatabaseError("leitura de research_lines", lines.error, lines.status), ENTITY);

    const hasImage = current?.image_path != null;
    const { data, researchLineIds, errors } = parseProjectValues(readProjectForm(formData), {
      hasImage,
      knownLineIds: new Set(lines.data.map((line) => line.id)),
    });
    if (Object.keys(errors).length > 0) return fail("validation", ENTITY, { fieldErrors: errors });

    if (current && text(formData, "updated_at") !== current.updated_at) return fail("conflict", ENTITY);

    // Os tipos gerados marcam todos os argumentos como obrigatórios e não
    // nulos; a função aceita null nos campos opcionais (e p_id null = novo).
    const args = {
      p_id: current?.id ?? null,
      p_expected_updated_at: current?.updated_at ?? null,
      p_title: data.title,
      p_slug: data.slug,
      p_short_description: data.short_description,
      p_description: data.description,
      p_image_alt: data.image_alt,
      p_project_status: data.project_status,
      p_start_date: data.start_date,
      p_end_date: data.end_date,
      p_coordination: data.coordination,
      p_funding: data.funding,
      p_result_or_contribution: data.result_or_contribution,
      p_external_url: data.external_url,
      p_sort_order: data.sort_order,
      p_is_featured: data.is_featured,
      p_is_published: data.is_published,
      p_research_line_ids: researchLineIds,
    } satisfies Record<keyof SaveProjectArgs, unknown>;

    const saved = await supabase.rpc("save_project", args as SaveProjectArgs);
    if (saved.error) return saveFailure("save_project", saved.error, saved.status);
    if (!saved.data?.id) return fail("unexpected", ENTITY);

    if (current === null) return { status: "created", id: saved.data.id, published: saved.data.is_published };

    // Confirmação: relê projeto e vínculos gravados e compara com o enviado.
    const check = await supabase
      .from("projects")
      .select(`${projectEditColumns}, project_research_lines (research_line_id)`)
      .eq("id", current.id)
      .maybeSingle();
    if (check.error || !check.data) {
      console.error("[cms] Não foi possível confirmar a gravação do projeto.");
      return fail("unexpected", ENTITY, {
        message: "O projeto foi enviado, mas não foi possível confirmar a gravação. Recarregue a página para conferir.",
      });
    }
    const row = check.data;
    const persistedLines = row.project_research_lines.map((link) => link.research_line_id).sort();
    const confirmed =
      comparedFields.every((field) => row[field] === data[field]) &&
      (!hasImage || row.image_alt === data.image_alt) &&
      persistedLines.join() === researchLineIds.join();
    if (!confirmed) {
      console.error("[cms] Valores de projects devolvidos pelo banco diferem dos enviados.");
      return fail("unexpected", ENTITY);
    }

    // Atualiza cabeçalho e selos da página; o formulário mantém seu estado.
    refresh();
    return {
      status: "success",
      message: row.is_published
        ? "Alterações salvas. O projeto está publicado: o site já mostra a nova versão."
        : "Alterações salvas. O projeto continua como rascunho (fora do site).",
      values: toProjectFormValues(row, persistedLines),
      updatedAt: row.updated_at,
    };
  } catch (error) {
    console.error("[cms] Erro ao salvar projeto:", error instanceof Error ? error.name : "desconhecido");
    return fail("connection", ENTITY);
  }
}

/** Publicar ou despublicar pela listagem. */
export async function setProjectPublished(
  _state: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  try {
    const denied = accessFailure(await getAdminAccess(), EDITOR_ROLES);
    if (denied) return denied;

    const id = text(formData, "id");
    const publish = text(formData, "publish") === "true";
    if (!isUuid(id)) return fail("not-found", ENTITY);

    const supabase = await createClient();
    const read = await supabase
      .from("projects")
      .select(`${projectEditColumns}, project_research_lines (research_line_id)`)
      .eq("id", id)
      .maybeSingle();
    if (read.error) return fail(classifyDatabaseError("leitura de projects", read.error, read.status), ENTITY);
    if (!read.data) return fail("not-found", ENTITY);

    if (publish) {
      const values = {
        ...toProjectFormValues(
          read.data,
          read.data.project_research_lines.map((link) => link.research_line_id),
        ),
        is_published: true,
      };
      const { errors } = parseProjectValues(values, { hasImage: read.data.image_path !== null });
      if (Object.keys(errors).length > 0) {
        return fail("validation", ENTITY, {
          message: `Para publicar “${read.data.title}”, abra a edição e complete os campos obrigatórios (${errors.short_description ? "descrição curta" : "campos destacados"}).`,
        });
      }
    }

    const saved = await supabase
      .from("projects")
      .update({ is_published: publish })
      .eq("id", id)
      .select("id, is_published")
      .maybeSingle();
    if (saved.error) return fail(classifyDatabaseError("publicação de projects", saved.error, saved.status), ENTITY);
    if (!saved.data || saved.data.is_published !== publish) return fail("forbidden", ENTITY);

    refresh();
    return {
      status: "success",
      message: publish
        ? `“${read.data.title}” foi publicado e já aparece em /projetos.`
        : `“${read.data.title}” foi despublicado: saiu do site e continua salvo como rascunho.`,
    };
  } catch (error) {
    console.error("[cms] Erro ao publicar projeto:", error instanceof Error ? error.name : "desconhecido");
    return fail("connection", ENTITY);
  }
}

function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/**
 * Exclusão permanente: somente administradores, somente rascunhos sem
 * vínculos (linhas de pesquisa ou publicações). Reforçado no banco pela
 * policy de DELETE e pelas FKs com RESTRICT.
 */
export async function deleteProject(
  _state: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  try {
    const denied = accessFailure(await getAdminAccess(), ["admin"]);
    if (denied) {
      return denied.reason === "forbidden"
        ? fail("forbidden", ENTITY, { message: "Somente administradores podem excluir projetos." })
        : denied;
    }

    const id = text(formData, "id");
    if (!isUuid(id)) return fail("not-found", ENTITY);

    const supabase = await createClient();
    const read = await supabase
      .from("projects")
      .select("id, title, is_published")
      .eq("id", id)
      .maybeSingle();
    if (read.error) return fail(classifyDatabaseError("leitura de projects", read.error, read.status), ENTITY);
    if (!read.data) return fail("not-found", ENTITY);
    if (read.data.is_published) return fail("published", ENTITY);

    const [lines, publications] = await Promise.all([
      supabase
        .from("project_research_lines")
        .select("research_line:research_lines (title)")
        .eq("project_id", id),
      supabase
        .from("publication_projects")
        .select("publication_id", { count: "exact", head: true })
        .eq("project_id", id),
    ]);
    if (lines.error) return fail(classifyDatabaseError("vínculos de projects", lines.error, lines.status), ENTITY);
    if (publications.error) return fail(classifyDatabaseError("vínculos de projects", publications.error, publications.status), ENTITY);

    const lineTitles = lines.data.map(({ research_line }) => research_line?.title).filter(Boolean);
    const publicationCount = publications.count ?? 0;
    if (lineTitles.length > 0 || publicationCount > 0) {
      const parts = [
        lineTitles.length > 0 &&
          `${plural(lineTitles.length, "linha de pesquisa", "linhas de pesquisa")} (${lineTitles.join(", ")})`,
        publicationCount > 0 && plural(publicationCount, "publicação", "publicações"),
      ].filter(Boolean);
      const hints = [
        lineTitles.length > 0 && "Desmarque as linhas na edição do projeto.",
        publicationCount > 0 && "Os vínculos com publicações precisam ser desfeitos no módulo de publicações.",
      ].filter(Boolean);
      return fail("has-dependencies", ENTITY, {
        message: `Não é possível excluir “${read.data.title}”: o projeto está vinculado a ${parts.join(" e a ")}. ${hints.join(" ")}`,
      });
    }

    const removed = await supabase
      .from("projects")
      .delete()
      .eq("id", id)
      .eq("is_published", false)
      .select("id");
    if (removed.error) {
      const reason = classifyDatabaseError("exclusão de projects", removed.error, removed.status);
      return reason === "has-dependencies"
        ? fail(reason, ENTITY, {
            message: `“${read.data.title}” recebeu um vínculo durante a exclusão e foi mantido. Revise os vínculos e tente novamente.`,
          })
        : fail(reason, ENTITY);
    }
    if (removed.data.length === 0) {
      const after = await supabase.from("projects").select("is_published").eq("id", id).maybeSingle();
      if (after.data?.is_published) return fail("published", ENTITY);
      if (!after.error && !after.data) return fail("not-found", ENTITY);
      return fail("forbidden", ENTITY);
    }

    refresh();
    return { status: "success", message: `“${read.data.title}” foi excluído permanentemente.` };
  } catch (error) {
    console.error("[cms] Erro ao excluir projeto:", error instanceof Error ? error.name : "desconhecido");
    return fail("connection", ENTITY);
  }
}
