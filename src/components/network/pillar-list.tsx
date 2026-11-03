import { GraduationCap, Handshake, Microscope, Mountain } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { Pillar } from "@/data/site";
import { cn } from "@/lib/utils/cn";

const pillarIcons: Record<Pillar["id"], LucideIcon> = {
  pesquisa: Microscope,
  formacao: GraduationCap,
  territorio: Mountain,
  cooperacao: Handshake,
};

type PillarListProps = {
  pillars: readonly Pillar[];
  /** Nível do título conforme a hierarquia da página. */
  headingLevel?: "h2" | "h3";
  className?: string;
};

/** Pilares de atuação da rede (conteúdo estático do briefing). */
export function PillarList({ pillars, headingLevel: Heading = "h3", className }: PillarListProps) {
  return (
    <ul className={cn("grid gap-x-8 gap-y-10 sm:grid-cols-2", className)}>
      {pillars.map((pillar) => {
        const Icon = pillarIcons[pillar.id];

        return (
          <li key={pillar.id} className="flex flex-col gap-3 border-t border-border pt-6">
            <span className="inline-flex size-12 items-center justify-center rounded-xl bg-secondary-soft text-secondary">
              <Icon aria-hidden="true" className="size-6" strokeWidth={1.75} />
            </span>
            <Heading className="font-sans text-h4">{pillar.title}</Heading>
            <p className="text-body-sm text-muted-foreground">{pillar.description}</p>
          </li>
        );
      })}
    </ul>
  );
}
