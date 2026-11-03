import { cacheLife, cacheTag } from "next/cache";

import { fallbackSiteSettings } from "@/data/site";
import { createPublicClient } from "@/lib/supabase/public";
import type { SiteSettings, SocialLink } from "@/types/content";

import { contentTags, logQueryError } from "./shared";

async function fetchSiteSettings() {
  "use cache";
  cacheLife("content");
  cacheTag(contentTags.siteSettings);

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

/** Configurações institucionais; usa o fallback se o registro não puder ser lido. */
export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    return (await fetchSiteSettings()) ?? fallbackSiteSettings;
  } catch (error) {
    logQueryError("site_settings", error);
    return fallbackSiteSettings;
  }
}

async function fetchActiveSocialLinks() {
  "use cache";
  cacheLife("content");
  cacheTag(contentTags.socialLinks);

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
