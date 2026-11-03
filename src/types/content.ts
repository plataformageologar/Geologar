/**
 * Formatos de conteúdo usados pela interface, derivados do schema do banco
 * (database.types.ts) para que a troca dos dados locais por consultas ao
 * Supabase não exija mudar os componentes.
 */
import type { Tables } from "./database.types";

export type SiteSettings = Pick<
  Tables<"site_settings">,
  | "site_name"
  | "institutional_name"
  | "short_description"
  | "contact_email"
  | "contact_phone"
  | "address"
  | "city"
  | "state"
  | "country"
>;

export type HomepageContent = Omit<
  Tables<"homepage_content">,
  "id" | "created_at" | "updated_at"
>;

export type ResearchLineSummary = Pick<
  Tables<"research_lines">,
  "slug" | "title" | "short_description" | "image_path" | "image_alt"
>;

export type ResearchLineLink = Pick<Tables<"research_lines">, "slug" | "title">;

/** Página /pesquisa/[slug]: a linha e o conteúdo publicado relacionado a ela. */
export type ResearchLineDetail = ResearchLineSummary &
  Pick<Tables<"research_lines">, "description"> & {
    projects: ProjectSummary[];
    publications: PublicationListItem[];
  };

export type ProjectStatus = "ongoing" | "completed";

export type ProjectLink = Pick<Tables<"projects">, "slug" | "title">;

export type ProjectSummary = Pick<
  Tables<"projects">,
  | "slug"
  | "title"
  | "short_description"
  | "image_path"
  | "image_alt"
  | "project_status"
  | "result_or_contribution"
>;

export type PublicationSummary = Pick<
  Tables<"publications">,
  | "slug"
  | "title"
  | "authors"
  | "publication_venue"
  | "publication_year"
  | "doi"
  | "external_url"
>;

/** Publicação nas listagens internas, com os projetos publicados associados. */
export type PublicationListItem = PublicationSummary & { projects: ProjectLink[] };

/** Página /projetos/[slug]. */
export type ProjectDetail = ProjectSummary &
  Pick<
    Tables<"projects">,
    "description" | "start_date" | "end_date" | "coordination" | "funding" | "external_url"
  > & {
    researchLines: ResearchLineLink[];
    publications: PublicationListItem[];
    /** Outros projetos publicados que compartilham ao menos uma linha de pesquisa. */
    relatedProjects: ProjectSummary[];
  };

export type InstitutionSummary = Pick<
  Tables<"institutions">,
  "id" | "name" | "acronym" | "description" | "logo_path" | "logo_alt" | "website_url"
>;

export type InstitutionGroup = {
  category: Pick<Tables<"institution_categories">, "slug" | "name">;
  institutions: InstitutionSummary[];
};

export type SocialLink = Pick<
  Tables<"social_links">,
  "id" | "platform" | "label" | "url"
>;

export type NavItem = {
  label: string;
  href: string;
};
