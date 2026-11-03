import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthCard } from "@/components/admin/auth-card";
import { FormMessage } from "@/components/admin/form-controls";
import { LoginForm } from "@/components/admin/login-form";
import { getAdminAccess } from "@/lib/auth/access";
import { safeAdminPath } from "@/lib/auth/redirect";
import { firstParam } from "@/lib/utils/search-params";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Entrar",
};

// Avisos vindos de redirecionamentos (valores fixos; nada é exibido a partir da URL).
const notices = {
  "senha=redefinida": { tone: "success", text: "Senha redefinida. Entre com a nova senha." },
  "saida=1": { tone: "info", text: "Sessão encerrada com segurança." },
  "erro=link-invalido": {
    tone: "error",
    text: "O link é inválido ou expirou. Solicite um novo link de recuperação.",
  },
} as const;

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  const query = await searchParams;
  const nextParam = firstParam(query.next);
  const next = nextParam ? safeAdminPath(nextParam) : undefined;

  // Sessão administrativa válida: vai direto ao painel. Conta autenticada
  // sem permissão: tela de acesso negado (com opção de sair).
  const access = await getAdminAccess();
  if (access.status === "authorized") redirect(next ?? "/admin");
  if (access.status === "forbidden") redirect("/admin/acesso-negado");

  const notice =
    (firstParam(query.senha) === "redefinida" && notices["senha=redefinida"]) ||
    (firstParam(query.saida) === "1" && notices["saida=1"]) ||
    (firstParam(query.erro) === "link-invalido" && notices["erro=link-invalido"]) ||
    null;

  return (
    <AuthCard
      title="Entrar"
      description="Acesso exclusivo da equipe responsável pelo conteúdo do portal GeoLogar."
    >
      <div className="flex flex-col gap-5">
        {notice && <FormMessage tone={notice.tone}>{notice.text}</FormMessage>}
        <LoginForm next={next} />
      </div>
    </AuthCard>
  );
}
