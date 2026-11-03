import { Container } from "@/components/layout/container";

// Página temporária: apenas comprova que a aplicação está funcionando.
export default function Home() {
  return (
    <main className="flex flex-1 items-center py-24">
      <Container className="flex flex-col gap-6">
        <h1 className="text-5xl font-semibold tracking-tight">GeoLogar</h1>
        <p className="max-w-2xl text-xl text-muted">
          Rede de Pesquisa em Geociências — Recursos Naturais e Sustentabilidade
        </p>
        <p className="inline-flex w-fit items-center gap-2 rounded-full border border-border px-4 py-1.5 text-sm font-medium text-accent">
          <span aria-hidden="true" className="size-2 rounded-full bg-accent" />
          Plataforma em desenvolvimento
        </p>
      </Container>
    </main>
  );
}
