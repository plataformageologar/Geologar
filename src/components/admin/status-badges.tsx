import { CheckCircle2, Clock, Flag, PencilLine, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { projectStatusLabel } from "@/lib/admin/projects";

/**
 * Estados exibidos nas listagens do CMS. Cada um tem texto e ícone — a cor
 * nunca é a única forma de comunicar a situação.
 */

/** Situação editorial (`is_published`). */
export function PublicationBadge({ published }: { published: boolean }) {
  return published ? (
    <Badge tone="green">
      <CheckCircle2 aria-hidden="true" className="size-3.5" />
      Publicado
    </Badge>
  ) : (
    <Badge tone="neutral">
      <PencilLine aria-hidden="true" className="size-3.5" />
      Rascunho
    </Badge>
  );
}

/** Destaque (`is_featured`); não implica publicação. */
export function FeaturedBadge({ featured }: { featured: boolean }) {
  if (!featured) return <span className="text-caption text-muted-foreground">Não</span>;
  return (
    <Badge tone="earth">
      <Star aria-hidden="true" className="size-3.5" />
      Destaque
    </Badge>
  );
}

/** Situação do projeto (`project_status`), independente da publicação. */
export function ProjectStatusBadge({ status }: { status: string }) {
  const completed = status === "completed";
  const Icon = completed ? Flag : Clock;
  return (
    <Badge tone={completed ? "blue" : "neutral"}>
      <Icon aria-hidden="true" className="size-3.5" />
      {projectStatusLabel[status] ?? status}
    </Badge>
  );
}
