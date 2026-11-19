import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { RESEND_EMAILS_URL } from "../../src/lib/contact/email";
import { handleContactRequest, type ContactLogEvent, type RateLimiter } from "../../src/lib/contact/handler";
import { CONTACT_BODY_MAX_BYTES } from "../../src/lib/contact/schema";
import { SITEVERIFY_URL } from "../../src/lib/contact/turnstile";
import { config, contactRequest, fakeFetch, jsonResponse, NOW, ORIGIN, siteverifyOk, validPayload } from "./helpers";

function setup(
  options: {
    siteverify?: () => Response;
    resend?: () => Response;
    rateLimiter?: RateLimiter | null;
    withConfig?: boolean;
  } = {},
) {
  const { impl, calls } = fakeFetch({
    [SITEVERIFY_URL]: options.siteverify ?? (() => siteverifyOk()),
    [RESEND_EMAILS_URL]: options.resend ?? (() => jsonResponse({ id: "email-id" })),
  });
  const logs: ContactLogEvent[] = [];
  const deps = {
    config: options.withConfig === false ? null : config,
    rateLimiter: options.rateLimiter === undefined ? null : options.rateLimiter,
    fetchImpl: impl,
    now: () => NOW,
    log: (entry: ContactLogEvent) => logs.push(entry),
  };
  return {
    calls,
    logs,
    send: (request: Request) => handleContactRequest(request, deps),
  };
}

async function body(response: Response) {
  return (await response.json()) as { status: string; code?: string; message: string; fieldErrors?: Record<string, string> };
}

describe("POST /api/contact", () => {
  it("envia quando tudo é válido (sucesso só após o provedor aceitar)", async () => {
    const { send, calls, logs } = setup();
    const response = await send(contactRequest(validPayload()));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await body(response), {
      status: "success",
      message: "Mensagem enviada! Entraremos em contato pelo e-mail informado.",
    });
    assert.deepEqual(calls.map((call) => call.url), [SITEVERIFY_URL, RESEND_EMAILS_URL]);
    const email = JSON.parse(String(calls[1].init.body));
    assert.equal(email.reply_to, "maria@example.com");
    assert.equal(email.from, config.fromEmail);
    assert.ok(email.text.includes("Gostaria de saber mais sobre cooperação.\n\nAtenciosamente."));
    assert.deepEqual(logs, [{ event: "contact_sent" }]);
  });

  it("repete a mesma chave de idempotência ao reenviar o mesmo conteúdo", async () => {
    const { send, calls } = setup();
    await send(contactRequest(validPayload()));
    await send(contactRequest(validPayload()));
    const keys = calls
      .filter((call) => call.url === RESEND_EMAILS_URL)
      .map((call) => (call.init.headers as Record<string, string>)["Idempotency-Key"]);
    assert.equal(keys.length, 2);
    assert.equal(keys[0], keys[1]);
  });

  it("recusa quando o formulário não está configurado", async () => {
    const { send, calls } = setup({ withConfig: false });
    const response = await send(contactRequest(validPayload()));
    assert.equal(response.status, 503);
    assert.equal(calls.length, 0);
  });

  it("exige requisição da mesma origem", async () => {
    const { send, calls } = setup();
    assert.equal((await send(contactRequest(validPayload(), { origin: "" }))).status, 403);
    assert.equal((await send(contactRequest(validPayload(), { origin: "https://ataque.example.com" }))).status, 403);
    assert.equal(
      (await send(contactRequest(validPayload(), { headers: { "sec-fetch-site": "cross-site" } }))).status,
      403,
    );
    assert.equal(calls.length, 0);
  });

  it("aceita somente JSON", async () => {
    const { send } = setup();
    const form = contactRequest("name=Ana", { contentType: "application/x-www-form-urlencoded" });
    assert.equal((await send(form)).status, 415);
  });

  it("recusa corpo grande, com ou sem Content-Length", async () => {
    const { send, calls } = setup();
    const big = JSON.stringify(validPayload({ message: "x".repeat(CONTACT_BODY_MAX_BYTES) }));
    assert.equal((await send(contactRequest(big))).status, 413);

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const chunk = new TextEncoder().encode("x".repeat(8 * 1024));
        for (let i = 0; i < 6; i++) controller.enqueue(chunk);
        controller.close();
      },
    });
    const chunked = new Request(`${ORIGIN}/api/contact`, {
      method: "POST",
      headers: { origin: ORIGIN, "content-type": "application/json" },
      body: stream,
      duplex: "half",
    } as RequestInit & { duplex: "half" });
    assert.equal((await send(chunked)).status, 413);
    assert.equal(calls.length, 0);
  });

  it("recusa JSON inválido e campos internos manipulados", async () => {
    const { send, calls } = setup();
    assert.equal((await send(contactRequest("{nome:"))).status, 400);
    assert.equal((await send(contactRequest(validPayload({ to: "outro@example.com" })))).status, 400);
    assert.equal((await send(contactRequest(validPayload({ replyTo: "x@example.com" })))).status, 400);
    assert.equal((await send(contactRequest(validPayload({ submissionId: "1" })))).status, 400);
    assert.equal(calls.length, 0);
  });

  it("devolve erros por campo sem chamar serviços externos", async () => {
    const { send, calls } = setup();
    const response = await send(contactRequest(validPayload({ name: "", email: "x", message: " " })));
    assert.equal(response.status, 422);
    const result = await body(response);
    assert.equal(result.code, "validation");
    assert.deepEqual(Object.keys(result.fieldErrors ?? {}).sort(), ["email", "message", "name"]);
    assert.equal(calls.length, 0);
  });

  it("descarta envio com honeypot preenchido", async () => {
    const { send, calls } = setup();
    const response = await send(contactRequest(validPayload({ website: "spam" })));
    assert.equal(response.status, 400);
    assert.equal((await body(response)).message, "Não foi possível validar o envio. Tente novamente.");
    assert.equal(calls.length, 0);
  });

  it("aplica o limite de envios antes do Turnstile", async () => {
    const keys: string[] = [];
    const { send, calls } = setup({
      rateLimiter: {
        limit: async ({ key }) => {
          keys.push(key);
          return { success: false };
        },
      },
    });
    const response = await send(contactRequest(validPayload(), { headers: { "cf-connecting-ip": "203.0.113.7" } }));
    assert.equal(response.status, 429);
    assert.equal((await body(response)).code, "rate-limited");
    assert.equal(calls.length, 0);
    assert.match(keys[0], /^contact:[0-9a-f]{32}$/);
    assert.ok(!keys[0].includes("203.0.113.7"));
  });

  it("segue protegido pelo Turnstile se o contador falhar", async () => {
    const { send } = setup({
      rateLimiter: {
        limit: async () => {
          throw new Error("indisponível");
        },
      },
    });
    assert.equal((await send(contactRequest(validPayload()))).status, 200);
  });

  it("recusa token do Turnstile inválido ou reutilizado sem enviar e-mail", async () => {
    for (const codes of [["invalid-input-response"], ["timeout-or-duplicate"]]) {
      const { send, calls } = setup({ siteverify: () => jsonResponse({ success: false, "error-codes": codes }) });
      const response = await send(contactRequest(validPayload()));
      assert.equal(response.status, 400);
      const result = await body(response);
      assert.equal(result.code, "verification");
      assert.equal(result.message, "Não foi possível validar o envio. Tente novamente.");
      assert.deepEqual(calls.map((call) => call.url), [SITEVERIFY_URL]);
    }
  });

  it("recusa token emitido para outro hostname", async () => {
    const { send } = setup({ siteverify: () => siteverifyOk({ hostname: "outro.example.com" }) });
    assert.equal((await send(contactRequest(validPayload()))).status, 400);
  });

  it("informa falha genérica quando o provedor recusa", async () => {
    const { send, logs } = setup({ resend: () => jsonResponse({ name: "validation_error" }, 422) });
    const response = await send(contactRequest(validPayload()));
    assert.equal(response.status, 502);
    assert.equal(
      (await body(response)).message,
      "Não foi possível enviar sua mensagem agora. Tente novamente ou utilize os canais de contato disponíveis.",
    );
    assert.deepEqual(logs, [{ event: "contact_rejected", code: "provider-rejected", status: 502 }]);
  });

  it("não registra dados pessoais, tokens ou chaves nos logs", async () => {
    const { send, logs } = setup({ resend: () => jsonResponse({}, 500) });
    await send(contactRequest(validPayload(), { headers: { "cf-connecting-ip": "203.0.113.7" } }));
    await send(contactRequest(validPayload({ email: "x" })));
    const serialized = JSON.stringify(logs);
    for (const secret of ["Maria", "maria@example.com", "cooperação", "token.valido", "203.0.113.7", config.resendApiKey, config.turnstileSecretKey]) {
      assert.ok(!serialized.includes(secret), secret);
    }
  });
});
