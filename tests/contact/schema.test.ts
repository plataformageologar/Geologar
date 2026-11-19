import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CONTACT_LIMITS, parseContactPayload, validateContactValues } from "../../src/lib/contact/schema";
import { SUBMISSION_ID, validPayload } from "./helpers";

const values = { name: "Ana", email: "ana@example.com", subject: "pesquisa", message: "Olá" };

describe("validateContactValues", () => {
  it("aceita valores válidos e preserva acentos e quebras de linha", () => {
    const { errors, data } = validateContactValues({
      ...values,
      name: "  João   Ávila  ",
      message: "Linha 1\r\nLinha 2 — ação\r\n\r\nFim",
    });
    assert.deepEqual(errors, {});
    assert.equal(data?.name, "João Ávila");
    assert.equal(data?.message, "Linha 1\nLinha 2 — ação\n\nFim");
    assert.equal(data?.subjectLabel, "Pesquisa e projetos");
  });

  it("recusa campos vazios ou só com espaços", () => {
    const { errors, data } = validateContactValues({ name: " ", email: "", subject: "", message: "\n \n" });
    assert.equal(data, null);
    assert.deepEqual(Object.keys(errors).sort(), ["email", "message", "name", "subject"]);
  });

  it("aplica os limites de tamanho", () => {
    const { errors } = validateContactValues({
      name: "a".repeat(CONTACT_LIMITS.name + 1),
      email: `${"a".repeat(64)}@${"b".repeat(186)}.com`,
      subject: "pesquisa",
      message: "m".repeat(CONTACT_LIMITS.message + 1),
    });
    assert.match(errors.name ?? "", /120/);
    assert.match(errors.email ?? "", /254/);
    assert.match(errors.message ?? "", /5\.000/);

    const atLimit = validateContactValues({
      ...values,
      name: "a".repeat(CONTACT_LIMITS.name),
      message: "m".repeat(CONTACT_LIMITS.message),
    });
    assert.deepEqual(atLimit.errors, {});
  });

  it("recusa e-mail inválido", () => {
    for (const email of ["ana", "ana@", "@example.com", "ana@example", "ana @example.com", "ana@exa..mple.com", "a<b>@example.com"]) {
      assert.ok(validateContactValues({ ...values, email }).errors.email, email);
    }
  });

  it("aceita somente assuntos da lista", () => {
    assert.ok(validateContactValues({ ...values, subject: "Assunto livre" }).errors.subject);
    assert.ok(validateContactValues({ ...values, subject: "__proto__" }).errors.subject);
  });

  it("bloqueia quebras de linha em nome e e-mail (injeção de cabeçalho)", () => {
    assert.ok(validateContactValues({ ...values, name: "Ana\r\nBcc: x@example.com" }).errors.name);
    assert.ok(validateContactValues({ ...values, email: "ana@example.com\r\nBcc: x@example.com" }).errors.email);
    assert.ok(validateContactValues({ ...values, message: "texto\u0000oculto" }).errors.message);
  });
});

describe("parseContactPayload", () => {
  it("aceita o payload completo", () => {
    const parsed = parseContactPayload(validPayload());
    assert.equal(parsed.kind, "ok");
    if (parsed.kind === "ok") assert.equal(parsed.submissionId, SUBMISSION_ID);
  });

  it("recusa estruturas inesperadas", () => {
    const { website, ...withoutHoneypot } = validPayload();
    void website;
    const cases: unknown[] = [
      null,
      [],
      "texto",
      validPayload({ role: "admin" }),
      withoutHoneypot,
      validPayload({ name: 123 }),
      validPayload({ message: ["a"] }),
      validPayload({ submissionId: "não-é-uuid" }),
      validPayload({ message: "m".repeat(CONTACT_LIMITS.message * 2 + 1) }),
      validPayload({ turnstileToken: "token com espaço" }),
      validPayload({ turnstileToken: "t".repeat(2049) }),
    ];
    for (const raw of cases) assert.equal(parseContactPayload(raw).kind, "malformed");
  });

  it("detecta o honeypot preenchido", () => {
    assert.equal(parseContactPayload(validPayload({ website: "https://spam.example.com" })).kind, "honeypot");
  });

  it("devolve erros por campo e exige o token", () => {
    const invalid = parseContactPayload(validPayload({ email: "x" }));
    assert.equal(invalid.kind, "invalid");
    assert.equal(parseContactPayload(validPayload({ turnstileToken: "" })).kind, "missing-token");
  });
});
