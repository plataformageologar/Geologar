import { Button } from "@/components/ui/button";
import { ProvisionalBadge } from "@/components/ui/badge";
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
  /** Sinaliza, no ambiente de revisão, o botão ainda sem destino. */
  showProvisionalNotice?: boolean;
};

export function CooperationCta({ content, showProvisionalNotice }: CooperationCtaProps) {
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
            {cooperation_cta_label && cooperation_cta_href ? (
              <Button
                href={cooperation_cta_href}
                surface="dark"
                size="lg"
                withArrow
                className="mt-3 self-start"
              >
                {cooperation_cta_label}
              </Button>
            ) : (
              showProvisionalNotice && (
                <div className="mt-3">
                  <ProvisionalBadge>
                    Botão “{cooperation_cta_label}” aguarda o canal oficial de contato
                  </ProvisionalBadge>
                </div>
              )
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
