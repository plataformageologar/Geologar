import { ProjectCard } from "@/components/projects/project-card";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { TextLink } from "@/components/ui/text-link";
import type { ProjectSummary } from "@/types/content";

type FeaturedProjectsProps = {
  projects: ProjectSummary[];
};

export function FeaturedProjects({ projects }: FeaturedProjectsProps) {
  if (projects.length === 0) return null;

  return (
    <section id="projetos" aria-labelledby="projetos-title" className="section-y">
      <Container>
        <SectionHeading
          id="projetos-title"
          eyebrow="Projetos"
          title="Pesquisa com resultados"
          action={<TextLink href="/projetos">Ver todos os projetos</TextLink>}
        />

        <ul className="mt-12 grid gap-6 lg:grid-cols-3">
          {projects.slice(0, 3).map((project) => (
            <li key={project.slug}>
              <ProjectCard project={project} href={`/projetos/${project.slug}`} />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
