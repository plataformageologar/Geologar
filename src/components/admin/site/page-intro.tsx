import Link from "next/link";
import { MousePointerClick } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

import { FormMessage } from "../form-controls";

/** Cabeçalho das telas de configuração do site, com atalho para o editor visual. */
export function SitePageIntro({
  title,
  description,
  visualHref,
  children,
}: {
  title: string;
  description: ReactNode;
  visualHref?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex max-w-3xl flex-col gap-2">
          <h1 className="text-h1">{title}</h1>
          <p className="text-body text-muted-foreground">{description}</p>
        </div>
        {visualHref && <VisualEditLink href={visualHref} />}
      </div>
      {children}
    </div>
  );
}

export function VisualEditLink({ href, className }: { href: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-11 shrink-0 items-center gap-2 self-start rounded-full border border-primary px-5 text-label text-primary transition-colors hover:bg-primary-soft",
        className,
      )}
    >
      <MousePointerClick aria-hidden="true" className="size-4" />
      Editar visualmente
    </Link>
  );
}

/** Abas por página (links simples com aria-current). */
export function PageTabs({
  label,
  tabs,
  current,
}: {
  label: string;
  tabs: { key: string; label: string; href: string }[];
  current: string;
}) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-2 border-b border-border pb-3">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={tab.key === current ? "page" : undefined}
          className={cn(
            "inline-flex min-h-11 items-center rounded-full px-4 text-label transition-colors",
            tab.key === current
              ? "bg-primary text-primary-foreground"
              : "border border-border text-foreground hover:border-primary/40",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

export function LoadError({ subject }: { subject: string }) {
  return (
    <FormMessage tone="error">
      Não foi possível carregar {subject}. Nada foi alterado. Recarregue a página em instantes; se o problema
      continuar, contate a equipe técnica.
    </FormMessage>
  );
}
