import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import type { ImagePosition, Overlay, SectionSettings } from "@/lib/site/sections";
import { cn } from "@/lib/utils/cn";
import type { HomepageContent } from "@/types/content";

type HeroProps = {
  content: Pick<
    HomepageContent,
    | "hero_title"
    | "hero_description"
    | "hero_image_path"
    | "hero_image_alt"
    | "hero_primary_cta_label"
    | "hero_primary_cta_href"
    | "hero_secondary_cta_label"
    | "hero_secondary_cta_href"
  >;
  /** Layout, posição da imagem, intensidade da camada e botões visíveis. */
  settings?: SectionSettings;
};

const objectPositions: Record<ImagePosition, string> = {
  center: "object-center",
  top: "object-top",
  bottom: "object-bottom",
  left: "object-left",
  right: "object-[70%_center]",
};

// Camada de contraste sobre a fotografia: mais densa à esquerda (texto) e no mobile.
const sideOverlays: Record<Overlay, string> = {
  light: "bg-deep/55 md:bg-transparent md:bg-gradient-to-r md:from-deep/75 md:via-deep/40 md:to-deep/5",
  medium: "bg-deep/70 md:bg-transparent md:bg-gradient-to-r md:from-deep/85 md:via-deep/55 md:to-deep/10",
  strong: "bg-deep/80 md:bg-transparent md:bg-gradient-to-r md:from-deep/90 md:via-deep/75 md:to-deep/45",
};
const evenOverlays: Record<Overlay, string> = {
  light: "bg-deep/55",
  medium: "bg-deep/68",
  strong: "bg-deep/80",
};

/**
 * Banner principal. Com `hero_image_path`, usa a fotografia com camada de
 * contraste; sem ela, um fundo institucional com curvas de nível. O layout
 * vem de opções fechadas (padrão, centralizado ou lado a lado).
 */
export function Hero({ content, settings = {} }: HeroProps) {
  const {
    hero_title,
    hero_description,
    hero_image_path,
    hero_image_alt,
    hero_primary_cta_label,
    hero_primary_cta_href,
    hero_secondary_cta_label,
    hero_secondary_cta_href,
  } = content;

  if (!hero_title) return null;

  const layout = settings.layout ?? "default";
  const overlay = settings.overlay ?? "medium";
  const position = objectPositions[settings.image_position ?? "right"];
  const split = layout === "split" && Boolean(hero_image_path);
  const centered = layout === "centered";
  const showPrimary = settings.show_primary_cta !== false && hero_primary_cta_label && hero_primary_cta_href;
  const showSecondary =
    settings.show_secondary_cta !== false && hero_secondary_cta_label && hero_secondary_cta_href;

  return (
    <section
      aria-labelledby="hero-title"
      className="on-dark relative isolate overflow-hidden bg-deep text-deep-foreground"
    >
      {hero_image_path && !split ? (
        <>
          <Image
            src={hero_image_path}
            alt={hero_image_alt ?? ""}
            fill
            priority
            sizes="100vw"
            className={cn("-z-20 object-cover", position)}
          />
          <div
            aria-hidden="true"
            className={cn("absolute inset-0 -z-10", centered ? evenOverlays[overlay] : sideOverlays[overlay])}
          />
        </>
      ) : (
        <>
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_85%_30%,var(--primary)_0%,transparent_60%),radial-gradient(ellipse_at_10%_110%,var(--secondary)_0%,transparent_55%),radial-gradient(ellipse_at_100%_105%,var(--earth)_0%,transparent_35%)] opacity-70"
          />
          <div aria-hidden="true" className="topo-pattern absolute inset-0 -z-10 text-white/[0.12]" />
        </>
      )}

      <Container
        className={cn(
          "min-h-[min(40rem,calc(88svh-var(--header-height)))] py-20 md:py-24",
          split ? "grid items-center gap-10 md:grid-cols-2 md:gap-12" : "flex flex-col justify-center",
        )}
      >
        <div className={cn("flex max-w-3xl flex-col gap-6", centered && "mx-auto items-center text-center")}>
          {settings.eyebrow && (
            <p className="flex items-center gap-3 text-label uppercase tracking-[0.12em] text-deep-muted">
              <span aria-hidden="true" className="h-px w-8 bg-current" />
              {settings.eyebrow}
            </p>
          )}
          <h1 id="hero-title" className="text-display">
            {hero_title}
          </h1>
          {hero_description && (
            <p className="max-w-2xl whitespace-pre-line text-body-lg text-deep-foreground/90">{hero_description}</p>
          )}
          {(showPrimary || showSecondary) && (
            <div className={cn("mt-2 flex flex-col gap-3 sm:flex-row sm:flex-wrap", centered && "sm:justify-center")}>
              {showPrimary && (
                <Button href={hero_primary_cta_href} surface="dark" size="lg" withArrow>
                  {hero_primary_cta_label}
                </Button>
              )}
              {showSecondary && (
                <Button href={hero_secondary_cta_href} surface="dark" variant="secondary" size="lg">
                  {hero_secondary_cta_label}
                </Button>
              )}
            </div>
          )}
        </div>

        {split && hero_image_path && (
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl md:aspect-[5/6] lg:aspect-[4/3]">
            <Image
              src={hero_image_path}
              alt={hero_image_alt ?? ""}
              fill
              priority
              sizes="(min-width: 768px) 50vw, 100vw"
              className={cn("object-cover", position)}
            />
          </div>
        )}
      </Container>
    </section>
  );
}
