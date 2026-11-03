import Image from "next/image";
import Link from "next/link";
import { cacheLife } from "next/cache";
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";

import logo from "@/assets/brand/geologar-logo-circle.png";
import { Container } from "@/components/ui/container";
import type { NavItem, SiteSettings, SocialLink } from "@/types/content";

type FooterProps = {
  settings: SiteSettings;
  navigation: NavItem[];
  socialLinks: SocialLink[];
};

async function CurrentYear() {
  "use cache";
  cacheLife("days");
  return <>{new Date().getFullYear()}</>;
}

export function Footer({ settings, navigation, socialLinks }: FooterProps) {
  const location = [settings.city, settings.state, settings.country]
    .filter(Boolean)
    .join(" — ");
  const hasContact = Boolean(
    settings.contact_email || settings.contact_phone || settings.address || location,
  );

  return (
    <footer className="on-dark bg-deep text-deep-foreground">
      <Container className="grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-12 lg:py-20">
        <div className="flex flex-col gap-5 lg:col-span-5">
          <Image
            src={logo}
            alt={settings.site_name}
            sizes="96px"
            className="size-24"
          />
          {settings.institutional_name && (
            <p className="max-w-sm text-body-sm text-deep-muted">
              {settings.institutional_name}
            </p>
          )}
        </div>

        <nav aria-labelledby="footer-nav-title" className="lg:col-span-3">
          <h2 id="footer-nav-title" className="font-sans text-label uppercase tracking-[0.12em] text-deep-muted">
            Navegação
          </h2>
          <ul className="mt-4 flex flex-col">
            {navigation.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex min-h-10 items-center text-body-sm text-deep-foreground underline-offset-4 hover:underline"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {(hasContact || socialLinks.length > 0) && (
          <div className="flex flex-col gap-8 lg:col-span-4">
            {hasContact && (
              <div>
                <h2 className="font-sans text-label uppercase tracking-[0.12em] text-deep-muted">
                  Contato
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
                  Redes sociais
                </h2>
                <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
                  {socialLinks.map((link) => (
                    <li key={link.id}>
                      <a
                        href={link.url}
                        className="inline-flex min-h-10 items-center gap-1.5 text-body-sm capitalize underline-offset-4 hover:underline"
                      >
                        {link.label ?? link.platform}
                        <ArrowUpRight aria-hidden="true" className="size-4" />
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
        <Container className="py-6 text-caption text-deep-muted">
          <p>
            © <CurrentYear /> {settings.site_name}. Todos os direitos reservados.
          </p>
        </Container>
      </div>
    </footer>
  );
}
