import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

/** Mensagem discreta para seções ainda sem conteúdo publicado. */
export function EmptyState({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "rounded-2xl border border-dashed border-border px-6 py-10 text-center text-body-sm text-muted-foreground",
        className,
      )}
    >
      {children}
    </p>
  );
}
