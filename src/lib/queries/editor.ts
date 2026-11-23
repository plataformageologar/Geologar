import { toSiteSettingsFormValues } from "@/lib/admin/site-settings";
import type { AdminRole } from "@/lib/auth/access";
import { ADMIN_DOC_TYPES, documentLabel, GLOBAL_SCOPE, pageContentDocument, type DocType } from "@/lib/editorial/content";
import { slicesFromContent } from "@/lib/editorial/editor-slices";
import { DEFAULT_APPEARANCE } from "@/lib/site/appearance";
import type { DraftSlice, EditorDocument, EditorDraft, EditorUnit } from "@/lib/site/editor-document";
import type { EditorPage } from "@/lib/site/editor-pages";
import type { PageContentKey } from "@/lib/site/page-content";
import type { SectionScope } from "@/lib/site/sections";
import { createClient } from "@/lib/supabase/server";

import { getSiteSettingsForEdit } from "./admin-institutional";
import { getEditorialDocuments } from "./editorial";
import { getSectionsData } from "./homepage";
import { getPublishedProjects } from "./projects";
import { getActiveSocialLinks } from "./settings";
import { logQueryError } from "./shared";
import { getAppearanceForEdit, getInstitutionOptionsForSections, getNavigationForEdit } from "./site-config";

/**
 * Carrega o documento do editor visual para uma página permitida. Os dados
 * editáveis são as unidades editoriais (rascunho ou versão publicada), lidas
 * com a sessão do usuário (RLS); os de pré-visualização vêm das consultas
 * públicas (somente registros publicados).
 */

async function getRecordIds() {
  const supabase = await createClient();
  const [projects, lines] = await Promise.all([
    supabase.from("projects").select("id, slug").limit(500),
    supabase.from("research_lines").select("id, slug").limit(500),
  ]);
  if (projects.error) logQueryError("projects (editor)", projects.error);
  if (lines.error) logQueryError("research_lines (editor)", lines.error);
  return {
    projects: Object.fromEntries((projects.data ?? []).map((row) => [row.slug, row.id])),
    researchLines: Object.fromEntries((lines.data ?? []).map((row) => [row.slug, row.id])),
  };
}

async function getDetail(page: EditorPage): Promise<EditorDocument["detail"]> {
  if (page.kind !== "project" && page.kind !== "research-line") return null;
  const supabase = await createClient();
  const table = page.kind === "project" ? "projects" : "research_lines";
  const { data, error } = await supabase
    .from(table)
    .select("id, title, is_published")
    .eq("slug", page.slug)
    .maybeSingle();
  if (error) {
    logQueryError(`${table} (editor)`, error);
    return null;
  }
  if (!data) return null;
  const base = page.kind === "project" ? "/admin/projetos" : "/admin/linhas-de-pesquisa";
  return { title: data.title, editHref: `${base}/${data.id}/editar`, published: data.is_published };
}

type DocRef = { type: DocType; key: string };

/** Fatias que cada unidade cobre nesta página. */
function unitSlices(type: DocType, page: EditorPage): DraftSlice[] {
  switch (type) {
    case "home":
      return page.kind === "home" ? ["homepage", "sections"] : ["homepage"];
    case "rede":
    case "custom":
      return ["pageContent", "sections"];
    case "page":
      return ["pageContent"];
    case "pillars":
      return ["pillars"];
    case "navigation":
      return ["navHeader", "navFooter"];
    case "appearance":
      return ["appearance"];
    case "settings":
      return ["settings"];
  }
}

export async function getEditorDocument(
  page: EditorPage,
  role: AdminRole,
  customPage: { id: string; status: "draft" | "published" | "archived" } | null = null,
): Promise<EditorDocument> {
  const isAdmin = role === "admin";
  const sectionPage: SectionScope | null =
    page.kind === "home" ? "home" : page.kind === "rede" ? "rede" : page.kind === "custom" ? "custom" : null;
  const pageContentKey: PageContentKey | "custom" | null =
    page.kind === "rede" ? "rede" : page.kind === "list" ? page.key : page.kind === "custom" ? "custom" : null;

  // Unidades editoriais desta página. Menus, aparência e informações
  // institucionais são só de administradores (o RLS também não as entrega a
  // editores, que veem a versão publicada, somente leitura).
  // A unidade da própria página vem primeiro (histórico e publicação abrem nela).
  const refs: DocRef[] = [];
  if (page.kind === "rede") refs.push({ type: "rede", key: "rede" });
  if (page.kind === "list") refs.push(pageContentDocument(page.key));
  if (page.kind === "custom" && customPage) refs.push({ type: "custom", key: customPage.id });
  refs.push({ type: "home", key: "home" }, { type: "pillars", key: "pillars" });
  if (isAdmin) refs.push({ type: "settings", key: "settings" }, { type: "navigation", key: "navigation" }, { type: "appearance", key: "appearance" });

  const [documents, settings, navigation, appearance, sectionsData, socialLinks, records, institutionOptions, detail, projectList] =
    await Promise.all([
      getEditorialDocuments(refs),
      isAdmin ? null : getSiteSettingsForEdit(),
      isAdmin ? null : getNavigationForEdit(),
      isAdmin ? null : getAppearanceForEdit(),
      getSectionsData({ researchLineLimit: 50 }),
      getActiveSocialLinks(),
      getRecordIds(),
      sectionPage ? getInstitutionOptionsForSections() : null,
      getDetail(page),
      page.kind === "list" && page.key === "projetos" ? getPublishedProjects({ page: 1 }) : null,
    ]);

  const draft: EditorDraft = {
    homepage: null,
    settings: null,
    pillars: null,
    sections: null,
    pageContent: null,
    navHeader: null,
    navFooter: null,
    appearance: null,
  };
  const published: EditorDraft = { ...draft };
  const units: EditorUnit[] = [];
  const loadErrors: DraftSlice[] = [];

  const views = documents.status === "ready" ? documents.data : {};
  for (const ref of refs) {
    const view = views[`${ref.type}:${ref.key}`];
    const slices = unitSlices(ref.type, page);
    if (!view) {
      loadErrors.push(...slices);
      continue;
    }
    Object.assign(draft, slicesFromContent(slices, view.current));
    Object.assign(published, slicesFromContent(slices, view.published ?? view.current));
    units.push({
      id: view.id,
      type: view.type,
      label: view.type === "custom" && page.kind === "custom" ? documentLabel("custom", view.key, page.label) : view.label,
      version: view.version,
      hasDraft: view.hasDraft,
      differs: view.differs,
      hasPublished: view.published !== null,
      publishedRevision: view.publishedRevision,
      draftUpdatedAt: view.draftUpdatedAt,
      scope: GLOBAL_SCOPE[view.type] ?? null,
      canPublish: !ADMIN_DOC_TYPES.includes(view.type) || isAdmin,
      slices,
    });
    for (const slice of slices) if (draft[slice] === null) loadErrors.push(slice);
  }

  // Editores: versão publicada, somente leitura.
  if (settings) {
    if (settings.status === "ready" && settings.data) {
      draft.settings = published.settings = toSiteSettingsFormValues(settings.data.record);
    } else loadErrors.push("settings");
  }
  if (navigation) {
    if (navigation.status === "ready") {
      draft.navHeader = published.navHeader = navigation.data.header.items;
      draft.navFooter = published.navFooter = navigation.data.footer.items;
    } else loadErrors.push("navHeader", "navFooter");
  }
  if (appearance) {
    if (appearance.status === "ready" && appearance.data) draft.appearance = published.appearance = appearance.data.values;
    else loadErrors.push("appearance");
  }
  if (!draft.appearance) draft.appearance = published.appearance = DEFAULT_APPEARANCE;

  const editableFor = (slice: DraftSlice, allowed: boolean) =>
    allowed && !loadErrors.includes(slice) && units.some((unit) => unit.slices.includes(slice));

  return {
    page,
    role,
    sectionPage,
    pageContentKey,
    draft,
    published,
    units,
    customPage,
    editable: {
      homepage: editableFor("homepage", true),
      pillars: editableFor("pillars", true),
      sections: editableFor("sections", sectionPage !== null),
      pageContent: editableFor("pageContent", pageContentKey !== null),
      settings: editableFor("settings", isAdmin),
      navHeader: editableFor("navHeader", isAdmin),
      navFooter: editableFor("navFooter", isAdmin),
      appearance: editableFor("appearance", isAdmin),
    },
    render: {
      researchLines: sectionsData.researchLines,
      projects: projectList ? projectList.items : sectionsData.projects,
      publications: sectionsData.publications,
      institutionGroups: sectionsData.institutionGroups,
      institutions: sectionsData.institutions,
      socialLinks,
    },
    records,
    institutionOptions: institutionOptions?.status === "ready" ? institutionOptions.data : [],
    detail,
    loadErrors: [...new Set(loadErrors)],
  };
}
