import { LogOut } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { adminRoleLabels, type AdminRole } from "@/lib/auth/access";
import { signOut } from "@/lib/auth/actions";

import { AdminNavigation } from "./admin-navigation";

type AdminShellProps = {
  email: string | null;
  role: AdminRole;
  children: ReactNode;
};

/** Estrutura do painel: navegação, cabeçalho com a conta e área de conteúdo. */
export function AdminShell({ email, role, children }: AdminShellProps) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col lg:flex-row">
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-full bg-primary px-5 py-3 text-label text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Pular para o conteúdo
      </a>
      <AdminNavigation />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-border bg-surface">
          <div className="flex min-h-16 flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-6 lg:px-10">
            <p className="hidden text-label text-muted-foreground sm:block">Administração GeoLogar</p>
            <div className="flex min-w-0 flex-1 items-center justify-end gap-3 sm:flex-none">
              <div className="flex min-w-0 flex-col items-end">
                {email && (
                  <span className="max-w-[14rem] truncate text-body-sm font-semibold sm:max-w-xs" title={email}>
                    {email}
                  </span>
                )}
                <Badge tone={role === "admin" ? "blue" : "green"}>{adminRoleLabels[role]}</Badge>
              </div>
              <form action={signOut}>
                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-label text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  <LogOut aria-hidden="true" className="size-4" />
                  Sair
                </button>
              </form>
            </div>
          </div>
        </header>

        <main id="conteudo" tabIndex={-1} className="flex-1 px-4 py-8 focus:outline-none sm:px-6 lg:px-10 lg:py-10">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
