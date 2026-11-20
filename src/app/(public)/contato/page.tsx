import type { Metadata } from "next";
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { ContactForm } from "@/components/contact/contact-form";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { resolvePageHeader } from "@/lib/site/page-content";
import { getPageContent, getPageMetadata } from "@/lib/queries/site-config";
import { TextLink } from "@/components/ui/text-link";
import { getContactConfig } from "@/lib/contact/config";
import { getHomepageContent } from "@/lib/queries/homepage";
import { getContactChannels } from "@/lib/queries/settings";
import { safeExternalUrl } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return getPageMetadata("contato", { title: "Contato" });
}

function Channel({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <li className="flex gap-4 rounded-2xl border border-border bg-surface p-6">
      <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="font-sans text-caption font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </h2>
        <div className="text-body break-words">{children}</div>
      </div>
    </li>
  );
}

const channelLink =
  "text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary";

export default async function ContactPage() {
  const [{ settings, socialLinks }, content, page] = await Promise.all([
    getContactChannels(),
    getHomepageContent(),
    getPageContent("contato"),
  ]);

  const email = settings?.contact_email ?? null;
  const phone = settings?.contact_phone ?? null;
  const location = [settings?.city, settings?.state, settings?.country].filter(Boolean).join(" — ");
  const address = settings?.address ?? null;
  const socials = socialLinks.flatMap((link) => {
    const url = safeExternalUrl(link.url);
    return url ? [{ ...link, url }] : [];
  });
  const hasChannels = Boolean(email || phone || address || location || socials.length > 0);
  // O formulário só aparece com a configuração completa (docs/contact-form.md);
  // sem ela, a página continua só com os canais publicados.
  const { config } = getContactConfig();

  const channels = (
    <ul className={config ? "grid gap-4" : "grid gap-6 md:grid-cols-2 lg:grid-cols-3"}>
      {email && (
        <Channel icon={Mail} label="E-mail">
          <a href={`mailto:${email}`} className={channelLink}>
            {email}
          </a>
        </Channel>
      )}
      {phone && (
        <Channel icon={Phone} label="Telefone">
          <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className={channelLink}>
            {phone}
          </a>
        </Channel>
      )}
      {(address || location) && (
        <Channel icon={MapPin} label="Endereço">
          <address className="not-italic">
            {address}
            {address && location && <br />}
            {location}
          </address>
        </Channel>
      )}
      {socials.length > 0 && (
        <Channel icon={ArrowUpRight} label="Redes sociais">
          <ul className="flex flex-col">
            {socials.map((link) => (
              <li key={link.id}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${channelLink} inline-flex min-h-10 items-center capitalize`}
                >
                  {link.label ?? link.platform}
                  <span className="sr-only"> (abre em nova aba)</span>
                </a>
              </li>
            ))}
          </ul>
        </Channel>
      )}
    </ul>
  );

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: "Início", href: "/" }, { label: "Contato" }]}
        {...resolvePageHeader("contato", page, content)}
      />

      <Container className="section-y">
        {config ? (
          <div className="grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-12 xl:gap-16">
            <section
              aria-labelledby="contact-form-title"
              className="flex min-w-0 flex-col gap-6 rounded-2xl border border-border bg-surface p-5 sm:p-8"
            >
              <div className="flex flex-col gap-2">
                <h2 id="contact-form-title" className="font-sans text-h3">
                  Envie uma mensagem
                </h2>
                <p className="text-body-sm text-muted-foreground">
                  Todos os campos são obrigatórios. A resposta será enviada para o e-mail informado.
                </p>
              </div>
              <ContactForm turnstileSiteKey={config.turnstileSiteKey} />
            </section>

            <aside aria-labelledby="contact-channels-title" className="flex min-w-0 flex-col gap-5">
              <h2 id="contact-channels-title" className="font-sans text-h4">
                Outros canais
              </h2>
              {hasChannels ? (
                channels
              ) : (
                <EmptyState
                  title="Os canais oficiais de contato ainda não foram publicados."
                  description="Enquanto isso, conheça a rede e as linhas de pesquisa."
                >
                  <TextLink href="/rede">Conheça a rede</TextLink>
                  <TextLink href="/pesquisa">Ver linhas de pesquisa</TextLink>
                </EmptyState>
              )}
            </aside>
          </div>
        ) : hasChannels ? (
          channels
        ) : (
          <EmptyState
            title="Os canais oficiais de contato ainda não foram publicados."
            description="Enquanto isso, conheça a rede e as linhas de pesquisa."
          >
            <TextLink href="/rede">Conheça a rede</TextLink>
            <TextLink href="/pesquisa">Ver linhas de pesquisa</TextLink>
          </EmptyState>
        )}
      </Container>
    </>
  );
}
