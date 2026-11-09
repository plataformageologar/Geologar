"use server";

import { refresh } from "next/cache";

import { getAdminAccess } from "@/lib/auth/access";
import { publicationEditColumns } from "@/lib/queries/admin-publications";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

import {
  accessFailure,
  ADMIN_ROLES,
  classifyDatabaseError,
  EDITOR_ROLES,
  fail,
  formText,
  logActionError,
  plural,
  violatedConstraint,
  type FailureState,
  type RecordActionState,
} from "./action-results";
import {
  parsePublicationValues,
  readPublicationForm,
  toPublicationFormValues,
  type PublicationField,
  type PublicationFormValues,
  type PublicationRecord,
} from "./publications";
import { isUuid } from "./validation";

/**
 * Server Actions de publicações. A publicação e seus vínculos (projetos e
 * linhas de pesquisa) são gravados numa única chamada a save_publication (uma
 * transação, SECURITY INVOKER): se qualquer parte falhar, nada é gravado.
 */

export type PublicationSaveState =
  | { status: "idle" }
  | { status: "created"; id: string; published: boolean }
  | { status: "success"; message: string; values: PublicationFormValues; updatedAt: string }
  | FailureState<PublicationField>;

const ENTITY = "publication" as const;

type SavePublicationArgs = Database["public"]["Functions"]["save_publication"]["Args"];

const comparedFields = [
  "title",
  "slug",
  "authors",
  "publication_venue",
  "publication_year",
  "doi",
  "external_url",
  "abstract",
  "citation",
  "sort_order",
  "is_featured",
  "is_published",
] as const satisfies readonly (keyof PublicationRecord)[];

function saveFailure(
  scope: string,
  error: Parameters<typeof classifyDatabaseError>[1],
  status: number,
): FailureState<PublicationField> {
  const reason = classifyDatabaseError(scope, error, status);
  if (reason === "duplicate-slug") {
    return violatedConstraint(error) === "publications_doi_key"
      ? fail("duplicate-slug", ENTITY, {
          message: "Já existe uma publicação com este DOI.",
          fieldErrors: { doi: "Este DOI já está cadastrado em outra publicação." },
        })
      : fail("duplicate-slug", ENTITY, {
          fieldErrors: { slug: "Este slug já está em uso por outra publicação. Escolha outro." },
        });
  }
  if (reason === "has-dependencies") {
    // FK dos vínculos: um projeto ou linha selecionado deixou de existir.
    return fail("validation", ENTITY, {
      message: "Um dos projetos ou linhas selecionados não existe mais. Recarregue a página e selecione novamente.",
    });
  }
  return fail(reason, ENTITY);
}

export async function savePublication(
  _state: PublicationSaveState,
  formData: FormData,
): Promise<PublicationSaveState> {
  try {
    const denied = accessFailure(await getAdminAccess(), EDITOR_ROLES, ENTITY);
    if (denied) return denied;

    const rawId = formText(formData, "id");
    const isNew = rawId === "";
    if (!isNew && !isUuid(rawId)) return fail("not-found", ENTITY);

    const supabase = await createClient();

    let current: { id: string; updated_at: string } | null = null;
    if (!isNew) {
      const read = await supabase.from("publications").select("id, updated_at").eq("id", rawId).maybeSingle();
      if (read.error) return fail(classifyDatabaseError("leitura de publications", read.error, read.status), ENTITY);
      if (!read.data) return fail("not-found", ENTITY);
      current = read.data;
    }

    // Projetos e linhas existentes (o formulário não prova que o id existe).
    const [projects, lines] = await Promise.all([
      supabase.from("projects").select("id").limit(1000),
      supabase.from("research_lines").select("id").limit(1000),
    ]);
    if (projects.error) return fail(classifyDatabaseError("leitura de projects", projects.error, projects.status), ENTITY);
    if (lines.error) return fail(classifyDatabaseError("leitura de research_lines", lines.error, lines.status), ENTITY);

    const { data, projectIds, researchLineIds, errors } = parsePublicationValues(readPublicationForm(formData), {
      knownProjectIds: new Set(projects.data.map((project) => project.id)),
      knownLineIds: new Set(lines.data.map((line) => line.id)),
    });
    if (Object.keys(errors).length > 0) return fail("validation", ENTITY, { fieldErrors: errors });

    if (current && formText(formData, "updated_at") !== current.updated_at) return fail("conflict", ENTITY);

    // Os tipos gerados marcam todos os argumentos como não nulos; a função
    // aceita null nos campos opcionais (e p_id null = nova publicação).
    const args = {
      p_id: current?.id ?? null,
      p_expected_updated_at: current?.updated_at ?? null,
      p_title: data.title,
      p_slug: data.slug,
      p_authors: data.authors,
      p_publication_venue: data.publication_venue,
      p_publication_year: data.publication_year,
      p_doi: data.doi,
      p_external_url: data.external_url,
      p_abstract: data.abstract,
      p_citation: data.citation,
      p_sort_order: data.sort_order,
      p_is_featured: data.is_featured,
      p_is_published: data.is_published,
      p_project_ids: projectIds,
      p_research_line_ids: researchLineIds,
    } satisfies Record<keyof SavePublicationArgs, unknown>;

    const saved = await supabase.rpc("save_publication", args as SavePublicationArgs);
    if (saved.error) return saveFailure("save_publication", saved.error, saved.status);
    if (!saved.data?.id) return fail("unexpected", ENTITY);

    if (current === null) return { status: "created", id: saved.data.id, published: saved.data.is_published };

    // Confirmação: relê publicação e vínculos gravados e compara com o enviado.
    const check = await supabase
      .from("publications")
      .select(`${publicationEditColumns}, publication_projects (project_id), publication_research_lines (research_line_id)`)
      .eq("id", current.id)
      .maybeSingle();
    if (check.error || !check.data) {
      console.error("[cms] Não foi possível confirmar a gravação da publicação.");
      return fail("unexpected", ENTITY, {
        message: "A publicação foi enviada, mas não foi possível confirmar a gravação. Recarregue a página para conferir.",
      });
    }
    const row = check.data;
    const persistedProjects = row.publication_projects.map((link) => link.project_id).sort();
    const persistedLines = row.publication_research_lines.map((link) => link.research_line_id).sort();
    const confirmed =
      comparedFields.every((field) => row[field] === data[field]) &&
      persistedProjects.join() === projectIds.join() &&
      persistedLines.join() === researchLineIds.join();
    if (!confirmed) {
      console.error("[cms] Valores de publications devolvidos pelo banco diferem dos enviados.");
      return fail("unexpected", ENTITY);
    }

    refresh();
    return {
      status: "success",
      message: row.is_published
        ? "Alterações salvas. A publicação está publicada: /publicacoes já mostra a nova versão."
        : "Alterações salvas. A publicação continua como rascunho (fora do site).",
      values: toPublicationFormValues(row, persistedProjects, persistedLines),
      updatedAt: row.updated_at,
    };
  } catch (error) {
    logActionError("salvar publicação", error);
    return fail("connection", ENTITY);
  }
}

/** Publicar ou despublicar pela listagem (vínculos são preservados). */
export async function setPublicationPublished(
  _state: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  try {
    const denied = accessFailure(await getAdminAccess(), EDITOR_ROLES, ENTITY);
    if (denied) return denied;

    const id = formText(formData, "id");
    const publish = formText(formData, "publish") === "true";
    if (!isUuid(id)) return fail("not-found", ENTITY);

    const supabase = await createClient();
    const read = await supabase.from("publications").select(publicationEditColumns).eq("id", id).maybeSingle();
    if (read.error) return fail(classifyDatabaseError("leitura de publications", read.error, read.status), ENTITY);
    if (!read.data) return fail("not-found", ENTITY);

    if (publish) {
      const values = { ...toPublicationFormValues(read.data, [], []), is_published: true };
      const { errors } = parsePublicationValues(values);
      if (Object.keys(errors).length > 0) {
        return fail("validation", ENTITY, {
          message: `Para publicar “${read.data.title}”, abra a edição e corrija os campos destacados.`,
        });
      }
    }

    const saved = await supabase
      .from("publications")
      .update({ is_published: publish })
      .eq("id", id)
      .select("id, is_published")
      .maybeSingle();
    if (saved.error) return fail(classifyDatabaseError("publicação de publications", saved.error, saved.status), ENTITY);
    if (!saved.data || saved.data.is_published !== publish) return fail("forbidden", ENTITY);

    refresh();
    return {
      status: "success",
      message: publish
        ? `“${read.data.title}” foi publicada e já aparece em /publicacoes.`
        : `“${read.data.title}” foi despublicada: saiu do site e continua salva como rascunho, com seus vínculos.`,
    };
  } catch (error) {
    logActionError("publicar publicação", error);
    return fail("connection", ENTITY);
  }
}

/**
 * Exclusão permanente: somente administradores, somente rascunhos sem
 * vínculos. O banco reforça as regras (policy de DELETE e FKs com RESTRICT).
 */
export async function deletePublication(
  _state: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  try {
    const denied = accessFailure(
      await getAdminAccess(),
      ADMIN_ROLES,
      ENTITY,
      "Somente administradores podem excluir publicações.",
    );
    if (denied) return denied;

    const id = formText(formData, "id");
    if (!isUuid(id)) return fail("not-found", ENTITY);

    const supabase = await createClient();
    const read = await supabase.from("publications").select("id, title, is_published").eq("id", id).maybeSingle();
    if (read.error) return fail(classifyDatabaseError("leitura de publications", read.error, read.status), ENTITY);
    if (!read.data) return fail("not-found", ENTITY);
    if (read.data.is_published) return fail("published", ENTITY);

    const [projects, lines] = await Promise.all([
      supabase.from("publication_projects").select("project:projects (title)").eq("publication_id", id),
      supabase.from("publication_research_lines").select("research_line:research_lines (title)").eq("publication_id", id),
    ]);
    if (projects.error) return fail(classifyDatabaseError("vínculos de publications", projects.error, projects.status), ENTITY);
    if (lines.error) return fail(classifyDatabaseError("vínculos de publications", lines.error, lines.status), ENTITY);

    const projectTitles = projects.data.map(({ project }) => project?.title).filter(Boolean);
    const lineTitles = lines.data.map(({ research_line }) => research_line?.title).filter(Boolean);
    if (projectTitles.length > 0 || lineTitles.length > 0) {
      const parts = [
        projectTitles.length > 0 && `${plural(projectTitles.length, "projeto", "projetos")} (${projectTitles.join(", ")})`,
        lineTitles.length > 0 &&
          `${plural(lineTitles.length, "linha de pesquisa", "linhas de pesquisa")} (${lineTitles.join(", ")})`,
      ].filter(Boolean);
      return fail("has-dependencies", ENTITY, {
        message: `Não é possível excluir “${read.data.title}”: a publicação está vinculada a ${parts.join(" e a ")}. Desmarque esses vínculos na edição da publicação antes de excluir.`,
      });
    }

    const removed = await supabase.from("publications").delete().eq("id", id).eq("is_published", false).select("id");
    if (removed.error) {
      const reason = classifyDatabaseError("exclusão de publications", removed.error, removed.status);
      return reason === "has-dependencies"
        ? fail(reason, ENTITY, {
            message: `“${read.data.title}” recebeu um vínculo durante a exclusão e foi mantida. Revise os vínculos e tente novamente.`,
          })
        : fail(reason, ENTITY);
    }
    if (removed.data.length === 0) {
      const after = await supabase.from("publications").select("is_published").eq("id", id).maybeSingle();
      if (after.data?.is_published) return fail("published", ENTITY);
      if (!after.error && !after.data) return fail("not-found", ENTITY);
      return fail("forbidden", ENTITY);
    }

    refresh();
    return { status: "success", message: `“${read.data.title}” foi excluída permanentemente.` };
  } catch (error) {
    logActionError("excluir publicação", error);
    return fail("connection", ENTITY);
  }
}
