import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { resolveBackground, type SectionSettings } from "@/lib/site/sections";
import { cn } from "@/lib/utils/cn";
import type { HomepageContent } from "@/types/content";

type CooperationCtaProps = {
  content: Pick<
    HomepageContent,
    "cooperation_title" | "cooperation_description" | "cooperation_cta_label" | "cooperation_cta_href"
  >;
  settings?: SectionSettings;
};

export function CooperationCta({ content, settings = {} }: CooperationCtaProps) {
  const { cooperation_title, cooperation_description, cooperation_cta_label, cooperation_cta_href } = content;

  if (!cooperation_title) return null;
  const deep = resolveBackground("cooperation", settings) === "deep";

  return (
    <section id="cooperacao" aria-labelledby="cooperacao-title" className="pb-[var(--section-y)]">
      <Container>
        <div
          className={cn(
            "on-dark relative isolate overflow-hidden rounded-3xl px-6 py-14 sm:px-10 md:px-14 md:py-20",
            deep ? "bg-deep text-deep-foreground" : "bg-primary text-primary-foreground",
          )}
        >
          <div aria-hidden="true" className="topo-pattern absolute inset-0 -z-10 text-white/[0.1]" />
          <div className="flex max-w-3xl flex-col gap-5">
            <h2 id="cooperacao-title" className="text-h2">
              {cooperation_title}
            </h2>
            {cooperation_description && (
              <p className="whitespace-pre-line text-body-lg opacity-90">{cooperation_description}</p>
            )}
            {/* O botão só aparece com destino cadastrado (padrão: /#contato, o contato do rodapé). */}
            {cooperation_cta_label && cooperation_cta_href && (
              <Button href={cooperation_cta_href} surface="dark" size="lg" withArrow className="mt-3 self-start">
                {cooperation_cta_label}
              </Button>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
