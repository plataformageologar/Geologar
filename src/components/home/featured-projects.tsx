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
};

export function FeaturedProjects({ projects, settings = {} }: FeaturedProjectsProps) {
  const visible = projects.slice(0, settings.limit ?? 3);
  if (visible.length === 0) return null;

  return (
    <SectionFrame id="projetos" labelledBy="projetos-title" background={resolveBackground("projects", settings)}>
      <Container>
        <SectionHeading
          id="projetos-title"
          eyebrow={settings.eyebrow}
          title={settings.title ?? "Pesquisa com resultados"}
          description={settings.description}
          action={settings.cta_label && settings.cta_href ? <TextLink href={settings.cta_href}>{settings.cta_label}</TextLink> : undefined}
        />

        <ul className={cn("mt-12 grid gap-6", columnClasses[settings.columns ?? 3])}>
          {visible.map((project) => (
            <li key={project.slug}>
              <ProjectCard project={project} href={`/projetos/${project.slug}`} />
            </li>
          ))}
        </ul>
      </Container>
    </SectionFrame>
  );
}
