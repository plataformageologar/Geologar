import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Lock, Mail, MapPin, MessageCircle, Phone, Plus } from "lucide-react";
import type { ReactNode } from "react";

import logo from "@/assets/brand/geologar-logo-circle.png";
import headerLogo from "@/assets/brand/geologar-logo.png";
import { Container } from "@/components/ui/container";
import { FOOTER_DEFAULT_DESCRIPTION, FOOTER_DEFAULT_TITLES } from "@/lib/admin/site-settings";
import { resolveImageSrc } from "@/lib/queries/shared";
import { CONTACT_ANCHOR, isHashHref, mailtoHref, resolveSiteHref, telHref, whatsappHref } from "@/lib/site/contact";
import type { SiteNavItem } from "@/lib/site/navigation";
import { safeExternalUrl } from "@/lib/utils/format";
import type { SiteSettings, SocialLink } from "@/types/content";

import { SocialIcon } from "./social-icon";

type FooterProps = {
  settings: SiteSettings;
  /** Coluna "Navegação" (menu do rodapé no CMS). */
  navigation: SiteNavItem[];
  /** Coluna "Links úteis" (CMS), além do link fixo "Área restrita". */
  usefulLinks?: SiteNavItem[];
  socialLinks: SocialLink[];
  /** Editor visual: indica onde cadastrar o que falta. Nunca aparece no site. */
  editing?: boolean;
};

/**
 * Logotipo do rodapé conforme Configurações: o oficial (arquivo do código),
 * o mesmo do cabeçalho ou um próprio da biblioteca. Sem imagem válida, volta
 * ao arquivo oficial — que nunca é apagado. Decorativo: o nome do site
 * aparece logo ao lado.
 */
function FooterLogo({ settings }: { settings: SiteSettings }) {
  const custom =
    settings.footer_logo_mode === "custom"
      ? resolveImageSrc(settings.footer_logo_path)
      : settings.footer_logo_mode === "institutional"
        ? resolveImageSrc(settings.logo_path)
        : null;
  if (custom) {
    return (
      <Image
        src={custom}
        alt=""
        width={320}
        height={160}
        sizes="200px"
        className="h-16 w-auto max-w-[12.5rem] object-contain object-left"
      />
    );
  }
  if (settings.footer_logo_mode === "institutional") {
    return <Image src={headerLogo} alt="" sizes="140px" className="h-14 w-auto rounded-lg bg-white p-2" />;
  }
  return <Image src={logo} alt="" sizes="64px" className="size-16" />;
}

const titleClass = "font-sans text-label uppercase tracking-[0.12em] text-deep-muted";
const linkClass =
  "inline-flex min-h-10 items-center gap-1.5 text-body-sm text-deep-foreground underline-offset-4 hover:underline";

/** Link cadastrado no CMS: âncora local, página do site ou endereço externo. */
function FooterNavLink({ item }: { item: SiteNavItem }) {
  const href = resolveSiteHref(item.href);
  const newTab = item.openInNewTab ? { target: "_blank", rel: "noopener noreferrer" } : {};
  const content = (
    <>
      {item.label}
      {item.openInNewTab && (
        <>
          <ArrowUpRight aria-hidden="true" className="size-4" />
          <span className="sr-only"> (abre em nova aba)</span>
        </>
      )}
    </>
  );
  return isHashHref(href) || /^https?:\/\//i.test(href) ? (
    <a href={href} className={linkClass} {...newTab}>
      {content}
    </a>
  ) : (
    <Link href={href} className={linkClass} {...newTab}>
      {content}
    </Link>
  );
}

function Column({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <nav aria-labelledby={id}>
      <h2 id={id} className={titleClass}>
        {title}
      </h2>
      <ul className="mt-3 flex flex-col">{children}</ul>
    </nav>
  );
}

function Channel({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex gap-3 text-body-sm">
      <span className="mt-[0.3rem] shrink-0 text-deep-muted">{icon}</span>
      <span className="min-w-0 break-words">{children}</span>
    </li>
  );
}

/** Aviso do editor visual para campos vazios (nunca exibido aos visitantes). */
function EditorHint({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-lg border border-dashed border-deep-muted/60 px-3 py-2 text-caption text-deep-muted">
      <Plus aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

export function Footer({ settings, navigation, usefulLinks = [], socialLinks: allSocialLinks, editing = false }: FooterProps) {
  const titles = {
    nav: settings.footer_nav_title ?? FOOTER_DEFAULT_TITLES.footer_nav_title,
    links: settings.footer_links_title ?? FOOTER_DEFAULT_TITLES.footer_links_title,
    contact: settings.footer_contact_title ?? FOOTER_DEFAULT_TITLES.footer_contact_title,
    social: settings.footer_social_title ?? FOOTER_DEFAULT_TITLES.footer_social_title,
  };
  const description = settings.footer_description ?? FOOTER_DEFAULT_DESCRIPTION;
  // Somente links http(s) válidos (a constraint do banco já exige o esquema).
  const socialLinks = allSocialLinks.flatMap((link) => {
    const url = safeExternalUrl(link.url);
    return url ? [{ ...link, url }] : [];
  });

  // Canais vazios ou inválidos são omitidos (nada é deduzido de outro campo).
  const phone = settings.contact_phone ? telHref(settings.contact_phone) : null;
  const whatsapp = settings.contact_whatsapp ? whatsappHref(settings.contact_whatsapp) : null;
  const location = [settings.city, settings.state, settings.country].filter(Boolean).join(" — ");
  const hasChannel = Boolean(settings.contact_email || phone || whatsapp || settings.address || location);
  const institutional =
    settings.institutional_name && settings.institutional_name !== settings.site_name ? settings.institutional_name : null;

  return (
    <footer className="on-dark relative isolate overflow-hidden bg-deep text-deep-foreground">
      {/* Textura de curvas de nível (sem imagem com texto embutido). */}
      <div aria-hidden="true" className="topo-pattern absolute inset-0 -z-10 text-white/[0.05]" />
      {/* Faixa em camadas (terra, verde, azul): referência às rochas estratificadas. */}
      <div aria-hidden="true" className="h-1.5 bg-gradient-to-r from-earth via-secondary to-primary" />
      <Container className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)] lg:gap-12 lg:py-14">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <FooterLogo settings={settings} />
            <p className="text-h4 font-semibold">{settings.site_name}</p>
          </div>
          <p className="max-w-sm whitespace-pre-line text-body-sm text-deep-muted">{description}</p>
        </div>

        <Column id="footer-nav-title" title={titles.nav}>
          {navigation.map((item) => (
            <li key={`${item.href}-${item.label}`}>
              <FooterNavLink item={item} />
            </li>
          ))}
        </Column>

        <Column id="footer-links-title" title={titles.links}>
          {usefulLinks.map((item) => (
            <li key={`${item.href}-${item.label}`}>
              <FooterNavLink item={item} />
            </li>
          ))}
          {/* Fixo no código: nenhuma edição bloqueia o acesso ao CMS. */}
          <li>
            <Link href="/admin/login" className={linkClass}>
              <Lock aria-hidden="true" className="size-3.5" />
              Área restrita
            </Link>
          </li>
        </Column>

        {/* Destino de “Contato” em todos os menus e botões (/#contato). */}
        <section
          id={CONTACT_ANCHOR}
          tabIndex={-1}
          aria-labelledby="footer-contact-title"
          className="flex flex-col gap-6 focus:outline-none"
        >
          <div>
            <h2 id="footer-contact-title" className={titleClass}>
              {titles.contact}
            </h2>
            {hasChannel ? (
              <address className="mt-3 not-italic">
                <ul className="flex flex-col gap-3">
                  {settings.contact_email && (
                    <Channel icon={<Mail aria-hidden="true" className="size-4" />}>
                      <a href={mailtoHref(settings.contact_email)} className="underline-offset-4 hover:underline">
                        {settings.contact_email}
                      </a>
                    </Channel>
                  )}
                  {phone && settings.contact_phone && (
                    <Channel icon={<Phone aria-hidden="true" className="size-4" />}>
                      <a href={phone} className="underline-offset-4 hover:underline">
                        {settings.contact_phone}
                      </a>
                    </Channel>
                  )}
                  {whatsapp && settings.contact_whatsapp && (
                    <Channel icon={<MessageCircle aria-hidden="true" className="size-4" />}>
                      <a
                        href={whatsapp}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline-offset-4 hover:underline"
                      >
                        <span className="sr-only">WhatsApp: </span>
                        {settings.contact_whatsapp}
                        <span className="sr-only"> (abre em nova aba)</span>
                      </a>
                    </Channel>
                  )}
                  {(settings.address || location) && (
                    <Channel icon={<MapPin aria-hidden="true" className="size-4" />}>
                      {settings.address}
                      {settings.address && location && <br />}
                      {location}
                    </Channel>
                  )}
                </ul>
              </address>
            ) : editing ? (
              <div className="mt-3">
                <EditorHint>
                  Adicione e-mail, telefone, WhatsApp ou endereço oficiais no painel do rodapé. Campos vazios não
                  aparecem no site.
                </EditorHint>
              </div>
            ) : (
              <p className="mt-3 max-w-xs text-body-sm text-deep-muted">
                Os canais oficiais de contato serão informados em breve.
              </p>
            )}
          </div>

          {socialLinks.length > 0 ? (
            <div>
              <h3 className={titleClass}>{titles.social}</h3>
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
                {socialLinks.map((link) => (
                  <li key={link.id}>
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className={`${linkClass} capitalize`}>
                      <SocialIcon platform={link.platform} className="size-4 shrink-0" />
                      {link.label ?? link.platform}
                      <span className="sr-only"> (abre em nova aba)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            editing && <EditorHint>Redes sociais: cadastre os perfis oficiais em Redes sociais.</EditorHint>
          )}
        </section>
      </Container>

      <div className="border-t border-white/15">
        <Container className="flex flex-col gap-1 py-5 text-caption text-deep-muted sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-6">
          <p>
            © {new Date().getFullYear()} {settings.site_name}. Todos os direitos reservados.
          </p>
          {(institutional || settings.footer_note) && (
            <div className="flex flex-col gap-1 sm:text-right">
              {institutional && <p>{institutional}</p>}
              {settings.footer_note && <p className="whitespace-pre-line">{settings.footer_note}</p>}
            </div>
          )}
        </Container>
      </div>
    </footer>
  );
}
