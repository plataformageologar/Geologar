import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

/** Conteúdo da página 404 (rotas públicas e endereços inexistentes). */
export function NotFoundContent() {
  return (
    <Container className="section-y">
      <div className="flex max-w-2xl flex-col gap-5">
        <p className="flex items-center gap-3 text-label uppercase tracking-[0.12em] text-earth">
          <span aria-hidden="true" className="h-px w-8 bg-current" />
          Erro 404
        </p>
        <h1 className="text-h1">Página não encontrada</h1>
        <p className="text-body-lg text-muted-foreground">
          O endereço acessado não existe ou o conteúdo não está mais disponível.
        </p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button href="/" size="lg" withArrow>
            Voltar para o início
          </Button>
          <Button href="/pesquisa" variant="secondary" size="lg">
            Ver linhas de pesquisa
          </Button>
        </div>
      </div>
    </Container>
  );
}
