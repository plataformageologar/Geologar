import Image from "next/image";

import { InstitutionLogo } from "@/components/institutions/institution-logo";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { resolveImageSrc } from "@/lib/queries/shared";
import {
  isDarkBackground,
  resolveBackground,
  type Columns,
  type SectionSettings,
} from "@/lib/site/sections";
import { cn } from "@/lib/utils/cn";
import type { InstitutionSummary } from "@/types/content";

import { backgroundClasses, SectionFrame } from "./section-frame";

/**
 * Blocos controlados (texto, imagem e texto, chamada, galeria, logotipos).
 * Só recebem configurações já validadas: textos simples (sem HTML), links
 * aprovados e imagens da biblioteca. Um bloco sem conteúdo suficiente não é
 * exibido no site (no editor aparece um aviso no lugar).
 */

type BlockProps = { id: string; settings: SectionSettings };

function BlockButton({ settings, dark }: { settings: SectionSettings; dark: boolean }) {
  if (!settings.cta_label || !settings.cta_href) return null;
  return (
    <Button href={settings.cta_href} surface={dark ? "dark" : "light"} size="lg" withArrow className="mt-2 self-start">
      {settings.cta_label}
    </Button>
  );
}

function Paragraphs({ text, dark }: { text?: string; dark: boolean }) {
  if (!text) return null;
  return (
    <p className={cn("whitespace-pre-line text-body-lg", dark ? "opacity-90" : "text-muted-foreground")}>{text}</p>
  );
}

export function hasBlockContent(type: string, settings: SectionSettings, institutions?: Record<string, InstitutionSummary>) {
  switch (type) {
    case "text":
    case "cta":
      return Boolean(settings.title || settings.description);
    case "image_text":
      return Boolean(settings.title || settings.description || settings.image_path);
    case "gallery":
      return (settings.images?.length ?? 0) > 0;
    case "logos":
      return (settings.institution_ids ?? []).some((id) => institutions?.[id]);
    default:
      return false;
  }
}

export function TextBlock({ id, settings }: BlockProps) {
  if (!hasBlockContent("text", settings)) return null;
  const background = resolveBackground("text", settings);
  const dark = isDarkBackground(background);
  const centered = settings.align === "center";
  const titleId = `bloco-${id}-titulo`;

  return (
    <SectionFrame labelledBy={titleId} background={background}>
      <Container>
        <div className={cn("flex max-w-3xl flex-col gap-5", centered && "mx-auto items-center text-center")}>
          {settings.eyebrow && (
            <p
              className={cn(
                "flex items-center gap-3 text-label uppercase tracking-[0.12em]",
                dark ? "text-deep-muted" : "text-earth",
              )}
            >
              <span aria-hidden="true" className="h-px w-8 bg-current" />
              {settings.eyebrow}
            </p>
          )}
          <h2 id={titleId} className="text-h2">
            {settings.title ?? settings.eyebrow ?? "GeoLogar"}
          </h2>
          <Paragraphs text={settings.description} dark={dark} />
          <div className={cn("flex", centered && "justify-center")}>
            <BlockButton settings={settings} dark={dark} />
          </div>
        </div>
      </Container>
    </SectionFrame>
  );
}

export function ImageTextBlock({ id, settings }: BlockProps) {
  if (!hasBlockContent("image_text", settings)) return null;
  const background = resolveBackground("image_text", settings);
  const src = resolveImageSrc(settings.image_path ?? null);
  const titleId = `bloco-${id}-titulo`;

  return (
    <SectionFrame labelledBy={titleId} background={background}>
      <Container className="grid items-center gap-10 md:grid-cols-2 md:gap-14">
        {src && (
          <div
            className={cn(
              "relative aspect-[4/3] overflow-hidden rounded-2xl bg-surface-muted",
              settings.image_side === "right" && "md:order-2",
            )}
          >
            <Image
              src={src}
              alt={settings.image_alt ?? ""}
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        )}
        <div className="flex flex-col gap-5">
          <SectionHeading id={titleId} eyebrow={settings.eyebrow} title={settings.title ?? "GeoLogar"} />
          <Paragraphs text={settings.description} dark={false} />
          <BlockButton settings={settings} dark={false} />
        </div>
      </Container>
    </SectionFrame>
  );
}

export function CtaBlock({ id, settings }: BlockProps) {
  if (!hasBlockContent("cta", settings)) return null;
  const background = resolveBackground("cta", settings);
  const dark = isDarkBackground(background);
  const titleId = `bloco-${id}-titulo`;

  return (
    <section aria-labelledby={titleId} className="py-[clamp(2.5rem,2rem+2vw,4rem)]">
      <Container>
        <div
          className={cn(
            "relative isolate overflow-hidden rounded-3xl px-6 py-12 sm:px-10 md:px-14 md:py-16",
            backgroundClasses[background === "default" ? "surface" : background],
            !dark && "border border-border",
          )}
        >
          {dark && <div aria-hidden="true" className="topo-pattern absolute inset-0 -z-10 text-white/[0.1]" />}
          <div className="flex max-w-3xl flex-col gap-5">
            <h2 id={titleId} className="text-h2">
              {settings.title ?? "GeoLogar"}
            </h2>
            <Paragraphs text={settings.description} dark={dark} />
            <BlockButton settings={settings} dark={dark} />
          </div>
        </div>
      </Container>
    </section>
  );
}

const galleryColumns: Record<Columns, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
};

export function GalleryBlock({ id, settings }: BlockProps) {
  if (!hasBlockContent("gallery", settings)) return null;
  const titleId = `bloco-${id}-titulo`;
  const images = (settings.images ?? []).flatMap((image) => {
    const src = resolveImageSrc(image.path);
    return src ? [{ ...image, src }] : [];
  });

  return (
    <SectionFrame labelledBy={titleId} background={resolveBackground("gallery", settings)}>
      <Container>
        <SectionHeading id={titleId} title={settings.title ?? "Galeria"} description={settings.description} />
        <ul className={cn("mt-10 grid gap-4", galleryColumns[settings.columns ?? 3])}>
          {images.map((image) => (
            <li key={image.path}>
              <figure className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-surface-muted">
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover"
                />
              </figure>
            </li>
          ))}
        </ul>
      </Container>
    </SectionFrame>
  );
}

export function LogosBlock({
  id,
  settings,
  institutions,
}: BlockProps & { institutions: Record<string, InstitutionSummary> }) {
  if (!hasBlockContent("logos", settings, institutions)) return null;
  const titleId = `bloco-${id}-titulo`;
  // Somente instituições publicadas (o mapa vem da leitura pública).
  const selected = (settings.institution_ids ?? []).flatMap((institutionId) =>
    institutions[institutionId] ? [institutions[institutionId]] : [],
  );

  return (
    <SectionFrame labelledBy={titleId} background={resolveBackground("logos", settings)}>
      <Container>
        <SectionHeading id={titleId} title={settings.title ?? "Instituições"} description={settings.description} />
        <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 lg:gap-4">
          {selected.map((institution) => (
            <li key={institution.id}>
              <InstitutionLogo institution={institution} />
            </li>
          ))}
        </ul>
      </Container>
    </SectionFrame>
  );
}
