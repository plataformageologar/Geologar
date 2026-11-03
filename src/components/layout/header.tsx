import Link from "next/link";

import { Container } from "@/components/ui/container";
import type { NavItem } from "@/types/content";

import { MobileMenu } from "./mobile-menu";
import { SiteLogo } from "./site-logo";

type HeaderProps = {
  navigation: NavItem[];
  institutionalName: string | null;
};

export function Header({ navigation, institutionalName }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface">
      <Container className="relative flex h-[var(--header-height)] items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <SiteLogo />
          {institutionalName && (
            <p className="hidden max-w-[15rem] border-l border-border pl-4 text-caption leading-snug text-muted-foreground xl:block">
              {institutionalName}
            </p>
          )}
        </div>

        <nav aria-label="Principal" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {navigation.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex min-h-11 items-center rounded-full px-4 text-label text-foreground transition-colors hover:bg-surface-muted hover:text-primary"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <MobileMenu navigation={navigation} />
      </Container>
    </header>
  );
}
