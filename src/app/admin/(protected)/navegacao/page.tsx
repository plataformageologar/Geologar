import type { Metadata } from "next";

import { FormMessage } from "@/components/admin/form-controls";
import { NavigationEditor } from "@/components/admin/site/cms-editors";
import { HiddenBadge } from "@/components/admin/site/list-controls";
import { LoadError, PageTabs, SitePageIntro } from "@/components/admin/site/page-intro";
import { requireAdminAccess } from "@/lib/auth/access";
import { getNavigationForEdit } from "@/lib/queries/site-config";
import { NAV_LOCATION_LABELS, NAV_LOCATIONS, type NavLocation } from "@/lib/site/navigation";
import { firstParam } from "@/lib/utils/search-params";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Navegação",
};

export default async function NavigationPage({ searchParams }: PageProps<"/admin/navegacao">) {
  const access = await requireAdminAccess();
  const isAdmin = access.role === "admin";
  const query = await searchParams;
  const param = firstParam(query.menu);
  const location: NavLocation = (NAV_LOCATIONS as readonly string[]).includes(param ?? "")
    ? (param as NavLocation)
    : "header";

  const navigation = await getNavigationForEdit();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <SitePageIntro
        title="Navegação"
        description="Links do menu principal e do rodapé. Use caminhos do portal (ex.: /contato) ou endereços completos começando com https://."
        visualHref={isAdmin ? "/admin/editor?pagina=%2F" : undefined}
      >
        <PageTabs
          label="Menu"
          current={location}
          tabs={NAV_LOCATIONS.map((key) => ({
            key,
            label: NAV_LOCATION_LABELS[key],
            href: `/admin/navegacao?menu=${key}`,
          }))}
        />
      </SitePageIntro>

      {!isAdmin && (
        <FormMessage tone="warning">
          Você pode consultar os menus. Alterar a navegação do site é restrito a administradores.
        </FormMessage>
      )}

      {navigation.status === "error" ? (
        <LoadError subject="os menus" />
      ) : isAdmin ? (
        <NavigationEditor key={location} location={location} initial={navigation.data[location]} />
      ) : (
        <ol className="flex flex-col gap-3">
          {navigation.data[location].items.map((item, index) => (
            <li
              key={item.key}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface p-4"
            >
              <span className="text-label">
                {index + 1}. {item.label}
              </span>
              <span className="break-all text-body-sm text-muted-foreground">{item.href}</span>
              {!item.is_visible && <HiddenBadge />}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
