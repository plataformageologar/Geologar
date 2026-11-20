import {
  BookOpen,
  FlaskConical,
  Gem,
  Globe,
  GraduationCap,
  Handshake,
  Layers,
  Leaf,
  Map as MapIcon,
  Microscope,
  Mountain,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { Pillar, PillarIcon } from "@/lib/site/pillars";
import { cn } from "@/lib/utils/cn";

/** Ícones disponíveis para os pilares (lista fechada; ver lib/site/pillars). */
export const pillarIcons: Record<PillarIcon, LucideIcon> = {
  microscope: Microscope,
  "graduation-cap": GraduationCap,
  mountain: Mountain,
  handshake: Handshake,
  globe: Globe,
  leaf: Leaf,
  gem: Gem,
  layers: Layers,
  map: MapIcon,
  users: Users,
  "book-open": BookOpen,
  flask: FlaskConical,
};

type PillarListProps = {
  pillars: readonly Pillar[];
  /** Nível do título conforme a hierarquia da página. */
  headingLevel?: "h2" | "h3";
  className?: string;
};

/** Pilares de atuação da rede (tabela site_pillars). */
export function PillarList({ pillars, headingLevel: Heading = "h3", className }: PillarListProps) {
  return (
    <ul className={cn("grid gap-x-8 gap-y-10 sm:grid-cols-2", className)}>
      {pillars.map((pillar) => {
        const Icon = pillarIcons[pillar.icon] ?? Microscope;

        return (
          <li key={pillar.id} className="flex flex-col gap-3 border-t border-border pt-6">
            <span className="inline-flex size-12 items-center justify-center rounded-xl bg-secondary-soft text-secondary">
              <Icon aria-hidden="true" className="size-6" strokeWidth={1.75} />
            </span>
            <Heading className="font-sans text-h4">{pillar.title}</Heading>
            {pillar.description && <p className="text-body-sm text-muted-foreground">{pillar.description}</p>}
          </li>
        );
      })}
    </ul>
  );
}
