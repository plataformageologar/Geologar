import { ProvisionalBadge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import type { ProjectSummary } from "@/types/content";

import { EmptyState } from "./empty-state";
import { ProjectCard } from "./project-card";

type FeaturedProjectsProps = {
  projects: ProjectSummary[];
  provisional?: boolean;
};

export function FeaturedProjects({ projects, provisional }: FeaturedProjectsProps) {
  return (
    <section id="projetos" aria-labelledby="projetos-title" className="section-y">
      <Container>
        <SectionHeading id="projetos-title" eyebrow="Projetos" title="Pesquisa com resultados">
          {provisional && <ProvisionalBadge />}
        </SectionHeading>

        {projects.length > 0 ? (
          <ul className="mt-12 grid gap-6 lg:grid-cols-3">
            {projects.slice(0, 3).map((project) => (
              <li key={project.slug}>
                <ProjectCard project={project} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState className="mt-12">
            Os projetos em destaque serão apresentados em breve.
          </EmptyState>
        )}
      </Container>
    </section>
  );
}
