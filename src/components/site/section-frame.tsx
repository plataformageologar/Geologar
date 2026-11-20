import type { ReactNode } from "react";

import type { Background } from "@/lib/site/sections";
import { cn } from "@/lib/utils/cn";

export const backgroundClasses: Record<Background, string> = {
  default: "",
  surface: "bg-surface",
  muted: "bg-surface-muted",
  deep: "on-dark bg-deep text-deep-foreground",
  primary: "on-dark bg-primary text-primary-foreground",
};

/** `<section>` com o fundo escolhido e o espaçamento vertical padrão. */
export function SectionFrame({
  id,
  labelledBy,
  background,
  className,
  children,
}: {
  id?: string;
  labelledBy: string;
  background: Background;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={cn("section-y", backgroundClasses[background], className)}>
      {children}
    </section>
  );
}
