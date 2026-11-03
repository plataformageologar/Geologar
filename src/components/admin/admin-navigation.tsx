"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Building2,
  FlaskConical,
  Info,
  LayoutDashboard,
  Layers,
  LogOut,
  Menu,
  PanelsTopLeft,
  Share2,
  UserRound,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import logo from "@/assets/brand/geologar-logo-circle.png";
import type { AdminNavItem } from "@/data/admin-navigation";
import { adminNavigation } from "@/data/admin-navigation";
import { signOut } from "@/lib/auth/actions";
import { cn } from "@/lib/utils/cn";

const icons: Record<AdminNavItem["id"], LucideIcon> = {
  overview: LayoutDashboard,
  homepage: PanelsTopLeft,
  "research-lines": Layers,
  projects: FlaskConical,
  publications: BookOpen,
  institutions: Building2,
  "site-settings": Info,
  "social-links": Share2,
  profile: UserRound,
};

const itemClasses =
  "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-body-sm transition-colors";

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-6">
      {adminNavigation.map((section, index) => (
        <div key={section.title ?? index} className="flex flex-col gap-1">
          {section.title && (
            <p className="px-3 pb-1 text-caption font-semibold uppercase tracking-[0.12em] text-deep-muted">
              {section.title}
            </p>
          )}
          <ul className="flex flex-col gap-0.5">
            {section.items.map((item) => {
              const Icon = icons[item.id];
              if (!item.href) {
                // Módulo previsto, ainda sem página: não é um link.
                return (
                  <li key={item.id}>
                    <span className={cn(itemClasses, "text-deep-muted/80")}>
                      <Icon aria-hidden="true" className="size-4 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      <span className="rounded-full border border-white/20 px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.06em]">
                        Em breve
                      </span>
                    </span>
                  </li>
                );
              }
              const active = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      itemClasses,
                      active
                        ? "bg-white/12 font-semibold text-deep-foreground"
                        : "text-deep-foreground/90 hover:bg-white/8 hover:text-deep-foreground",
                    )}
                  >
                    <Icon aria-hidden="true" className="size-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
            {section.title === "Conta" && (
              <li>
                <form action={signOut}>
                  <button
                    type="submit"
                    className={cn(itemClasses, "text-deep-foreground/90 hover:bg-white/8 hover:text-deep-foreground")}
                  >
                    <LogOut aria-hidden="true" className="size-4 shrink-0" />
                    Sair
                  </button>
                </form>
              </li>
            )}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Brand() {
  return (
    <Link href="/admin" className="flex items-center gap-3 rounded-lg">
      <Image src={logo} alt="" sizes="40px" className="size-10" />
      <span className="flex flex-col leading-tight">
        <span className="font-display text-body font-semibold">GeoLogar</span>
        <span className="text-caption text-deep-muted">Administração</span>
      </span>
    </Link>
  );
}

/**
 * Navegação da área administrativa: barra lateral fixa a partir de `lg` e,
 * em telas menores, barra superior com menu recolhível (fecha com Esc,
 * devolvendo o foco ao botão, ou ao escolher um item).
 */
export function AdminNavigation() {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <aside className="on-dark hidden bg-deep text-deep-foreground lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-80 lg:shrink-0 lg:flex-col lg:gap-8 lg:overflow-y-auto lg:px-4 lg:py-6">
        <div className="px-2">
          <Brand />
        </div>
        <nav aria-label="Administração">
          <NavList />
        </nav>
      </aside>

      <div className="on-dark relative bg-deep text-deep-foreground lg:hidden">
        <div className="flex h-16 items-center justify-between gap-4 px-4">
          <Brand />
          <button
            ref={buttonRef}
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((value) => !value)}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/25 px-4 text-label hover:bg-white/10"
          >
            {open ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
            Menu
          </button>
        </div>
        <nav
          id={panelId}
          aria-label="Administração"
          hidden={!open}
          className="absolute inset-x-0 top-full z-40 max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-white/15 bg-deep px-4 pb-6 pt-4 shadow-[0_12px_24px_-16px_rgb(15_37_55/0.6)]"
        >
          <NavList onNavigate={() => setOpen(false)} />
        </nav>
      </div>
    </>
  );
}
