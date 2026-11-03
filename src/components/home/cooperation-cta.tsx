import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import type { HomepageContent } from "@/types/content";

type CooperationCtaProps = {
  content: Pick<
    HomepageContent,
    | "cooperation_title"
    | "cooperation_description"
    | "cooperation_cta_label"
    | "cooperation_cta_href"
  >;
};

export function CooperationCta({ content }: CooperationCtaProps) {
  const {
    cooperation_title,
    cooperation_description,
    cooperation_cta_label,
    cooperation_cta_href,
  } = content;

  if (!cooperation_title) return null;

  return (
    <section id="contato" aria-labelledby="contato-title" className="pb-[clamp(4rem,2.8rem+5vw,7.5rem)]">
      <Container>
        <div className="on-dark relative isolate overflow-hidden rounded-3xl bg-primary px-6 py-14 text-primary-foreground sm:px-10 md:px-14 md:py-20">
          <div
            aria-hidden="true"
            className="topo-pattern absolute inset-0 -z-10 text-white/[0.1]"
          />
          <div className="flex max-w-3xl flex-col gap-5">
            <h2 id="contato-title" className="text-h2">
              {cooperation_title}
            </h2>
            {cooperation_description && (
              <p className="text-body-lg text-primary-foreground/90">
                {cooperation_description}
              </p>
            )}
            {/* O botão só aparece quando houver um destino real cadastrado. */}
            {cooperation_cta_label && cooperation_cta_href && (
              <Button
                href={cooperation_cta_href}
                surface="dark"
                size="lg"
                withArrow
                className="mt-3 self-start"
              >
                {cooperation_cta_label}
              </Button>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
