import type { InstitutionRecord } from "@/lib/admin/institutions";
import type { SiteSettingsRecord } from "@/lib/admin/site-settings";
import { isUuid } from "@/lib/admin/validation";
import { createClient } from "@/lib/supabase/server";

import { ilikeAny, type AdminResult } from "./admin-content";
import { logQueryError, resolveImageSrc } from "./shared";

/**
 * Leituras do CMS de instituições, categorias, informações institucionais e
 * redes sociais, sempre com a sessão do usuário (RLS). Falhas aparecem como
 * `error`, nunca como lista vazia.
 */

// Instituições -------------------------------------------------------------------

export const ADMIN_INSTITUTIONS_PAGE_SIZE = 10;

export type InstitutionListFilters = {
  search?: string;
  published?: boolean;
  categoryId?: string;
  page: number;
};

export type InstitutionListItem = {
  id: string;
  name: string;
  acronym: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  website_url: string | null;
  is_published: boolean;
  is_featured: boolean;
  updated_at: string;
  category: { id: string; name: string } | null;
};


export async function getInstitutionsForAdmin(
  filters: InstitutionListFilters,
): Promise<AdminResult<{ items: InstitutionListItem[]; total: number; outOfRange: boolean }>> {
  const supabase = await createClient();
  const from = (filters.page - 1) * ADMIN_INSTITUTIONS_PAGE_SIZE;

  let query = supabase
    .from("institutions")
    .select(
      "id, name, acronym, city, state, country, website_url, is_published, is_featured, updated_at, category:institution_categories (id, name)",
      { count: "exact" },
    );
  if (filters.search) {
    query = query.or(ilikeAny(["name", "acronym"], filters.search));
  }
  if (filters.published !== undefined) query = query.eq("is_published", filters.published);
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);

  const { data, error, count } = await query
    .order("sort_order")
    .order("name")
    .range(from, from + ADMIN_INSTITUTIONS_PAGE_SIZE - 1);

  if (error?.code === "PGRST103") {
    return { status: "ready", data: { items: [], total: 0, outOfRange: true } };
  }
  if (error) {
    logQueryError("institutions (CMS)", error);
    return { status: "error" };
  }
  return {
    status: "ready",
    data: { items: data, total: count ?? data.length, outOfRange: data.length === 0 && filters.page > 1 },
  };
}

export const institutionEditColumns =
  "id, category_id, name, acronym, description, logo_path, logo_alt, website_url, city, state, country, sort_order, is_featured, is_published, published_at, updated_at";

export type InstitutionForEdit = {
  id: string;
  record: InstitutionRecord;
  updatedAt: string;
  publishedAt: string | null;
  hasLogo: boolean;
  logoSrc: string | null;
};

export async function getInstitutionForEdit(id: string): Promise<AdminResult<InstitutionForEdit | null>> {
  if (!isUuid(id)) return { status: "ready", data: null };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("institutions")
    .select(institutionEditColumns)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    logQueryError("institution (CMS)", error);
    return { status: "error" };
  }
  if (!data) return { status: "ready", data: null };

  const { id: institutionId, logo_path, updated_at, published_at, ...record } = data;
  return {
    status: "ready",
    data: {
      id: institutionId,
      record,
      updatedAt: updated_at,
      publishedAt: published_at,
      hasLogo: logo_path !== null,
      logoSrc: resolveImageSrc(logo_path),
    },
  };
}

// Categorias -----------------------------------------------------------------------

export type CategoryListItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  updated_at: string;
  institutionCount: number;
};

/**
 * Categorias com o total de instituições. Para editores, a contagem cobre só
 * o que a sessão enxerga; a exclusão (somente admin) vê tudo, e a FK com
 * RESTRICT recusa categorias com instituições de qualquer forma.
 */
export async function getCategoriesForAdmin(): Promise<AdminResult<CategoryListItem[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("institution_categories")
    .select("id, name, slug, description, sort_order, updated_at, institutions (count)")
    .order("sort_order")
    .order("name")
    .limit(500);

  if (error) {
    logQueryError("institution categories (CMS)", error);
    return { status: "error" };
  }
  return {
    status: "ready",
    data: data.map(({ institutions, ...category }) => ({
      ...category,
      institutionCount: institutions[0]?.count ?? 0,
    })),
  };
}

export const categoryEditColumns = "id, name, slug, description, sort_order, updated_at";

// Informações institucionais -------------------------------------------------------

export type SiteSettingsForEdit = {
  record: SiteSettingsRecord;
  updatedAt: string;
  logoSrc: string | null;
  faviconSrc: string | null;
  hasLogo: boolean;
  hasFavicon: boolean;
};

export const siteSettingsEditColumns =
  "id, site_name, institutional_name, tagline, short_description, contact_email, contact_phone, address, city, state, country, logo_path, favicon_path, updated_at";

/** `null`: o registro único não existe (configuração pendente). */
export async function getSiteSettingsForEdit(): Promise<AdminResult<SiteSettingsForEdit | null>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("site_settings").select(siteSettingsEditColumns).maybeSingle();

  if (error) {
    logQueryError("site_settings (CMS)", error);
    return { status: "error" };
  }
  if (!data) return { status: "ready", data: null };

  // O id não sai daqui: a gravação lê o registro único direto do banco.
  const { logo_path, favicon_path, updated_at, ...rest } = data;
  const record: SiteSettingsRecord = {
    site_name: rest.site_name,
    institutional_name: rest.institutional_name,
    tagline: rest.tagline,
    short_description: rest.short_description,
    contact_email: rest.contact_email,
    contact_phone: rest.contact_phone,
    address: rest.address,
    city: rest.city,
    state: rest.state,
    country: rest.country,
  };
  return {
    status: "ready",
    data: {
      record,
      updatedAt: updated_at,
      logoSrc: resolveImageSrc(logo_path),
      faviconSrc: resolveImageSrc(favicon_path),
      hasLogo: logo_path !== null,
      hasFavicon: favicon_path !== null,
    },
  };
}

// Redes sociais ----------------------------------------------------------------------

export type SocialLinkListItem = {
  id: string;
  platform: string;
  label: string | null;
  url: string;
  sort_order: number;
  is_active: boolean;
  updated_at: string;
};

export const socialLinkEditColumns = "id, platform, label, url, sort_order, is_active, updated_at";

/** Todas as redes, inclusive inativas (policy "CMS staff can read all social links"). */
export async function getSocialLinksForAdmin(): Promise<AdminResult<SocialLinkListItem[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("social_links")
    .select(socialLinkEditColumns)
    .order("sort_order")
    .order("platform")
    .limit(200);

  if (error) {
    logQueryError("social_links (CMS)", error);
    return { status: "error" };
  }
  return { status: "ready", data };
}
