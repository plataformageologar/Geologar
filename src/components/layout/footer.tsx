import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Lock, Mail, MapPin, Phone } from "lucide-react";

import logo from "@/assets/brand/geologar-logo-circle.png";
import headerLogo from "@/assets/brand/geologar-logo.png";
import { Container } from "@/components/ui/container";
import { FOOTER_DEFAULT_TITLES } from "@/lib/admin/site-settings";
import { resolveImageSrc } from "@/lib/queries/shared";
import type { SiteNavItem } from "@/lib/site/navigation";
import { safeExternalUrl } from "@/lib/utils/format";
import type { SiteSettings, SocialLink } from "@/types/content";

type FooterProps = {
  settings: SiteSettings;
  navigation: SiteNavItem[];
  socialLinks: SocialLink[];
};

/**
 * Logotipo do rodapé conforme Configurações: o oficial (arquivo do código),
 * o mesmo do cabeçalho ou um próprio da biblioteca. Sem imagem válida, volta
 * ao arquivo oficial — que nunca é apagado.
 */
function FooterLogo({ settings }: { settings: SiteSettings }) {
  const alt = settings.site_name;
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
        alt={alt}
        width={320}
        height={160}
        sizes="240px"
        className="h-24 w-auto max-w-[15rem] object-contain object-left"
      />
    );
  }
  if (settings.footer_logo_mode === "institutional") {
    return <Image src={headerLogo} alt={alt} sizes="160px" className="h-16 w-auto rounded-lg bg-white p-2" />;
  }
  return <Image src={logo} alt={alt} sizes="96px" className="size-24" />;
}

export function Footer({ settings, navigation, socialLinks: allSocialLinks }: FooterProps) {
  const titles = {
    nav: settings.footer_nav_title ?? FOOTER_DEFAULT_TITLES.footer_nav_title,
    contact: settings.footer_contact_title ?? FOOTER_DEFAULT_TITLES.footer_contact_title,
    social: settings.footer_social_title ?? FOOTER_DEFAULT_TITLES.footer_social_title,
  };
  const description = settings.footer_description ?? settings.institutional_name;
  // Somente links http(s) válidos (a constraint do banco já exige o esquema).
  const socialLinks = allSocialLinks.flatMap((link) => {
    const url = safeExternalUrl(link.url);
    return url ? [{ ...link, url }] : [];
  });
  const location = [settings.city, settings.state, settings.country]
    .filter(Boolean)
    .join(" — ");
  const hasContact = Boolean(
    settings.contact_email || settings.contact_phone || settings.address || location,
  );

  return (
    <footer className="on-dark relative isolate overflow-hidden bg-deep text-deep-foreground">
      {/* Textura de curvas de nível (sem imagem com texto embutido). */}
      <div aria-hidden="true" className="topo-pattern absolute inset-0 -z-10 text-white/[0.05]" />
      {/* Faixa em camadas (terra, verde, azul): referência às rochas estratificadas. */}
      <div aria-hidden="true" className="h-1.5 bg-gradient-to-r from-earth via-secondary to-primary" />
      <Container className="grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-12 lg:py-20">
        <div className="flex flex-col gap-5 lg:col-span-5">
          <FooterLogo settings={settings} />
          {description && <p className="max-w-sm whitespace-pre-line text-body-sm text-deep-muted">{description}</p>}
        </div>

        <nav aria-labelledby="footer-nav-title" className="lg:col-span-3">
          <h2 id="footer-nav-title" className="font-sans text-label uppercase tracking-[0.12em] text-deep-muted">
            {titles.nav}
          </h2>
          <ul className="mt-4 flex flex-col">
            {navigation.map((item) => (
              <li key={`${item.href}-${item.label}`}>
                <Link
                  href={item.href}
                  className="inline-flex min-h-10 items-center gap-1.5 text-body-sm text-deep-foreground underline-offset-4 hover:underline"
                  {...(item.openInNewTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                >
                  {item.label}
                  {item.openInNewTab && (
                    <>
                      <ArrowUpRight aria-hidden="true" className="size-4" />
                      <span className="sr-only"> (abre em nova aba)</span>
                    </>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {!hasContact && socialLinks.length === 0 && (
          <div className="flex flex-col gap-4 lg:col-span-4">
            <h2 className="font-sans text-label uppercase tracking-[0.12em] text-deep-muted">{titles.contact}</h2>
            <p className="max-w-sm text-body-sm text-deep-muted">
              Para conhecer a rede, propor projetos ou parcerias, fale com a equipe GeoLogar.
            </p>
            <Link
              href="/contato"
              className="inline-flex min-h-10 w-fit items-center gap-1.5 text-body-sm text-deep-foreground underline underline-offset-4 decoration-deep-muted/60 hover:decoration-deep-foreground"
            >
              Página de contato
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        )}

        {(hasContact || socialLinks.length > 0) && (
          <div className="flex flex-col gap-8 lg:col-span-4">
            {hasContact && (
              <div>
                <h2 className="font-sans text-label uppercase tracking-[0.12em] text-deep-muted">
                  {titles.contact}
                </h2>
                <address className="mt-4 flex flex-col gap-3 text-body-sm not-italic">
                  {settings.contact_email && (
                    <a
                      href={`mailto:${settings.contact_email}`}
                      className="inline-flex items-center gap-3 underline-offset-4 hover:underline"
                    >
                      <Mail aria-hidden="true" className="size-4 shrink-0" />
                      {settings.contact_email}
                    </a>
                  )}
                  {settings.contact_phone && (
                    <a
                      href={`tel:${settings.contact_phone.replace(/[^\d+]/g, "")}`}
                      className="inline-flex items-center gap-3 underline-offset-4 hover:underline"
                    >
                      <Phone aria-hidden="true" className="size-4 shrink-0" />
                      {settings.contact_phone}
                    </a>
                  )}
                  {(settings.address || location) && (
                    <p className="flex gap-3">
                      <MapPin aria-hidden="true" className="mt-1 size-4 shrink-0" />
                      <span>
                        {settings.address}
                        {settings.address && location && <br />}
                        {location}
                      </span>
                    </p>
                  )}
                </address>
              </div>
            )}

            {socialLinks.length > 0 && (
              <div>
                <h2 className="font-sans text-label uppercase tracking-[0.12em] text-deep-muted">
                  {titles.social}
                </h2>
                <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
                  {socialLinks.map((link) => (
                    <li key={link.id}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-10 items-center gap-1.5 text-body-sm capitalize underline-offset-4 hover:underline"
                      >
                        {link.label ?? link.platform}
                        <ArrowUpRight aria-hidden="true" className="size-4" />
                        <span className="sr-only"> (abre em nova aba)</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Container>

      <div className="border-t border-white/15">
        <Container className="flex flex-col gap-2 py-6 text-caption text-deep-muted sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <p>
              © {new Date().getFullYear()} {settings.site_name}. Todos os direitos reservados.
            </p>
            {settings.footer_note && <p className="whitespace-pre-line">{settings.footer_note}</p>}
          </div>
          <Link
            href="/admin/login"
            className="inline-flex min-h-10 w-fit items-center gap-1.5 underline-offset-4 hover:text-deep-foreground hover:underline"
          >
            <Lock aria-hidden="true" className="size-3.5" />
            Área restrita
          </Link>
        </Container>
      </div>
    </footer>
  );
}
