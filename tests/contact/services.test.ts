import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { readContactConfig } from "../../src/lib/contact/config";
import { buildContactEmail, contactIdempotencyKey, escapeHtml, RESEND_EMAILS_URL, sendContactEmail } from "../../src/lib/contact/email";
import { validateContactValues } from "../../src/lib/contact/schema";
import { SITEVERIFY_URL, verifyTurnstile } from "../../src/lib/contact/turnstile";
import { fakeFetch, jsonResponse, NOW, siteverifyOk } from "./helpers";

const fullEnv = {
  CONTACT_FORM_ENABLED: "true",
  RESEND_API_KEY: "re_fake_key_123",
  CONTACT_FROM_EMAIL: "GeoLogar <contato@geologar.example.org>",
  CONTACT_TO_EMAIL: "equipe@geologar.example.org",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "0x4AAAAAAAfakeSiteKey",
  TURNSTILE_SECRET_KEY: "0x4AAAAAAAfakeSecret",
};

describe("readContactConfig", () => {
  it("fica pronto só com todas as variáveis válidas", () => {
    const { status, config } = readContactConfig(fullEnv);
    assert.equal(status, "ready");
    assert.deepEqual(config?.toEmails, ["equipe@geologar.example.org"]);
  });

  it("fica desativado sem CONTACT_FORM_ENABLED=true", () => {
    assert.equal(readContactConfig({ ...fullEnv, CONTACT_FORM_ENABLED: undefined }).status, "disabled");
    assert.equal(readContactConfig({ ...fullEnv, CONTACT_FORM_ENABLED: "1" }).status, "disabled");
  });

  it("fica incompleto quando falta qualquer variável", () => {
    for (const name of Object.keys(fullEnv).filter((key) => key !== "CONTACT_FORM_ENABLED")) {
      assert.equal(readContactConfig({ ...fullEnv, [name]: "" }).status, "incomplete", name);
    }
  });

  it("recusa remetente ou destinatário fora do formato", () => {
    assert.equal(readContactConfig({ ...fullEnv, CONTACT_FROM_EMAIL: "GeoLogar" }).status, "invalid");
    assert.equal(readContactConfig({ ...fullEnv, CONTACT_FROM_EMAIL: "A\r\nBcc: <x@example.org>" }).status, "invalid");
    assert.equal(readContactConfig({ ...fullEnv, CONTACT_TO_EMAIL: "equipe" }).status, "invalid");
    assert.equal(
      readContactConfig({ ...fullEnv, CONTACT_TO_EMAIL: "a@example.org, b@example.org" }).config?.toEmails.length,
      2,
    );
  });
});

describe("verifyTurnstile", () => {
  const base = { secret: "secret", token: "token", expectedHostname: "geologar.example.org", now: NOW };

  it("aceita token válido para o hostname e a ação esperados", async () => {
    const { impl, calls } = fakeFetch({ [SITEVERIFY_URL]: () => siteverifyOk() });
    assert.deepEqual(await verifyTurnstile({ ...base, fetchImpl: impl }), { ok: true });
    const sent = new URLSearchParams(String(calls[0].init.body));
    assert.equal(sent.get("secret"), "secret");
    assert.equal(sent.get("response"), "token");
  });

  const failures: Array<[string, () => Response, string]> = [
    ["token inválido", () => jsonResponse({ success: false, "error-codes": ["invalid-input-response"] }), "invalid-token"],
    ["token reutilizado ou expirado", () => jsonResponse({ success: false, "error-codes": ["timeout-or-duplicate"] }), "expired-or-duplicate"],
    ["hostname diferente", () => siteverifyOk({ hostname: "outro.example.com" }), "hostname-mismatch"],
    ["ação diferente", () => siteverifyOk({ action: "login" }), "action-mismatch"],
    ["desafio antigo", () => siteverifyOk({ challenge_ts: new Date(NOW - 6 * 60_000).toISOString() }), "stale"],
    ["chave de teste fora do localhost", () => jsonResponse({ success: true, hostname: "example.com", metadata: { result_with_testing_key: true } }), "testing-key"],
    ["siteverify fora do ar", () => new Response("erro", { status: 500 }), "unavailable"],
    ["secret inválido", () => jsonResponse({ success: false, "error-codes": ["invalid-input-secret"] }), "unavailable"],
  ];
  for (const [label, response, code] of failures) {
    it(`recusa: ${label}`, async () => {
      const { impl } = fakeFetch({ [SITEVERIFY_URL]: response });
      assert.deepEqual(await verifyTurnstile({ ...base, fetchImpl: impl }), { ok: false, code });
    });
  }

  it("aceita chave de teste somente em localhost", async () => {
    const { impl } = fakeFetch({
      [SITEVERIFY_URL]: () => jsonResponse({ success: true, hostname: "example.com", metadata: { result_with_testing_key: true } }),
    });
    assert.deepEqual(await verifyTurnstile({ ...base, expectedHostname: "localhost", fetchImpl: impl }), { ok: true });
  });

  it("trata erro de rede como indisponível", async () => {
    const impl = (async () => {
      throw new TypeError("network");
    }) as typeof fetch;
    assert.deepEqual(await verifyTurnstile({ ...base, fetchImpl: impl }), { ok: false, code: "unavailable" });
  });
});

describe("e-mail", () => {
  const { data } = validateContactValues({
    name: "Zoé <script>alert(1)</script>",
    email: "zoe@example.com",
    subject: "publicacoes",
    message: "Primeira linha com acentuação: ção, ê, ü\nSegunda <b>linha</b> & \"aspas\"",
  });
  assert.ok(data);
  const email = buildContactEmail(data, new Date(NOW));

  it("monta o assunto padrão", () => {
    assert.equal(email.subject, "[GeoLogar] Novo contato: Publicações científicas");
  });

  it("escapa o conteúdo do visitante no HTML", () => {
    assert.ok(!email.html.includes("<script>"));
    assert.ok(email.html.includes("Zoé &lt;script&gt;alert(1)&lt;/script&gt;"));
    assert.ok(email.html.includes("Segunda &lt;b&gt;linha&lt;/b&gt; &amp; &quot;aspas&quot;"));
    assert.ok(email.html.includes("ção, ê, ü<br>Segunda"));
    assert.equal(escapeHtml(`<a href='x'>`), "&lt;a href=&#39;x&#39;&gt;");
  });

  it("mantém texto puro com acentos e quebras de linha", () => {
    assert.ok(email.text.includes("Primeira linha com acentuação: ção, ê, ü\nSegunda <b>linha</b>"));
    assert.ok(email.text.includes("E-mail: zoe@example.com"));
  });

  it("gera chave de idempotência estável por conteúdo", async () => {
    const id = "3f2c8a51-6b7d-4e2f-9a10-1c2d3e4f5a6b";
    const first = await contactIdempotencyKey(id, data);
    assert.equal(first, await contactIdempotencyKey(id, data));
    assert.notEqual(first, await contactIdempotencyKey(id, { ...data, message: "outra" }));
    assert.ok(first.length <= 256);
  });

  it("envia com remetente configurado e reply_to do visitante", async () => {
    const { impl, calls } = fakeFetch({ [RESEND_EMAILS_URL]: () => jsonResponse({ id: "email-id" }) });
    const result = await sendContactEmail({
      apiKey: "re_fake",
      from: "GeoLogar <contato@geologar.example.org>",
      to: ["equipe@geologar.example.org"],
      replyTo: "zoe@example.com",
      email,
      idempotencyKey: "chave-1",
      fetchImpl: impl,
    });
    assert.deepEqual(result, { ok: true });
    const headers = calls[0].init.headers as Record<string, string>;
    assert.equal(headers.Authorization, "Bearer re_fake");
    assert.equal(headers["Idempotency-Key"], "chave-1");
    const body = JSON.parse(String(calls[0].init.body));
    assert.equal(body.from, "GeoLogar <contato@geologar.example.org>");
    assert.deepEqual(body.to, ["equipe@geologar.example.org"]);
    assert.equal(body.reply_to, "zoe@example.com");
    assert.equal(body.subject, email.subject);
    assert.ok(body.text && body.html);
  });

  const providerFailures: Array<[number, string]> = [
    [401, "provider-auth"],
    [403, "provider-auth"],
    [422, "provider-rejected"],
    [409, "provider-rejected"],
    [429, "provider-rate-limited"],
    [500, "provider-unavailable"],
  ];
  for (const [status, code] of providerFailures) {
    it(`trata HTTP ${status} do provedor como falha (${code})`, async () => {
      const { impl } = fakeFetch({ [RESEND_EMAILS_URL]: () => jsonResponse({ name: "error" }, status) });
      const result = await sendContactEmail({
        apiKey: "k",
        from: "a@example.org",
        to: ["b@example.org"],
        replyTo: "c@example.com",
        email,
        idempotencyKey: "k",
        fetchImpl: impl,
      });
      assert.deepEqual(result, { ok: false, code, status });
    });
  }
});
