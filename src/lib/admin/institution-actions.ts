"use server";

import { refresh } from "next/cache";

import { getAdminAccess } from "@/lib/auth/access";
import { categoryEditColumns, institutionEditColumns } from "@/lib/queries/admin-institutional";
import { createClient } from "@/lib/supabase/server";

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
  parseCategoryValues,
  parseInstitutionValues,
  readCategoryForm,
  readInstitutionForm,
  toCategoryFormValues,
  toInstitutionFormValues,
  type CategoryField,
  type CategoryFormValues,
  type InstitutionField,
  type InstitutionFormValues,
  type InstitutionRecord,
} from "./institutions";
import { isUuid } from "./validation";

/**
 * Server Actions de instituições e de suas categorias. Cada action verifica
 * sessão e vínculo e grava com a sessão do usuário (RLS + GRANTs de coluna).
 * Instituições: admin e editor; categorias e exclusões: somente admin.
 */

export type InstitutionSaveState =
  | { status: "idle" }
  | { status: "created"; id: string; published: boolean }
  | { status: "success"; message: string; values: InstitutionFormValues; updatedAt: string }
  | FailureState<InstitutionField>;

const ENTITY = "institution" as const;
const CATEGORY = "institution-category" as const;

const editableFields = [
  "category_id",
  "name",
  "acronym",
  "description",
  "logo_alt",
  "website_url",
  "city",
  "state",
  "country",
  "sort_order",
  "is_featured",
  "is_published",
] as const satisfies readonly (keyof InstitutionRecord)[];

function institutionFailure(
  scope: string,
  error: Parameters<typeof classifyDatabaseError>[1],
  status: number,
): FailureState<InstitutionField> {
  const reason = classifyDatabaseError(scope, error, status);
  if (reason === "has-dependencies") {
    // FK institutions_category_id_fkey: a categoria foi excluída nesse meio-tempo.
    return fail("validation", ENTITY, {
      fieldErrors: { category_id: "A categoria selecionada não existe mais. Recarregue a página e escolha outra." },
    });
  }
  return fail(reason, ENTITY);
}

export async function saveInstitution(
  _state: InstitutionSaveState,
  formData: FormData,
): Promise<InstitutionSaveState> {
  try {
    const denied = accessFailure(await getAdminAccess(), EDITOR_ROLES, ENTITY);
    if (denied) return denied;

    const rawId = formText(formData, "id");
    const isNew = rawId === "";
    if (!isNew && !isUuid(rawId)) return fail("not-found", ENTITY);

    const supabase = await createClient();

    let current: { id: string; updated_at: string; logo_path: string | null } | null = null;
    if (!isNew) {
      const read = await supabase
        .from("institutions")
        .select("id, updated_at, logo_path")
        .eq("id", rawId)
        .maybeSingle();
      if (read.error) return fail(classifyDatabaseError("leitura de institutions", read.error, read.status), ENTITY);
      if (!read.data) return fail("not-found", ENTITY);
      current = read.data;
    }

    const categories = await supabase.from("institution_categories").select("id").limit(500);
    if (categories.error) {
      return fail(classifyDatabaseError("leitura de institution_categories", categories.error, categories.status), ENTITY);
    }

    const hasLogo = current?.logo_path != null;
    const { data, errors } = parseInstitutionValues(readInstitutionForm(formData), {
      hasLogo,
      knownCategoryIds: new Set(categories.data.map((category) => category.id)),
    });
    if (Object.keys(errors).length > 0) return fail("validation", ENTITY, { fieldErrors: errors });

    // Sem logotipo, o texto alternativo não é gravado (upload: Etapa 8).
    const { logo_alt, ...withoutAlt } = data;
    const fieldsToSave = hasLogo ? { ...withoutAlt, logo_alt } : withoutAlt;

    if (current === null) {
      const created = await supabase.from("institutions").insert(withoutAlt).select("id").single();
      if (created.error) return institutionFailure("inclusão em institutions", created.error, created.status);
      return { status: "created", id: created.data.id, published: data.is_published };
    }

    if (formText(formData, "updated_at") !== current.updated_at) return fail("conflict", ENTITY);

    const saved = await supabase
      .from("institutions")
      .update(fieldsToSave)
      .eq("id", current.id)
      .eq("updated_at", current.updated_at)
      .select(institutionEditColumns)
      .maybeSingle();
    if (saved.error) return institutionFailure("gravação de institutions", saved.error, saved.status);

    if (!saved.data) {
      // Nenhuma linha alterada: gravação concorrente, exclusão ou recusa do RLS.
      const after = await supabase.from("institutions").select("updated_at").eq("id", current.id).maybeSingle();
      if (!after.error && !after.data) return fail("not-found", ENTITY);
      if (after.data && after.data.updated_at !== current.updated_at) return fail("conflict", ENTITY);
      console.warn("[cms] UPDATE de institutions não alterou nenhuma linha (RLS).");
      return fail("forbidden", ENTITY);
    }

    const row = saved.data;
    const confirmed = editableFields.every(
      (field) => !(field in fieldsToSave) || row[field] === fieldsToSave[field as keyof typeof fieldsToSave],
    );
    if (!confirmed) {
      console.error("[cms] Valores de institutions devolvidos pelo banco diferem dos enviados.");
      return fail("unexpected", ENTITY);
    }

    refresh();
    return {
      status: "success",
      message: row.is_published
        ? "Alterações salvas. A instituição está publicada: /instituicoes já mostra a nova versão."
        : "Alterações salvas. A instituição continua como rascunho (fora do site).",
      values: toInstitutionFormValues(row),
      updatedAt: row.updated_at,
    };
  } catch (error) {
    logActionError("salvar instituição", error);
    return fail("connection", ENTITY);
  }
}

export async function setInstitutionPublished(
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
    const read = await supabase.from("institutions").select(institutionEditColumns).eq("id", id).maybeSingle();
    if (read.error) return fail(classifyDatabaseError("leitura de institutions", read.error, read.status), ENTITY);
    if (!read.data) return fail("not-found", ENTITY);

    if (publish) {
      const values = { ...toInstitutionFormValues(read.data), is_published: true };
      const { errors } = parseInstitutionValues(values, { hasLogo: read.data.logo_path !== null });
      if (Object.keys(errors).length > 0) {
        return fail("validation", ENTITY, {
          message: `Para publicar “${read.data.name}”, abra a edição e corrija os campos destacados.`,
        });
      }
    }

    const saved = await supabase
      .from("institutions")
      .update({ is_published: publish })
      .eq("id", id)
      .select("id, is_published")
      .maybeSingle();
    if (saved.error) return fail(classifyDatabaseError("publicação de institutions", saved.error, saved.status), ENTITY);
    if (!saved.data || saved.data.is_published !== publish) return fail("forbidden", ENTITY);

    refresh();
    return {
      status: "success",
      message: publish
        ? `“${read.data.name}” foi publicada e já aparece em /instituicoes.`
        : `“${read.data.name}” foi despublicada: saiu do site e continua salva como rascunho.`,
    };
  } catch (error) {
    logActionError("publicar instituição", error);
    return fail("connection", ENTITY);
  }
}

/** Exclusão permanente: somente administradores, somente rascunhos. */
export async function deleteInstitution(
  _state: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  try {
    const denied = accessFailure(
      await getAdminAccess(),
      ADMIN_ROLES,
      ENTITY,
      "Somente administradores podem excluir instituições.",
    );
    if (denied) return denied;

    const id = formText(formData, "id");
    if (!isUuid(id)) return fail("not-found", ENTITY);

    const supabase = await createClient();
    const read = await supabase.from("institutions").select("id, name, is_published").eq("id", id).maybeSingle();
    if (read.error) return fail(classifyDatabaseError("leitura de institutions", read.error, read.status), ENTITY);
    if (!read.data) return fail("not-found", ENTITY);
    if (read.data.is_published) return fail("published", ENTITY);

    const removed = await supabase.from("institutions").delete().eq("id", id).eq("is_published", false).select("id");
    if (removed.error) {
      return fail(classifyDatabaseError("exclusão de institutions", removed.error, removed.status), ENTITY);
    }
    if (removed.data.length === 0) {
      const after = await supabase.from("institutions").select("is_published").eq("id", id).maybeSingle();
      if (after.data?.is_published) return fail("published", ENTITY);
      if (!after.error && !after.data) return fail("not-found", ENTITY);
      return fail("forbidden", ENTITY);
    }

    refresh();
    return {
      status: "success",
      message: `“${read.data.name}” foi excluída permanentemente. A categoria continua cadastrada.`,
    };
  } catch (error) {
    logActionError("excluir instituição", error);
    return fail("connection", ENTITY);
  }
}

// Categorias -----------------------------------------------------------------------

export type CategorySaveState =
  | { status: "idle" }
  | { status: "created"; id: string; message: string }
  | { status: "success"; message: string; values: CategoryFormValues; updatedAt: string }
  | FailureState<CategoryField>;

function categoryFailure(
  scope: string,
  error: Parameters<typeof classifyDatabaseError>[1],
  status: number,
): FailureState<CategoryField> {
  const reason = classifyDatabaseError(scope, error, status);
  if (reason === "duplicate-slug") {
    return violatedConstraint(error) === "institution_categories_name_key"
      ? fail(reason, CATEGORY, {
          message: "Já existe uma categoria com este nome.",
          fieldErrors: { name: "Já existe uma categoria com este nome." },
        })
      : fail(reason, CATEGORY, {
          fieldErrors: { slug: "Este slug já está em uso por outra categoria. Escolha outro." },
        });
  }
  return fail(reason, CATEGORY);
}

/** Categorias não têm rascunho: as alterações valem no site imediatamente. */
export async function saveCategory(_state: CategorySaveState, formData: FormData): Promise<CategorySaveState> {
  try {
    const denied = accessFailure(
      await getAdminAccess(),
      ADMIN_ROLES,
      CATEGORY,
      "Somente administradores podem criar ou editar categorias.",
    );
    if (denied) return denied;

    const rawId = formText(formData, "id");
    const isNew = rawId === "";
    if (!isNew && !isUuid(rawId)) return fail("not-found", CATEGORY);

    const { data, errors } = parseCategoryValues(readCategoryForm(formData));
    if (Object.keys(errors).length > 0) return fail("validation", CATEGORY, { fieldErrors: errors });

    const supabase = await createClient();

    if (isNew) {
      const created = await supabase.from("institution_categories").insert(data).select("id").single();
      if (created.error) return categoryFailure("inclusão em institution_categories", created.error, created.status);
      refresh();
      return { status: "created", id: created.data.id, message: `Categoria “${data.name}” criada.` };
    }

    const expected = formText(formData, "updated_at");
    const saved = await supabase
      .from("institution_categories")
      .update(data)
      .eq("id", rawId)
      .eq("updated_at", expected)
      .select(categoryEditColumns)
      .maybeSingle();
    if (saved.error) return categoryFailure("gravação de institution_categories", saved.error, saved.status);

    if (!saved.data) {
      const after = await supabase.from("institution_categories").select("updated_at").eq("id", rawId).maybeSingle();
      if (!after.error && !after.data) return fail("not-found", CATEGORY);
      if (after.data && after.data.updated_at !== expected) return fail("conflict", CATEGORY);
      return fail("forbidden", CATEGORY);
    }

    const row = saved.data;
    const confirmed =
      row.name === data.name &&
      row.slug === data.slug &&
      row.description === data.description &&
      row.sort_order === data.sort_order;
    if (!confirmed) return fail("unexpected", CATEGORY);

    refresh();
    return {
      status: "success",
      message: "Categoria salva. A página /instituicoes já usa o novo nome e a nova ordem.",
      values: toCategoryFormValues(row),
      updatedAt: row.updated_at,
    };
  } catch (error) {
    logActionError("salvar categoria", error);
    return fail("connection", CATEGORY);
  }
}

/** Exclusão de categoria vazia (a FK com RESTRICT recusa as demais). */
export async function deleteCategory(_state: RecordActionState, formData: FormData): Promise<RecordActionState> {
  try {
    const denied = accessFailure(
      await getAdminAccess(),
      ADMIN_ROLES,
      CATEGORY,
      "Somente administradores podem excluir categorias.",
    );
    if (denied) return denied;

    const id = formText(formData, "id");
    if (!isUuid(id)) return fail("not-found", CATEGORY);

    const supabase = await createClient();
    const read = await supabase
      .from("institution_categories")
      .select("id, name, institutions (count)")
      .eq("id", id)
      .maybeSingle();
    if (read.error) return fail(classifyDatabaseError("leitura de institution_categories", read.error, read.status), CATEGORY);
    if (!read.data) return fail("not-found", CATEGORY);

    const count = read.data.institutions[0]?.count ?? 0;
    const name = read.data.name;
    const blocked = (total?: number) =>
      fail("has-dependencies", CATEGORY, {
        message: `Não é possível excluir “${name}”: a categoria tem ${total ? plural(total, "instituição", "instituições") : "instituições vinculadas"}. Mova-as para outra categoria ou exclua-as antes.`,
      });
    if (count > 0) return blocked(count);

    const removed = await supabase.from("institution_categories").delete().eq("id", id).select("id");
    if (removed.error) {
      const reason = classifyDatabaseError("exclusão de institution_categories", removed.error, removed.status);
      return reason === "has-dependencies" ? blocked() : fail(reason, CATEGORY);
    }
    if (removed.data.length === 0) return fail("forbidden", CATEGORY);

    refresh();
    return { status: "success", message: `A categoria “${read.data.name}” foi excluída permanentemente.` };
  } catch (error) {
    logActionError("excluir categoria", error);
    return fail("connection", CATEGORY);
  }
}
