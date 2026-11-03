import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "ghost";
type Surface = "light" | "dark";
type Size = "md" | "lg";

type BaseProps = {
  children: ReactNode;
  variant?: Variant;
  /** Fundo sobre o qual o botão aparece. */
  surface?: Surface;
  size?: Size;
  /** Exibe uma seta após o texto. */
  withArrow?: boolean;
  className?: string;
};

type ButtonAsLink = BaseProps & { href: string };
type ButtonAsButton = BaseProps &
  Omit<ComponentProps<"button">, keyof BaseProps> & { href?: undefined };

const base =
  "group inline-flex items-center justify-center gap-2 rounded-full font-semibold " +
  "transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50";

const sizes: Record<Size, string> = {
  md: "min-h-11 px-5 text-label",
  lg: "min-h-12 px-6 text-base",
};

const variants: Record<Surface, Record<Variant, string>> = {
  light: {
    primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
    secondary:
      "border border-primary text-primary hover:bg-primary-soft",
    ghost: "text-primary hover:bg-primary-soft",
  },
  dark: {
    primary: "bg-deep-foreground text-deep hover:bg-white",
    secondary:
      "border border-deep-foreground/70 text-deep-foreground hover:border-deep-foreground hover:bg-white/10",
    ghost: "text-deep-foreground hover:bg-white/10",
  },
};

/**
 * Botão padrão. Com `href`, renderiza um link (semântica de navegação);
 * sem `href`, um `<button>`.
 */
export function Button(props: ButtonAsLink | ButtonAsButton) {
  const {
    children,
    variant = "primary",
    surface = "light",
    size = "md",
    withArrow = false,
    className,
    ...rest
  } = props;

  const classes = cn(base, sizes[size], variants[surface][variant], className);
  const content = (
    <>
      {children}
      {withArrow && (
        <ArrowRight
          aria-hidden="true"
          className="size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
        />
      )}
    </>
  );

  if (rest.href !== undefined) {
    const { href } = rest;
    const isExternal = /^https?:\/\//.test(href);

    return isExternal ? (
      <a href={href} className={classes}>
        {content}
      </a>
    ) : (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  const { type = "button", ...buttonProps } = rest;

  return (
    <button type={type} className={classes} {...buttonProps}>
      {content}
    </button>
  );
}
