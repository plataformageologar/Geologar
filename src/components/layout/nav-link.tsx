"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { isHashHref, resolveSiteHref } from "@/lib/site/contact";
import { cn } from "@/lib/utils/cn";

type NavLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  /** Classes adicionais quando o item corresponde à rota atual. */
  activeClassName?: string;
  onClick?: () => void;
  /** Abre em nova aba (somente links externos cadastrados no menu). */
  newTab?: boolean;
};

/** Item ativo na própria rota e nas páginas internas dela (ex.: /projetos/x). */
export function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Link de navegação que indica a seção atual: `aria-current="page"` na
 * própria página e `"true"` nas páginas internas da seção.
 */
export function NavLink({ href: stored, children, className, activeClassName, onClick, newTab = false }: NavLinkProps) {
  const pathname = usePathname();
  const href = resolveSiteHref(stored);

  // Âncora na própria página (contato do rodapé): link simples, sem estado ativo.
  if (isHashHref(href)) {
    return (
      <a href={href} onClick={onClick} className={className}>
        {children}
      </a>
    );
  }

  const active = isActivePath(pathname, href);

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? (pathname === href ? "page" : "true") : undefined}
      className={cn(className, active && activeClassName)}
      {...(newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
      {newTab && <span className="sr-only"> (abre em nova aba)</span>}
    </Link>
  );
}
