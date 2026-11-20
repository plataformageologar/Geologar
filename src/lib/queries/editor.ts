import { toFormValues } from "@/lib/admin/homepage";
import { toSiteSettingsFormValues } from "@/lib/admin/site-settings";
import type { AdminRole } from "@/lib/auth/access";
import { DEFAULT_APPEARANCE } from "@/lib/site/appearance";
import type { EditorDocument, EditorDraft, EditorVersions, DraftSlice } from "@/lib/site/editor-document";
import type { EditorPage } from "@/lib/site/editor-pages";
import { toPageContentValues, type PageContentKey } from "@/lib/site/page-content";
import { createClient } from "@/lib/supabase/server";

import { getHomepageForEdit } from "./admin";
import { getSiteSettingsForEdit } from "./admin-institutional";
import { getSectionsData } from "./homepage";
import { getPublishedProjects } from "./projects";
import { getActiveSocialLinks } from "./settings";
import { logQueryError } from "./shared";
import {
  getAppearanceForEdit,
  getInstitutionOptionsForSections,
  getNavigationForEdit,
  getPageContentForEdit,
  getPillarsForEdit,
  getSectionsForEdit,
} from "./site-config";

/**
 * Carrega o documento do editor visual para uma página permitida. Os dados
 * editáveis vêm das mesmas consultas do CMS (sessão do usuário, RLS); os de
 * pré-visualização, das consultas públicas (somente registros publicados).
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

export async function getEditorDocument(page: EditorPage, role: AdminRole): Promise<EditorDocument> {
  const sectionPage = page.kind === "home" ? "home" : page.kind === "rede" ? "rede" : null;
  const pageContentKey: PageContentKey | null =
    page.kind === "rede" ? "rede" : page.kind === "list" ? page.key : null;

  const [
    homepage,
    settings,
    pillars,
    sections,
    pageContent,
    navigation,
    appearance,
    sectionsData,
    socialLinks,
    records,
    institutionOptions,
    detail,
    projectList,
  ] = await Promise.all([
    getHomepageForEdit(),
    getSiteSettingsForEdit(),
    getPillarsForEdit(),
    sectionPage ? getSectionsForEdit(sectionPage) : null,
    pageContentKey ? getPageContentForEdit() : null,
    getNavigationForEdit(),
    getAppearanceForEdit(),
    getSectionsData({ researchLineLimit: 50 }),
    getActiveSocialLinks(),
    getRecordIds(),
    sectionPage ? getInstitutionOptionsForSections() : null,
    getDetail(page),
    page.kind === "list" && page.key === "projetos" ? getPublishedProjects({ page: 1 }) : null,
  ]);

  const loadErrors: DraftSlice[] = [];
  const isAdmin = role === "admin";

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
  const versions: EditorVersions = {
    homepage: null,
    settings: null,
    pillars: [],
    sections: [],
    pageContent: null,
    navHeader: [],
    navFooter: [],
    appearance: null,
  };

  if (homepage.status === "ready") {
    draft.homepage = toFormValues(homepage.record);
    versions.homepage = homepage.updatedAt;
  } else loadErrors.push("homepage");

  if (settings.status === "ready" && settings.data) {
    draft.settings = toSiteSettingsFormValues(settings.data.record);
    versions.settings = settings.data.updatedAt;
  } else loadErrors.push("settings");

  if (pillars.status === "ready") {
    draft.pillars = pillars.data.items;
    versions.pillars = pillars.data.versions;
  } else loadErrors.push("pillars");

  if (sections) {
    if (sections.status === "ready") {
      draft.sections = sections.data.items;
      versions.sections = sections.data.versions;
    } else loadErrors.push("sections");
  }

  if (pageContent && pageContentKey) {
    const current = pageContent.status === "ready" ? pageContent.data[pageContentKey] : undefined;
    if (current) {
      draft.pageContent = toPageContentValues(current.record);
      versions.pageContent = current.updatedAt;
    } else loadErrors.push("pageContent");
  }

  if (navigation.status === "ready") {
    draft.navHeader = navigation.data.header.items;
    draft.navFooter = navigation.data.footer.items;
    versions.navHeader = navigation.data.header.versions;
    versions.navFooter = navigation.data.footer.versions;
  } else loadErrors.push("navHeader", "navFooter");

  if (appearance.status === "ready" && appearance.data) {
    draft.appearance = appearance.data.values;
    versions.appearance = appearance.data.updatedAt;
  } else {
    draft.appearance = DEFAULT_APPEARANCE;
    loadErrors.push("appearance");
  }

  const editableFor = (slice: DraftSlice, allowed: boolean) => allowed && !loadErrors.includes(slice);

  return {
    page,
    role,
    sectionPage,
    pageContentKey,
    draft,
    versions,
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
    loadErrors,
  };
}
