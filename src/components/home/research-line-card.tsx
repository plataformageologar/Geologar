import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { CardMedia } from "@/components/ui/card-media";
import { cn } from "@/lib/utils/cn";
import type { ResearchLineSummary } from "@/types/content";

type ResearchLineCardProps = {
  researchLine: ResearchLineSummary;
  icon: LucideIcon;
  tint: "green" | "earth" | "blue";
  /** Destino da página da linha. Sem ele, o card não é navegável. */
  href?: string;
};

export function ResearchLineCard({
  researchLine,
  icon,
  tint,
  href,
}: ResearchLineCardProps) {
  return (
    <article
      className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface",
        href &&
          "transition-[border-color,box-shadow] duration-200 hover:border-primary/40 hover:shadow-[0_12px_32px_-20px_rgb(15_37_55/0.45)] focus-within:border-primary/40",
      )}
    >
      <CardMedia
        imagePath={researchLine.image_path}
        imageAlt={researchLine.image_alt}
        fallbackIcon={icon}
        tint={tint}
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        className="aspect-[2/1]"
      />
      <div className="flex flex-1 flex-col gap-3 p-6">
        <h3 className="text-h3">
          {href ? (
            // Link estendido: o card inteiro é clicável, com um único item de foco.
            <Link
              href={href}
              className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-2xl focus-visible:after:outline-3 focus-visible:after:outline-offset-2 focus-visible:after:outline-ring"
            >
              {researchLine.title}
            </Link>
          ) : (
            researchLine.title
          )}
        </h3>
        {researchLine.short_description && (
          <p className="text-body-sm text-muted-foreground">
            {researchLine.short_description}
          </p>
        )}
      </div>
    </article>
  );
}
