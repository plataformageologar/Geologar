import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
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
  eyebrow?: string | null;
};

/**
 * Banner principal. Com `hero_image_path`, usa a fotografia com camada de
 * contraste; sem ela, um fundo institucional com curvas de nível.
 */
export function Hero({ content, eyebrow }: HeroProps) {
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

  return (
    <section
      aria-labelledby="hero-title"
      className="on-dark relative isolate overflow-hidden bg-deep text-deep-foreground"
    >
      {hero_image_path ? (
        <>
          <Image
            src={hero_image_path}
            alt={hero_image_alt ?? ""}
            fill
            priority
            sizes="100vw"
            className="-z-20 object-cover object-[70%_center]"
          />
          {/* Contraste: mais denso à esquerda (texto) e no mobile. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-deep/70 md:bg-transparent md:bg-gradient-to-r md:from-deep/85 md:via-deep/55 md:to-deep/10"
          />
        </>
      ) : (
        <>
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_85%_30%,var(--primary)_0%,transparent_60%),radial-gradient(ellipse_at_10%_110%,var(--secondary)_0%,transparent_55%)] opacity-70"
          />
          <div
            aria-hidden="true"
            className="topo-pattern absolute inset-0 -z-10 text-white/[0.12]"
          />
        </>
      )}

      <Container className="flex min-h-[min(40rem,calc(88svh-var(--header-height)))] flex-col justify-center py-20 md:py-24">
        <div className="flex max-w-3xl flex-col gap-6">
          {eyebrow && (
            <p className="flex items-center gap-3 text-label uppercase tracking-[0.12em] text-deep-muted">
              <span aria-hidden="true" className="h-px w-8 bg-current" />
              {eyebrow}
            </p>
          )}
          <h1 id="hero-title" className="text-display">
            {hero_title}
          </h1>
          {hero_description && (
            <p className="max-w-2xl text-body-lg text-deep-foreground/90">
              {hero_description}
            </p>
          )}
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {hero_primary_cta_label && hero_primary_cta_href && (
              <Button
                href={hero_primary_cta_href}
                surface="dark"
                size="lg"
                withArrow
              >
                {hero_primary_cta_label}
              </Button>
            )}
            {hero_secondary_cta_label && hero_secondary_cta_href && (
              <Button
                href={hero_secondary_cta_href}
                surface="dark"
                variant="secondary"
                size="lg"
              >
                {hero_secondary_cta_label}
              </Button>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
