"use client";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

/**
 * Falha ao carregar o conteúdo de uma página interna (ex.: banco
 * indisponível). O detalhe fica apenas nos logs do servidor; cabeçalho e
 * rodapé continuam visíveis, pois o layout raiz não é afetado.
 */
export default function Error({ retry }: { error: unknown; retry: () => void }) {
  return (
    <Container className="section-y">
      <div className="flex max-w-2xl flex-col gap-5">
        <h1 className="text-h1">Não foi possível carregar esta página</h1>
        <p className="text-body-lg text-muted-foreground">
          Ocorreu uma falha temporária ao buscar o conteúdo. Tente novamente em instantes.
        </p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button size="lg" onClick={() => retry()}>
            Tentar novamente
          </Button>
          <Button href="/" variant="secondary" size="lg">
            Voltar para o início
          </Button>
        </div>
      </div>
    </Container>
  );
}
