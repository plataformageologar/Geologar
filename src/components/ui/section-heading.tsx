import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

type SectionHeadingProps = {
  /** id do `<h2>`, para `aria-labelledby` da seção. */
  id: string;
  eyebrow?: string;
  title: string;
  description?: string;
  /** Ação alinhada ao título em telas largas (ex.: "Ver todos"). */
  action?: ReactNode;
  /** Conteúdo auxiliar abaixo do título (ex.: aviso de conteúdo provisório). */
  children?: ReactNode;
  surface?: "light" | "dark";
  className?: string;
};

export function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  action,
  children,
  surface = "light",
  className,
}: SectionHeadingProps) {
  const onDark = surface === "dark";

  return (
    <div
      className={cn(
        "flex flex-col gap-6 md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className="flex max-w-3xl flex-col gap-3">
        {eyebrow && (
          <p
            className={cn(
              "flex items-center gap-3 text-label uppercase tracking-[0.12em]",
              onDark ? "text-deep-muted" : "text-earth",
            )}
          >
            <span aria-hidden="true" className="h-px w-8 bg-current" />
            {eyebrow}
          </p>
        )}
        <h2 id={id} className="text-h2">
          {title}
        </h2>
        {description && (
          <p
            className={cn(
              "text-body-lg",
              onDark ? "text-deep-muted" : "text-muted-foreground",
            )}
          >
            {description}
          </p>
        )}
        {children}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
