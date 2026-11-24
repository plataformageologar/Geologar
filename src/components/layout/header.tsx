import Link from "next/link";
import { Lock } from "lucide-react";

import { Container } from "@/components/ui/container";
import type { SiteNavItem } from "@/lib/site/navigation";
import { cn } from "@/lib/utils/cn";

import { HeaderSearch } from "./header-search";
import { MobileMenu } from "./mobile-menu";
import { NavLink } from "./nav-link";
import { SiteBrand } from "./site-logo";

type HeaderProps = {
  navigation: SiteNavItem[];
  /** Nome do site (Configurações), exibido ao lado do símbolo oficial. */
  siteName?: string | null;
  institutionalName: string | null;
  /** Logotipo configurado no CMS; `null` usa o símbolo oficial do código. */
  logoSrc: string | null;
  /** Variação escolhida em Configurações (fundo branco ou translúcido). */
  headerStyle?: string;
};

/**
 * Cabeçalho em dois níveis (Etapa 10.7). Em telas largas: marca, busca e
 * acesso à área restrita em cima; a barra de navigação (menu do CMS) embaixo
 * permanece fixa ao rolar — o cabeçalho inteiro é `sticky` com deslocamento
 * negativo igual à altura do nível de cima. No celular, uma barra só com a
 * marca e o botão Menu (busca e área restrita ficam dentro do menu).
 */
export function Header({ navigation, siteName, institutionalName, logoSrc, headerStyle = "solid" }: HeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-border lg:top-[calc(var(--header-top-height)*-1)]",
        headerStyle === "translucent"
          ? "bg-surface/90 backdrop-blur-md supports-[backdrop-filter]:bg-surface/75"
          : "bg-surface",
      )}
    >
      <Container className="relative flex h-[var(--header-height)] items-center justify-between gap-6 lg:h-[var(--header-top-height)]">
        <SiteBrand src={logoSrc} siteName={siteName} tagline={institutionalName} />

        <div className="hidden items-center gap-3 lg:flex">
          <HeaderSearch id="busca-cabecalho" />
          <Link
            href="/admin/login"
            className="inline-flex min-h-11 items-center gap-2 rounded-[var(--button-radius)] bg-secondary px-4 text-label whitespace-nowrap uppercase tracking-[0.04em] text-secondary-foreground transition-colors hover:bg-secondary-hover"
          >
            <Lock aria-hidden="true" className="size-4" />
            <span>
              Login <span aria-hidden="true">/</span>
              <span className="sr-only">e</span> Área restrita
            </span>
          </Link>
        </div>

        <MobileMenu navigation={navigation} />
      </Container>

      <div className="hidden border-t border-border bg-surface-muted lg:block">
        <Container>
          <nav aria-label="Principal">
            <ul className="flex h-[var(--header-height)] items-stretch gap-1 overflow-x-auto">
              {navigation.map((item) => (
                <li key={`${item.href}-${item.label}`} className="flex">
                  <NavLink
                    href={item.href}
                    newTab={item.openInNewTab}
                    className={cn(
                      "relative inline-flex items-center px-4 text-label uppercase tracking-[0.05em] whitespace-nowrap text-foreground transition-colors hover:text-primary",
                      "after:absolute after:inset-x-4 after:bottom-0 after:h-[3px] after:rounded-t-sm after:bg-transparent after:transition-colors after:content-['']",
                      "hover:after:bg-primary/30",
                    )}
                    activeClassName="text-primary after:bg-primary hover:after:bg-primary"
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </Container>
      </div>
    </header>
  );
}
