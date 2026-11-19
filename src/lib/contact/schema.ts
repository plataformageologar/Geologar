/**
 * Formulário de contato: limites, assuntos e validação.
 *
 * O mesmo código valida no navegador (componente cliente) e no servidor
 * (`/api/contact`). Não importa nada do projeto para poder ser testado com
 * `node --test` (ver `tests/contact`).
 */

export const CONTACT_LIMITS = {
  name: 120,
  email: 254,
  subject: 160,
  message: 5000,
} as const;

/** Tamanho máximo do token do Turnstile (a documentação fala em até 2048). */
export const TURNSTILE_TOKEN_MAX = 2048;

/** Corpo máximo aceito pela rota (JSON com mensagem de 5.000 caracteres + token). */
export const CONTACT_BODY_MAX_BYTES = 32 * 1024;

/** Assuntos fixos: o servidor só aceita estes valores. */
export const CONTACT_SUBJECTS = [
  { value: "informacoes", label: "Informações sobre a GeoLogar" },
  { value: "pesquisa", label: "Pesquisa e projetos" },
  { value: "cooperacao", label: "Cooperação institucional" },
  { value: "publicacoes", label: "Publicações científicas" },
  { value: "outros", label: "Outros assuntos" },
] as const;

export type ContactSubjectValue = (typeof CONTACT_SUBJECTS)[number]["value"];
export type ContactField = "name" | "email" | "subject" | "message";
export type ContactValues = Record<ContactField, string>;
export type ContactFieldErrors = Partial<Record<ContactField, string>>;

/** Mensagem validada e normalizada, pronta para o e-mail. */
export type ContactSubmission = {
  name: string;
  email: string;
  subject: ContactSubjectValue;
  subjectLabel: string;
  message: string;
};

/** Campo-armadilha (honeypot): invisível para pessoas, deve chegar vazio. */
export const HONEYPOT_FIELD = "website";

/** Chaves aceitas no corpo da requisição; qualquer outra é recusada. */
const PAYLOAD_KEYS = ["submissionId", "name", "email", "subject", "message", "turnstileToken", HONEYPOT_FIELD] as const;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Caracteres de controle (inclui CR/LF): proibidos em nome, e-mail e assunto. */
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/;
/** Na mensagem, quebras de linha e tabulação são permitidas. */
const MESSAGE_CONTROL_CHARS = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u2028\u2029]/;

/**
 * Formato prático de e-mail (o endereço só é usado como `reply_to`): uma
 * arroba, parte local de até 64 caracteres e domínio com ao menos um ponto.
 */
const EMAIL_PATTERN =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@(?=.{1,253}$)[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

const numberFormatter = new Intl.NumberFormat("pt-BR");

function tooLong(max: number) {
  return `Use no máximo ${numberFormatter.format(max)} caracteres.`;
}

export function isValidEmail(value: string) {
  return value.length <= CONTACT_LIMITS.email && EMAIL_PATTERN.test(value) && !value.includes("..");
}

export function subjectLabel(value: string): string | null {
  return CONTACT_SUBJECTS.find((subject) => subject.value === value)?.label ?? null;
}

/**
 * Valida e normaliza os quatro campos visíveis. Retorna os erros por campo
 * (mensagens para o visitante) e, sem erros, os valores normalizados.
 */
export function validateContactValues(values: ContactValues): {
  errors: ContactFieldErrors;
  data: ContactSubmission | null;
} {
  const errors: ContactFieldErrors = {};

  const name = values.name.normalize("NFC").trim().replace(/[ \t]+/g, " ");
  if (!name) errors.name = "Informe seu nome.";
  else if (name.length > CONTACT_LIMITS.name) errors.name = tooLong(CONTACT_LIMITS.name);
  else if (CONTROL_CHARS.test(name)) errors.name = "Remova os caracteres inválidos do nome.";

  const email = values.email.trim();
  if (!email) errors.email = "Informe seu e-mail.";
  else if (email.length > CONTACT_LIMITS.email) errors.email = tooLong(CONTACT_LIMITS.email);
  else if (!isValidEmail(email)) errors.email = "Informe um e-mail válido, no formato nome@dominio.com.br.";

  const label = subjectLabel(values.subject);
  if (!values.subject) errors.subject = "Selecione o assunto.";
  else if (!label || label.length > CONTACT_LIMITS.subject) errors.subject = "Selecione um dos assuntos da lista.";

  const message = values.message.normalize("NFC").replace(/\r\n?/g, "\n").trim();
  if (!message) errors.message = "Escreva sua mensagem.";
  else if (message.length > CONTACT_LIMITS.message) errors.message = tooLong(CONTACT_LIMITS.message);
  else if (MESSAGE_CONTROL_CHARS.test(message)) errors.message = "Remova os caracteres inválidos da mensagem.";

  if (Object.keys(errors).length > 0 || !label) return { errors, data: null };
  return {
    errors,
    data: { name, email, subject: values.subject as ContactSubjectValue, subjectLabel: label, message },
  };
}

export type ParsedPayload =
  | { kind: "ok"; submission: ContactSubmission; submissionId: string; turnstileToken: string }
  | { kind: "invalid"; fieldErrors: ContactFieldErrors }
  | { kind: "honeypot" }
  | { kind: "missing-token" }
  | { kind: "malformed" };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

/**
 * Valida o corpo JSON recebido pela rota. Recusa (`malformed`) qualquer
 * estrutura inesperada: chaves a mais ou a menos, tipos diferentes de texto,
 * identificador de envio fora do formato UUID ou valores muito longos.
 */
export function parseContactPayload(raw: unknown): ParsedPayload {
  if (!isPlainObject(raw)) return { kind: "malformed" };

  const keys = Object.keys(raw);
  if (keys.length !== PAYLOAD_KEYS.length || !PAYLOAD_KEYS.every((key) => keys.includes(key))) {
    return { kind: "malformed" };
  }
  if (!PAYLOAD_KEYS.every((key) => typeof raw[key] === "string")) return { kind: "malformed" };

  const payload = raw as Record<(typeof PAYLOAD_KEYS)[number], string>;

  // Limites brutos generosos (antes da normalização) contra payloads abusivos.
  if (
    payload.name.length > CONTACT_LIMITS.name * 4 ||
    payload.email.length > CONTACT_LIMITS.email * 2 ||
    payload.subject.length > CONTACT_LIMITS.subject ||
    payload.message.length > CONTACT_LIMITS.message * 2 ||
    payload.website.length > 500
  ) {
    return { kind: "malformed" };
  }
  if (!UUID_PATTERN.test(payload.submissionId)) return { kind: "malformed" };

  if (payload.website !== "") return { kind: "honeypot" };

  const { errors, data } = validateContactValues(payload);
  if (!data) return { kind: "invalid", fieldErrors: errors };

  const token = payload.turnstileToken;
  if (!token) return { kind: "missing-token" };
  if (token.length > TURNSTILE_TOKEN_MAX || /\s/.test(token) || CONTROL_CHARS.test(token)) {
    return { kind: "malformed" };
  }

  return { kind: "ok", submission: data, submissionId: payload.submissionId.toLowerCase(), turnstileToken: token };
}
