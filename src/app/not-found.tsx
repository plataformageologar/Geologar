import type { Metadata } from "next";

import { NotFoundContent } from "@/components/layout/not-found-content";
import { PublicShell } from "@/components/layout/public-shell";

export const metadata: Metadata = {
  title: "Página não encontrada",
};

// Endereços inexistentes ficam fora dos grupos de rotas: a página inclui a
// estrutura do site público, que não está no layout raiz.
export default function NotFound() {
  return (
    <PublicShell>
      <NotFoundContent />
    </PublicShell>
  );
}
