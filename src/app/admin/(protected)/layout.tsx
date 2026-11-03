import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminAccess } from "@/lib/auth/access";

/**
 * Estrutura do painel. A verificação aqui só define o que o cabeçalho
 * mostra: cada página repete `requireAdminAccess()`, pois o layout não é
 * renderizado novamente a cada navegação nem impede a página de renderizar.
 */
export default async function ProtectedAdminLayout({ children }: LayoutProps<"/admin">) {
  const access = await requireAdminAccess();

  return (
    <AdminShell email={access.email} role={access.role}>
      {children}
    </AdminShell>
  );
}
