import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import logo from "@/assets/brand/geologar-logo.png";

type AuthCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
  /** Links abaixo do cartão (ex.: voltar ao login). */
  footer?: ReactNode;
};

/**
 * Tela centralizada das páginas de acesso (login, recuperação de senha e
 * acesso negado): logotipo, título (`h1`), conteúdo e retorno ao site.
 */
export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <main
      id="conteudo"
      className="relative isolate flex flex-1 items-center justify-center bg-surface-muted px-4 py-12 sm:py-16"
    >
      <div aria-hidden="true" className="topo-pattern absolute inset-0 -z-10 text-primary/[0.06]" />
      <div className="flex w-full max-w-md flex-col gap-6">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-[0_12px_32px_-24px_rgb(15_37_55/0.45)] sm:p-8">
          <Link href="/" className="inline-flex rounded-sm">
            <Image src={logo} alt="GeoLogar — página inicial" priority sizes="56px" className="h-12 w-auto" />
          </Link>
          <p className="mt-6 flex items-center gap-3 text-label uppercase tracking-[0.12em] text-earth">
            <span aria-hidden="true" className="h-px w-8 bg-current" />
            Área administrativa
          </p>
          <h1 className="mt-3 text-h2">{title}</h1>
          {description && <p className="mt-2 text-body-sm text-muted-foreground">{description}</p>}
          <div className="mt-6">{children}</div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-1">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-1.5 text-body-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Voltar ao site
          </Link>
          {footer}
        </div>
      </div>
    </main>
  );
}
