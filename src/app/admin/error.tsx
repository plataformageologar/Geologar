"use client";

import { Button } from "@/components/ui/button";

/**
 * Falha ao carregar a área administrativa (ex.: banco indisponível ao verificar a
 * autorização). O acesso nunca é concedido por falha; o detalhe fica nos logs.
 */
export default function AdminError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <main id="conteudo" className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-16">
      <h1 className="text-h2">Não foi possível carregar o painel</h1>
      <p className="text-body text-muted-foreground">
        Ocorreu uma falha temporária ao verificar o acesso ou buscar os dados. Tente novamente em
        instantes.
      </p>
      <div>
        <Button onClick={() => retry()}>Tentar novamente</Button>
      </div>
    </main>
  );
}
