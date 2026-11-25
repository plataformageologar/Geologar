import type { Metadata } from "next";

import { FormMessage } from "@/components/admin/form-controls";
import { CustomPagesHelp } from "@/components/admin/editorial/custom-pages-help";
import { EditorialScope } from "@/components/admin/editorial/editorial-scope";
import { NavigationEditor } from "@/components/admin/site/cms-editors";
import { HiddenBadge } from "@/components/admin/site/list-controls";
import { LoadError, PageTabs, SitePageIntro } from "@/components/admin/site/page-intro";
import { requireAdminAccess } from "@/lib/auth/access";
import { toNavDrafts } from "@/lib/editorial/content";
import { docInfo, getCustomPagesForAdmin, getEditorialDocument } from "@/lib/queries/editorial";
import { getNavigationForEdit } from "@/lib/queries/site-config";
import {
  NAV_LOCATION_LABELS,
  NAV_LOCATIONS,
  unavailableCustomPageLinks,
  type NavLocation,
} from "@/lib/site/navigation";
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

  // Administradores editam o rascunho; editores só consultam a versão publicada.
  const [doc, navigation, customPages] = await Promise.all([
    isAdmin ? getEditorialDocument("navigation", "navigation") : null,
    isAdmin ? null : getNavigationForEdit(),
    getCustomPagesForAdmin(),
  ]);

  // Aviso (sem remover nada): links do menu para páginas que não estão no ar.
  const menus = isAdmin
    ? doc?.status === "ready" && doc.data
      ? {
          header: doc.data.current.header ?? [],
          footer: doc.data.current.footer ?? [],
          useful: doc.data.current.useful ?? [],
        }
      : null
    : navigation?.status === "ready"
      ? {
          header: navigation.data.header.items,
          footer: navigation.data.footer.items,
          useful: navigation.data.useful.items,
        }
      : null;
  const brokenLinks =
    menus && customPages.status === "ready" ? unavailableCustomPageLinks(menus, customPages.data) : [];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <SitePageIntro
        title="Navegação"
        description="Links do menu principal e do rodapé. Use caminhos do portal (ex.: /pesquisa), /#contato para a coluna de contato do rodapé ou endereços completos começando com https://."
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

      {brokenLinks.length > 0 && (
        <FormMessage tone="warning">
          <span className="flex flex-col gap-1">
            <span>
              {brokenLinks.length === 1 ? "Um link do menu leva" : `${brokenLinks.length} links do menu levam`} a uma
              página personalizada que não está no ar — o visitante verá “página não encontrada”. Publique a página ou
              remova o link{isAdmin ? "" : " (peça a um administrador)"}.
            </span>
            <span className="flex flex-col">
              {brokenLinks.map((link, index) => (
                <span key={`${link.location}-${index}`} className="break-all">
                  {NAV_LOCATION_LABELS[link.location]}: “{link.label}” → {link.href} ({link.reason})
                </span>
              ))}
            </span>
          </span>
        </FormMessage>
      )}

      {!isAdmin && (
        <FormMessage tone="warning">
          Você pode consultar os menus. Alterar a navegação do site é restrito a administradores.
        </FormMessage>
      )}

      {isAdmin ? (
        doc?.status === "ready" && doc.data ? (
          <EditorialScope
            key={location}
            doc={docInfo(doc.data)}
            canPublish
            previewHref="/admin/editor?pagina=%2F"
            loginNext={`/admin/navegacao?menu=${location}`}
          >
            <NavigationEditor location={location} initial={toNavDrafts(doc.data.current[location] ?? [])} />
          </EditorialScope>
        ) : (
          <LoadError subject="os menus" />
        )
      ) : navigation?.status !== "ready" ? (
        <LoadError subject="os menus" />
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

      <CustomPagesHelp pages={customPages.status === "ready" ? customPages.data : null} />
    </div>
  );
}
