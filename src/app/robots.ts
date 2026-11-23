import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/site/url";

/**
 * Site público indexável (decisão da Etapa 10). Área administrativa, API e
 * rotas de autenticação ficam fora da indexação — o que não é proteção: o
 * acesso a elas continua exigindo login e papel no CMS.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/auth/"] },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
