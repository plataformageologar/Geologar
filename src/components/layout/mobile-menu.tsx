"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import type { NavItem } from "@/types/content";

import { NavLink } from "./nav-link";

/**
 * Menu de navegação para telas menores que `lg` (padrão disclosure).
 * Fecha com Esc (devolvendo o foco ao botão) ou ao escolher um link.
 */
export function MobileMenu({ navigation }: { navigation: NavItem[] }) {
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
    <div className="lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-label text-foreground transition-colors hover:bg-surface-muted"
      >
        {open ? (
          <X aria-hidden="true" className="size-5" />
        ) : (
          <Menu aria-hidden="true" className="size-5" />
        )}
        Menu
      </button>

      <nav
        id={panelId}
        aria-label="Principal"
        hidden={!open}
        className="absolute inset-x-0 top-full max-h-[calc(100dvh-var(--header-height))] overflow-y-auto border-b border-border bg-surface shadow-[0_12px_24px_-16px_rgb(15_37_55/0.35)]"
      >
        <ul className="mx-auto flex max-w-[80rem] flex-col px-[clamp(1rem,4vw,2.5rem)] py-3">
          {navigation.map((item) => (
            <li key={item.href} className="border-b border-border last:border-b-0">
              <NavLink
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex min-h-13 items-center gap-3 text-body-lg font-semibold text-foreground hover:text-primary"
                activeClassName="text-primary before:h-6 before:w-1 before:rounded-full before:bg-primary before:content-['']"
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
