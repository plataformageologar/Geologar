import type { ReactNode } from "react";
import { CircleDashed, Eye, PencilLine } from "lucide-react";

import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/utils/cn";

/**
 * Componentes exclusivos da prévia de demonstração (`/admin/demonstracao`).
 * Sinalizam a situação de cada seção para a equipe — nunca aparecem no site
 * público.
 */

type DemoState = "published" | "draft" | "pending";

const states: Record<DemoState, { label: string; icon: typeof Eye; className: string }> = {
  published: { label: "No site público", icon: Eye, className: "bg-secondary-soft text-secondary" },
  draft: { label: "Rascunho (não público)", icon: PencilLine, className: "bg-earth-soft text-earth" },
  pending: { label: "Pendente", icon: CircleDashed, className: "bg-surface-muted text-foreground" },
};

/** Etiqueta de situação usada nas notas e sobre os cards. */
export function DemoStateLabel({ state, className }: { state: DemoState; className?: string }) {
  const { label, icon: Icon, className: tone } = states[state];
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-semibold",
        tone,
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {label}
    </span>
  );
}

/** Nota da equipe entre as seções da prévia. */
export function DemoNote({ state, children }: { state: DemoState; children: ReactNode }) {
  return (
    <aside aria-label="Situação na demonstração" className="border-y border-dashed border-earth/40 bg-earth-soft/40">
      <Container className="flex flex-col gap-2 py-4 text-body-sm sm:flex-row sm:items-start sm:gap-4">
        <DemoStateLabel state={state} className="shrink-0" />
        <div className="text-muted-foreground [&_strong]:font-semibold [&_strong]:text-foreground">{children}</div>
      </Container>
    </aside>
  );
}

type DemoPlaceholderSectionProps = {
  id: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
};

/** Seção ainda sem conteúdo aprovado: mostra onde ela ficará e o que falta. */
export function DemoPlaceholderSection({ id, eyebrow, title, children }: DemoPlaceholderSectionProps) {
  return (
    <section aria-labelledby={`${id}-title`} className="section-y">
      <Container>
        <SectionHeading id={`${id}-title`} eyebrow={eyebrow} title={title} />
        <div className="mt-10 rounded-2xl border-2 border-dashed border-border bg-surface p-6 text-body text-muted-foreground md:p-10">
          {children}
        </div>
      </Container>
    </section>
  );
}
