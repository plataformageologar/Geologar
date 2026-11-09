import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import type { ReactNode } from "react";

type AdminPageHeadingProps = {
  back: { href: string; label: string };
  title: string;
  description?: ReactNode;
  /** Página pública do registro (somente quando publicado). */
  publicHref?: string | null;
  /** Indicadores ao lado do título (ex.: situação editorial). */
  badges?: ReactNode;
};

/** Cabeçalho das páginas de cadastro e edição do CMS. */
export function AdminPageHeading({ back, title, description, publicHref, badges }: AdminPageHeadingProps) {
  return (
    <div className="flex flex-col gap-4">
      <Link
        href={back.href}
        className="inline-flex min-h-11 w-fit items-center gap-2 text-body-sm text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {back.label}
      </Link>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="text-h1 break-words">{title}</h1>
          {badges && <div className="flex flex-wrap gap-2">{badges}</div>}
          {description && <p className="text-body text-muted-foreground">{description}</p>}
        </div>
        {publicHref && (
          <a
            href={publicHref}
            target="_blank"
            rel="noopener"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 self-start rounded-full border border-primary px-5 text-label text-primary transition-colors hover:bg-primary-soft"
          >
            Ver no site
            <ExternalLink aria-hidden="true" className="size-4" />
            <span className="sr-only">(abre em nova aba)</span>
          </a>
        )}
      </div>
    </div>
  );
}
