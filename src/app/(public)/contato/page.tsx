import type { Metadata } from "next";
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { TextLink } from "@/components/ui/text-link";
import { getHomepageContent } from "@/lib/queries/homepage";
import { getContactChannels } from "@/lib/queries/settings";
import { safeExternalUrl } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contato",
  description: "Canais oficiais de contato da GeoLogar.",
};

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
  const [{ settings, socialLinks }, content] = await Promise.all([
    getContactChannels(),
    getHomepageContent(),
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

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: "Início", href: "/" }, { label: "Contato" }]}
        eyebrow="Contato"
        title="Entre em contato com a GeoLogar"
        description={content.cooperation_description}
      />

      <Container className="section-y">
        {hasChannels ? (
          <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                      <a href={link.url} className={`${channelLink} inline-flex min-h-10 items-center capitalize`}>
                        {link.label ?? link.platform}
                      </a>
                    </li>
                  ))}
                </ul>
              </Channel>
            )}
          </ul>
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
