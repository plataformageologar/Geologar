import Link from "next/link";
import { Lock } from "lucide-react";

import { Container } from "@/components/ui/container";
import type { SiteNavItem } from "@/lib/site/navigation";
import { cn } from "@/lib/utils/cn";

import { MobileMenu } from "./mobile-menu";
import { NavLink } from "./nav-link";
import { SiteLogo } from "./site-logo";

type HeaderProps = {
  navigation: SiteNavItem[];
  institutionalName: string | null;
  /** Logotipo configurado no CMS; `null` usa o arquivo oficial do código. */
  logoSrc: string | null;
  /** Variação escolhida em Configurações (fundo branco ou translúcido). */
  headerStyle?: string;
};

export function Header({ navigation, institutionalName, logoSrc, headerStyle = "solid" }: HeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-border",
        headerStyle === "translucent"
          ? "bg-surface/90 backdrop-blur-md supports-[backdrop-filter]:bg-surface/75"
          : "bg-surface",
      )}
    >
      <Container className="relative flex h-[var(--header-height)] items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <SiteLogo src={logoSrc} />
          {institutionalName && (
            <p className="hidden max-w-[15rem] border-l border-border pl-4 text-caption leading-snug text-muted-foreground xl:block">
              {institutionalName}
            </p>
          )}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
        <nav aria-label="Principal">
          <ul className="flex items-center gap-1">
            {navigation.map((item) => (
              <li key={`${item.href}-${item.label}`}>
                <NavLink
                  href={item.href}
                  newTab={item.openInNewTab}
                  className="inline-flex min-h-11 items-center rounded-full px-4 text-label text-foreground transition-colors hover:bg-surface-muted hover:text-primary"
                  activeClassName="bg-primary-soft text-primary hover:bg-primary-soft"
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
          {/* Acesso secundário à área restrita: só o ícone até `xl`. */}
          <Link
            href="/admin/login"
            className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border border-border px-3 text-label text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary xl:px-4"
          >
            <Lock aria-hidden="true" className="size-4" />
            <span className="sr-only xl:not-sr-only">Área restrita</span>
          </Link>
        </div>

        <MobileMenu navigation={navigation} />
      </Container>
    </header>
  );
}
