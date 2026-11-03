import { cache } from "react";

import { fallbackSiteSettings } from "@/data/site";
import { createPublicClient } from "@/lib/supabase/public";
import type { SiteSettings, SocialLink } from "@/types/content";

import { logQueryError } from "./shared";

async function fetchSiteSettings() {
  // Registro único, garantido pelo índice site_settings_singleton.
  const { data, error } = await createPublicClient()
    .from("site_settings")
    .select(
      "site_name, institutional_name, short_description, contact_email, contact_phone, address, city, state, country",
    )
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Configurações institucionais; usa o fallback se o registro não puder ser lido.
 * `cache` evita consultas repetidas na mesma requisição (metadados + layout).
 */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  try {
    return (await fetchSiteSettings()) ?? fallbackSiteSettings;
  } catch (error) {
    logQueryError("site_settings", error);
    return fallbackSiteSettings;
  }
});

async function fetchActiveSocialLinks() {
  const { data, error } = await createPublicClient()
    .from("social_links")
    .select("id, platform, label, url")
    .eq("is_active", true)
    .order("sort_order")
    .order("platform");

  if (error) throw error;
  return data;
}

export async function getActiveSocialLinks(): Promise<SocialLink[]> {
  try {
    return await fetchActiveSocialLinks();
  } catch (error) {
    logQueryError("social_links", error);
    return [];
  }
}
