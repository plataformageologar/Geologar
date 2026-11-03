import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

type TextLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
};

/**
 * Link textual com seta. Links `http(s)` abrem no mesmo contexto, com seta
 * diagonal indicando destino externo.
 */
export function TextLink({ href, children, className }: TextLinkProps) {
  const external = /^https?:\/\//.test(href);
  const classes = cn(
    "inline-flex min-h-11 w-fit items-center gap-1 text-label text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary",
    className,
  );
  const Icon = external ? ArrowUpRight : ArrowRight;
  const content = (
    <>
      {children}
      <Icon aria-hidden="true" className="size-4 shrink-0" />
    </>
  );

  return external ? (
    <a href={href} className={classes}>
      {content}
    </a>
  ) : (
    <Link href={href} className={classes}>
      {content}
    </Link>
  );
}
