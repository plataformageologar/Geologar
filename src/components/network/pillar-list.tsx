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
  /**
   * "stacked" (padrão): grade com ícone em quadro verde.
   * "row" (Etapa 10.7): pilares lado a lado com separadores verticais e
   * ícones terrosos, como na referência visual da página inicial.
   */
  variant?: "stacked" | "row";
  className?: string;
};

const rowColumns: Record<number, string> = {
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
};

/** Pilares de atuação da rede (tabela site_pillars). */
export function PillarList({ pillars, headingLevel: Heading = "h3", variant = "stacked", className }: PillarListProps) {
  if (variant === "row") {
    return (
      <ul className={cn("grid grid-cols-1 gap-y-8 sm:grid-cols-2", rowColumns[Math.min(pillars.length, 4)] ?? "md:grid-cols-4", className)}>
        {pillars.map((pillar) => {
          const Icon = pillarIcons[pillar.icon] ?? Microscope;
          return (
            <li
              key={pillar.id}
              className="flex flex-col gap-3 border-border sm:pr-5 sm:even:border-l sm:even:pl-5 md:[&:not(:first-child)]:border-l md:[&:not(:first-child)]:pl-5"
            >
              <Icon aria-hidden="true" className="size-10 text-earth" strokeWidth={1.5} />
              <Heading className="font-sans text-h4 font-bold">{pillar.title}</Heading>
              {pillar.description && <p className="text-body-sm text-muted-foreground">{pillar.description}</p>}
            </li>
          );
        })}
      </ul>
    );
  }

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
