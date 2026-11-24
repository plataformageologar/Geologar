import Image from "next/image";
import { Clock, ExternalLink, EyeOff, Orbit } from "lucide-react";

import { Container } from "@/components/ui/container";
import { resolveImageSrc } from "@/lib/queries/shared";
import {
  DEFAULT_BUTTON_LABEL,
  experienceLink,
  unavailableText,
  type Experience,
  type ExperienceColumns,
} from "@/lib/site/experiences";
import { resolveBackground, type SectionSettings } from "@/lib/site/sections";
import { cn } from "@/lib/utils/cn";

import { SectionFrame } from "./section-frame";

/**
 * Experiências digitais (Etapa 10.6): cards grandes das aplicações
 * interativas da GeoLogar. Só renderiza capa, textos e um link: a aplicação
 * externa (Three.js, panoramas, áudio, WebXR) só é carregada quando o
 * visitante decide abri-la, em outra aba por padrão. Sem iframe, vídeo ou
 * script de terceiros na página inicial.
 */

const gridColumns: Record<ExperienceColumns, string> = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-2 lg:grid-cols-3",
};

/** Experiências que aparecem no site (no editor visual, também as ocultas). */
export function shownExperiences(settings: SectionSettings, editing = false): Experience[] {
  return (settings.experiences ?? []).filter((experience) => editing || experience.is_visible);
}

export function hasExperiences(settings: SectionSettings): boolean {
  return shownExperiences(settings).length > 0;
}

/** Capa neutra com as cores e as curvas de nível da GeoLogar (sem imagem). */
function CoverPlaceholder() {
  return (
    <div aria-hidden="true" className="absolute inset-0 bg-deep text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgb(255_255_255/0.14),transparent_55%)]" />
      <div className="topo-pattern absolute inset-0 text-white/[0.14]" />
      <span className="absolute inset-0 m-auto flex size-16 items-center justify-center rounded-2xl border border-white/25 bg-white/10 backdrop-blur-sm">
        <Orbit className="size-8" strokeWidth={1.5} />
      </span>
    </div>
  );
}

function ExperienceCard({
  experience,
  editing,
  sizes,
  headingLevel: Heading,
}: {
  experience: Experience;
  editing: boolean;
  sizes: string;
  headingLevel: "h3";
}) {
  const src = resolveImageSrc(experience.image_path ?? null);
  const link = experienceLink(experience);
  const newTab = experience.open_in_new_tab;
  const status = link ? null : unavailableText(experience);

  return (
    <article
      data-experience-id={experience.id}
      className={cn(
        "card-surface group flex h-full flex-col overflow-hidden rounded-3xl border bg-surface",
        "transition-[box-shadow,transform] duration-300 motion-reduce:transition-none",
        link && "hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-22px_rgb(15_37_55/0.45)]",
        editing && !experience.is_visible && "opacity-55 grayscale",
      )}
    >
      <div className="relative aspect-video overflow-hidden bg-surface-muted">
        {src ? (
          <Image
            src={src}
            alt={experience.image_alt ?? ""}
            fill
            sizes={sizes}
            className={cn(
              "object-cover transition-transform duration-500 motion-reduce:transition-none",
              link && "group-hover:scale-[1.03]",
            )}
          />
        ) : (
          <CoverPlaceholder />
        )}
        {status && (
          <span aria-hidden="true" className="absolute top-4 right-4 inline-flex items-center gap-1.5 rounded-full bg-surface/95 px-3 py-1 text-caption font-semibold text-foreground shadow-sm">
            <Clock aria-hidden="true" className="size-3.5" />
            {status}
          </span>
        )}
        {editing && !experience.is_visible && (
          <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-caption font-semibold text-foreground shadow-sm">
            <EyeOff aria-hidden="true" className="size-3.5" />
            Oculta no site
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-6 md:p-8">
        {experience.label && (
          <p className="text-caption font-semibold uppercase tracking-[0.1em] text-earth">{experience.label}</p>
        )}
        <Heading className="text-h3 break-words">{experience.title}</Heading>
        {experience.description && (
          <p className="whitespace-pre-line text-body text-muted-foreground">{experience.description}</p>
        )}
        <div className="mt-auto pt-4">
          {link ? (
            <a
              href={link}
              target={newTab ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--button-radius)] bg-primary px-6 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-ring"
            >
              {experience.button_label ?? DEFAULT_BUTTON_LABEL}
              <span className="sr-only">
                : {experience.title}
                {newTab ? " (abre em nova aba)" : ""}
              </span>
              {newTab && <ExternalLink aria-hidden="true" className="size-4" />}
            </a>
          ) : (
            <p className="inline-flex min-h-12 items-center gap-2 rounded-[var(--button-radius)] border border-dashed border-border px-5 text-base font-semibold text-muted-foreground">
              <Clock aria-hidden="true" className="size-4" />
              {status}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

export function ExperiencesSection({ settings, editing = false }: { settings: SectionSettings; editing?: boolean }) {
  const experiences = shownExperiences(settings, editing);
  if (experiences.length === 0) return null;
  const columns: ExperienceColumns = settings.columns === 3 ? 3 : 2;
  const sizes = columns === 3 ? "(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw" : "(min-width: 768px) 50vw, 100vw";
  const title = settings.title ?? "Experiências digitais";

  return (
    <SectionFrame id="experiencias" labelledBy="experiencias-titulo" background={resolveBackground("experiences", settings)}>
      <Container>
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          {settings.eyebrow && (
            <p className="flex items-center gap-3 text-label uppercase tracking-[0.12em] text-earth">
              <span aria-hidden="true" className="h-px w-8 bg-current" />
              {settings.eyebrow}
              <span aria-hidden="true" className="h-px w-8 bg-current" />
            </p>
          )}
          <h2 id="experiencias-titulo" className="text-h2">
            {title}
          </h2>
          {settings.description && <p className="text-body-lg text-muted-foreground">{settings.description}</p>}
        </div>
        <ul className={cn("mt-12 grid gap-6 lg:gap-8", gridColumns[columns])}>
          {experiences.map((experience) => (
            <li key={experience.id}>
              <ExperienceCard experience={experience} editing={editing} sizes={sizes} headingLevel="h3" />
            </li>
          ))}
        </ul>
      </Container>
    </SectionFrame>
  );
}
