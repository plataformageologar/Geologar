/**
 * Formulário de contato DESATIVADO por decisão de escopo (o briefing o trata
 * como opcional; o contato institucional fica no rodapé, em /#contato).
 *
 * Este endpoint não lê variáveis de ambiente, não chama o Turnstile nem o
 * Resend e não processa o corpo da requisição: qualquer envio recebe 404.
 * O código do formulário e seus testes continuam em src/lib/contact e
 * src/components/contact para uma eventual reativação (docs/contact-form.md).
 */
export const dynamic = "force-dynamic";

export function POST(): Response {
  return Response.json(
    { error: "not_found", message: "O formulário de contato não está disponível." },
    { status: 404, headers: { "Cache-Control": "no-store" } },
  );
}
