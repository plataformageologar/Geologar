import { ProjectCard } from "@/components/projects/project-card";
import { SectionFrame } from "@/components/site/section-frame";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { TextLink } from "@/components/ui/text-link";
import { resolveBackground, type Columns, type SectionSettings } from "@/lib/site/sections";
import { cn } from "@/lib/utils/cn";
import type { ProjectSummary } from "@/types/content";

const columnClasses: Record<Columns, string> = {
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-2 xl:grid-cols-4",
};

type FeaturedProjectsProps = {
  projects: ProjectSummary[];
  settings?: SectionSettings;
  /** Ao lado das publicações (sem fundo nem contêiner próprios). */
  paired?: boolean;
};

const pairedColumns: Record<number, string> = { 1: "sm:grid-cols-1", 2: "sm:grid-cols-2" };

export function FeaturedProjects({ projects, settings = {}, paired = false }: FeaturedProjectsProps) {
  const visible = projects.slice(0, settings.limit ?? 3);
  if (visible.length === 0) return null;
  const heading = (
    <SectionHeading
      id="projetos-title"
      eyebrow={settings.eyebrow}
      title={settings.title ?? "Pesquisa com resultados"}
      description={settings.description}
      action={settings.cta_label && settings.cta_href ? <TextLink href={settings.cta_href}>{settings.cta_label}</TextLink> : undefined}
    />
  );

  if (paired) {
    return (
      <section id="projetos" aria-labelledby="projetos-title" className="min-w-0">
        {heading}
        <ul className={cn("section-gap grid gap-5", pairedColumns[visible.length] ?? "sm:grid-cols-3")}>
          {visible.map((project) => (
            <li key={project.slug}>
              <ProjectCard project={project} href={`/projetos/${project.slug}`} variant="compact" />
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <SectionFrame id="projetos" labelledBy="projetos-title" background={resolveBackground("projects", settings)}>
      <Container>
        {heading}

        <ul className={cn("section-gap grid gap-6 sm:grid-cols-2", columnClasses[settings.columns ?? 3])}>
          {visible.map((project) => (
            <li key={project.slug}>
              <ProjectCard project={project} href={`/projetos/${project.slug}`} variant="compact" />
            </li>
          ))}
        </ul>
      </Container>
    </SectionFrame>
  );
}
