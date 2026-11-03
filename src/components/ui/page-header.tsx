import type { ReactNode } from "react";

import { Breadcrumb, type BreadcrumbItem } from "./breadcrumb";
import { Container } from "./container";

type PageHeaderProps = {
  breadcrumb: BreadcrumbItem[];
  eyebrow?: string;
  title: string;
  description?: string | null;
  /** Conteúdo complementar abaixo da descrição (ex.: situação do projeto). */
  children?: ReactNode;
};

/** Cabeçalho das páginas internas: trilha, título (`h1`) e descrição. */
export function PageHeader({ breadcrumb, eyebrow, title, description, children }: PageHeaderProps) {
  return (
    <div className="relative isolate overflow-hidden border-b border-border bg-surface-muted">
      <div
        aria-hidden="true"
        className="topo-pattern absolute inset-0 -z-10 text-primary/[0.06]"
      />
      <Container className="flex flex-col gap-8 py-10 md:py-14">
        <Breadcrumb items={breadcrumb} />
        <div className="flex max-w-3xl flex-col gap-4">
          {eyebrow && (
            <p className="flex items-center gap-3 text-label uppercase tracking-[0.12em] text-earth">
              <span aria-hidden="true" className="h-px w-8 bg-current" />
              {eyebrow}
            </p>
          )}
          <h1 className="text-h1 text-balance break-words">{title}</h1>
          {description && <p className="text-body-lg text-muted-foreground">{description}</p>}
          {children}
        </div>
      </Container>
    </div>
  );
}
