"use server";

import { refresh } from "next/cache";

import { getAdminAccess, type AdminRole } from "@/lib/auth/access";
import { researchLineEditColumns } from "@/lib/queries/admin-content";
import { createClient } from "@/lib/supabase/server";

import {
  classifyDatabaseError,
  fail,
  type FailureState,
  type RecordActionState,
} from "./action-results";
import {
  parseResearchLineValues,
  readResearchLineForm,
  toResearchLineFormValues,
  type ResearchLineField,
  type ResearchLineFormValues,
  type ResearchLineRecord,
} from "./research-lines";
import { isUuid } from "./validation";

/**
 * Server Actions de linhas de pesquisa. Cada action é um endpoint público:
 * verifica sessão e vínculo a cada chamada e grava com a sessão do usuário
 * (RLS + GRANTs de coluna). O id identifica o registro; a autorização vem
 * sempre do banco, nunca do navegador.
 */

export type ResearchLineSaveState =
  | { status: "idle" }
  | { status: "created"; id: string; published: boolean }
  | {
      status: "success";
      message: string;
      values: ResearchLineFormValues;
      updatedAt: string;
    }
  | FailureState<ResearchLineField>;

const ENTITY = "research-line" as const;
const EDITOR_ROLES: readonly AdminRole[] = ["admin", "editor"];

type Access = Awaited<ReturnType<typeof getAdminAccess>>;

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

const editableFields = [
  "title",
  "slug",
  "short_description",
  "description",
  "image_alt",
  "sort_order",
  "is_featured",
  "is_published",
] as const satisfies readonly (keyof ResearchLineRecord)[];

export async function saveResearchLine(
  _state: ResearchLineSaveState,
  formData: FormData,
): Promise<ResearchLineSaveState> {
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
        .from("research_lines")
        .select("id, updated_at, image_path")
        .eq("id", rawId)
        .maybeSingle();
      if (read.error) return fail(classifyDatabaseError("leitura de research_lines", read.error, read.status), ENTITY);
      if (!read.data) return fail("not-found", ENTITY);
      current = read.data;
    }

    // Validação definitiva no servidor.
    const hasImage = current?.image_path != null;
    const { data, errors } = parseResearchLineValues(readResearchLineForm(formData), { hasImage });
    if (Object.keys(errors).length > 0) return fail("validation", ENTITY, { fieldErrors: errors });

    // Sem imagem, o texto alternativo não é gravado (upload: Etapa 8).
    const { image_alt, ...withoutAlt } = data;
    const fieldsToSave = hasImage ? { ...withoutAlt, image_alt } : withoutAlt;

    if (current === null) {
      const created = await supabase
        .from("research_lines")
        .insert(withoutAlt)
        .select("id")
        .single();
      if (created.error) return saveFailure("inclusão em research_lines", created.error, created.status);
      return { status: "created", id: created.data.id, published: data.is_published };
    }

    // Edição simultânea: a versão do formulário precisa ser a atual.
    if (text(formData, "updated_at") !== current.updated_at) return fail("conflict", ENTITY);

    const saved = await supabase
      .from("research_lines")
      .update(fieldsToSave)
      .eq("id", current.id)
      .eq("updated_at", current.updated_at)
      .select(researchLineEditColumns)
      .maybeSingle();
    if (saved.error) return saveFailure("gravação de research_lines", saved.error, saved.status);

    if (!saved.data) {
      // Nenhuma linha alterada: gravação concorrente, exclusão ou recusa do RLS.
      const after = await supabase
        .from("research_lines")
        .select("updated_at")
        .eq("id", current.id)
        .maybeSingle();
      if (!after.error && !after.data) return fail("not-found", ENTITY);
      if (after.data && after.data.updated_at !== current.updated_at) return fail("conflict", ENTITY);
      console.warn("[cms] UPDATE de research_lines não alterou nenhuma linha (RLS).");
      return fail("forbidden", ENTITY);
    }

    // Confirmação: o banco devolveu exatamente os valores enviados.
    const row = saved.data;
    const confirmed = editableFields.every(
      (field) => !(field in fieldsToSave) || row[field] === fieldsToSave[field as keyof typeof fieldsToSave],
    );
    if (!confirmed) {
      console.error("[cms] Valores de research_lines devolvidos pelo banco diferem dos enviados.");
      return fail("unexpected", ENTITY);
    }

    // Atualiza cabeçalho e selos da página; o formulário mantém seu estado.
    refresh();
    return {
      status: "success",
      message: row.is_published
        ? "Alterações salvas. A linha está publicada: o site já mostra a nova versão."
        : "Alterações salvas. A linha continua como rascunho (fora do site).",
      values: toResearchLineFormValues(row),
      updatedAt: row.updated_at,
    };
  } catch (error) {
    console.error("[cms] Erro ao salvar linha de pesquisa:", error instanceof Error ? error.name : "desconhecido");
    return fail("connection", ENTITY);
  }
}

function saveFailure(
  scope: string,
  error: Parameters<typeof classifyDatabaseError>[1],
  status: number,
): FailureState<ResearchLineField> {
  const reason = classifyDatabaseError(scope, error, status);
  if (reason === "duplicate-slug") {
    return fail("duplicate-slug", ENTITY, {
      fieldErrors: { slug: "Este slug já está em uso por outra linha de pesquisa. Escolha outro." },
    });
  }
  return fail(reason, ENTITY);
}

/** Publicar ou despublicar pela listagem (sem abrir o formulário). */
export async function setResearchLinePublished(
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
      .from("research_lines")
      .select(researchLineEditColumns)
      .eq("id", id)
      .maybeSingle();
    if (read.error) return fail(classifyDatabaseError("leitura de research_lines", read.error, read.status), ENTITY);
    if (!read.data) return fail("not-found", ENTITY);

    if (publish) {
      // Mesmas regras do formulário: só publica um registro completo.
      const values = { ...toResearchLineFormValues(read.data), is_published: true };
      const { errors } = parseResearchLineValues(values, { hasImage: read.data.image_path !== null });
      if (Object.keys(errors).length > 0) {
        return fail("validation", ENTITY, {
          message: `Para publicar “${read.data.title}”, abra a edição e complete os campos obrigatórios (${errors.short_description ? "descrição curta" : "campos destacados"}).`,
        });
      }
    }

    const saved = await supabase
      .from("research_lines")
      .update({ is_published: publish })
      .eq("id", id)
      .select("id, is_published")
      .maybeSingle();
    if (saved.error) return fail(classifyDatabaseError("publicação de research_lines", saved.error, saved.status), ENTITY);
    if (!saved.data || saved.data.is_published !== publish) return fail("forbidden", ENTITY);

    refresh();
    return {
      status: "success",
      message: publish
        ? `“${read.data.title}” foi publicada e já aparece em /pesquisa.`
        : `“${read.data.title}” foi despublicada: saiu do site e continua salva como rascunho.`,
    };
  } catch (error) {
    console.error("[cms] Erro ao publicar linha de pesquisa:", error instanceof Error ? error.name : "desconhecido");
    return fail("connection", ENTITY);
  }
}

function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/**
 * Exclusão permanente: somente administradores, somente rascunhos sem
 * vínculos. O banco reforça as três regras (policy de DELETE e FKs com
 * RESTRICT), então uma corrida entre a checagem e o DELETE não apaga vínculos.
 */
export async function deleteResearchLine(
  _state: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  try {
    const access = await getAdminAccess();
    const denied = accessFailure(access, ["admin"]);
    if (denied) {
      return denied.reason === "forbidden"
        ? fail("forbidden", ENTITY, { message: "Somente administradores podem excluir linhas de pesquisa." })
        : denied;
    }

    const id = text(formData, "id");
    if (!isUuid(id)) return fail("not-found", ENTITY);

    const supabase = await createClient();
    const read = await supabase
      .from("research_lines")
      .select("id, title, is_published")
      .eq("id", id)
      .maybeSingle();
    if (read.error) return fail(classifyDatabaseError("leitura de research_lines", read.error, read.status), ENTITY);
    if (!read.data) return fail("not-found", ENTITY);
    if (read.data.is_published) return fail("published", ENTITY);

    const [projects, publications] = await Promise.all([
      supabase
        .from("project_research_lines")
        .select("project:projects (title)")
        .eq("research_line_id", id),
      supabase
        .from("publication_research_lines")
        .select("publication_id", { count: "exact", head: true })
        .eq("research_line_id", id),
    ]);
    if (projects.error) return fail(classifyDatabaseError("vínculos de research_lines", projects.error, projects.status), ENTITY);
    if (publications.error) return fail(classifyDatabaseError("vínculos de research_lines", publications.error, publications.status), ENTITY);

    const projectTitles = projects.data.map(({ project }) => project?.title).filter(Boolean);
    const publicationCount = publications.count ?? 0;
    if (projectTitles.length > 0 || publicationCount > 0) {
      const parts = [
        projectTitles.length > 0 &&
          `${plural(projectTitles.length, "projeto", "projetos")} (${projectTitles.join(", ")})`,
        publicationCount > 0 && plural(publicationCount, "publicação", "publicações"),
      ].filter(Boolean);
      const hints = [
        projectTitles.length > 0 && "Desmarque a linha na edição de cada projeto.",
        publicationCount > 0 && "Os vínculos com publicações precisam ser desfeitos no módulo de publicações.",
      ].filter(Boolean);
      return fail("has-dependencies", ENTITY, {
        message: `Não é possível excluir “${read.data.title}”: a linha está vinculada a ${parts.join(" e a ")}. ${hints.join(" ")}`,
      });
    }

    const removed = await supabase
      .from("research_lines")
      .delete()
      .eq("id", id)
      .eq("is_published", false)
      .select("id");
    if (removed.error) {
      const reason = classifyDatabaseError("exclusão de research_lines", removed.error, removed.status);
      return reason === "has-dependencies"
        ? fail(reason, ENTITY, {
            message: `“${read.data.title}” recebeu um vínculo durante a exclusão e foi mantida. Revise os vínculos e tente novamente.`,
          })
        : fail(reason, ENTITY);
    }
    if (removed.data.length === 0) {
      const after = await supabase.from("research_lines").select("is_published").eq("id", id).maybeSingle();
      if (after.data?.is_published) return fail("published", ENTITY);
      if (!after.error && !after.data) return fail("not-found", ENTITY);
      return fail("forbidden", ENTITY);
    }

    refresh();
    return { status: "success", message: `“${read.data.title}” foi excluída permanentemente.` };
  } catch (error) {
    console.error("[cms] Erro ao excluir linha de pesquisa:", error instanceof Error ? error.name : "desconhecido");
    return fail("connection", ENTITY);
  }
}
