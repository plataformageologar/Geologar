import Link from "next/link";
import { ArrowRight, FlaskConical } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { CardMedia } from "@/components/ui/card-media";
import type { ProjectSummary } from "@/types/content";

export const projectStatusLabels: Record<string, { label: string; tone: "green" | "blue" }> = {
  ongoing: { label: "Em andamento", tone: "green" },
  completed: { label: "Concluído", tone: "blue" },
};

type ProjectCardProps = {
  project: ProjectSummary;
  /** Destino da página do projeto. Sem ele, o link "Ver projeto" não aparece. */
  href?: string;
  /** Nível do título conforme a hierarquia da página. */
  headingLevel?: "h2" | "h3";
  /**
   * "compact" (página inicial, Etapa 10.7): imagem, título, texto curto e
   * “Saiba mais”, sempre vertical.
   */
  variant?: "default" | "compact";
};

/**
 * Card de projeto. Em tablets fica horizontal; em telas largas, vertical.
 */
export function ProjectCard({ project, href, headingLevel: Heading = "h3", variant = "default" }: ProjectCardProps) {
  // Rascunhos podem não ter situação definida ("A confirmar"): sem selo.
  const status = project.project_status ? projectStatusLabels[project.project_status] : undefined;

  if (variant === "compact") {
    return (
      <article className="card-surface group flex h-full flex-col overflow-hidden rounded-2xl border bg-surface">
        <CardMedia
          imagePath={project.image_path}
          imageAlt={project.image_alt}
          fallbackIcon={FlaskConical}
          tint="blue"
          sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 100vw"
          className="aspect-[16/10]"
        />
        <div className="flex flex-1 flex-col gap-2 p-5">
          <Heading className="font-sans text-h4 font-bold break-words">{project.title}</Heading>
          {project.short_description && (
            <p className="line-clamp-4 text-body-sm text-muted-foreground">{project.short_description}</p>
          )}
          {href && (
            <Link
              href={href}
              className="mt-auto inline-flex min-h-11 w-fit items-center gap-1 pt-2 text-label text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
            >
              Saiba mais
              <span className="sr-only">: {project.title}</span>
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          )}
        </div>
      </article>
    );
  }

  return (
    <article className="card-surface flex h-full flex-col overflow-hidden rounded-2xl border bg-surface md:flex-row lg:flex-col">
      <CardMedia
        imagePath={project.image_path}
        imageAlt={project.image_alt}
        fallbackIcon={FlaskConical}
        tint="blue"
        sizes="(min-width: 1024px) 33vw, (min-width: 768px) 40vw, 100vw"
        className="aspect-[16/10] md:aspect-auto md:min-h-64 md:w-2/5 md:shrink-0 lg:aspect-[16/10] lg:min-h-0 lg:w-full"
      />

      <div className="flex flex-1 flex-col gap-4 p-6">
        {status && (
          <Badge tone={status.tone} withDot>
            {status.label}
          </Badge>
        )}
        <Heading className="text-h3 break-words">{project.title}</Heading>
        {project.short_description && (
          <p className="text-body-sm text-muted-foreground">
            {project.short_description}
          </p>
        )}
        {project.result_or_contribution && (
          <div className="border-l-2 border-earth/60 pl-4">
            <p className="text-caption font-semibold uppercase tracking-[0.08em] text-earth">
              Resultado
            </p>
            <p className="mt-1 text-body-sm">{project.result_or_contribution}</p>
          </div>
        )}
        {href && (
          <Link
            href={href}
            className="mt-auto inline-flex min-h-11 w-fit items-center gap-1 text-label text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
          >
            Ver projeto
            <span className="sr-only">: {project.title}</span>
          </Link>
        )}
      </div>
    </article>
  );
}
