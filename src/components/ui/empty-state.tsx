import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

type EmptyStateProps = {
  title: string;
  description?: string;
  /** Links para continuar a navegação. */
  children?: ReactNode;
  className?: string;
};

/** Aviso discreto para listas ainda sem conteúdo publicado. */
export function EmptyState({ title, description, children, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-2xl border border-dashed border-border bg-surface px-6 py-8 md:px-8",
        className,
      )}
    >
      <p className="text-body font-semibold">{title}</p>
      {description && <p className="text-body-sm text-muted-foreground">{description}</p>}
      {children && <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">{children}</div>}
    </div>
  );
}
