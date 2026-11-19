/**
 * Configuração do formulário de contato, lida em tempo de execução.
 *
 * No Cloudflare Workers, o OpenNext copia as variáveis e os secrets do Worker
 * para `process.env` a cada isolate. A leitura é dinâmica (`env[name]`) para
 * que o Next.js não embuta valores no build — inclusive a chave pública do
 * Turnstile, que pode ser cadastrada só como variável de runtime.
 *
 * O formulário só é exibido quando TODAS as variáveis estão presentes e
 * válidas e `CONTACT_FORM_ENABLED=true`. Nenhum valor é registrado em log.
 * Sem dependências do projeto (testado com `node --test`).
 */

export type ContactConfig = {
  resendApiKey: string;
  /** Remetente em domínio verificado no Resend (`Nome <endereco>` ou só o endereço). */
  fromEmail: string;
  /** Destinatário(s) definido(s) pela GeoLogar; nunca inferidos do banco. */
  toEmails: string[];
  turnstileSiteKey: string;
  turnstileSecretKey: string;
};

export type ContactConfigStatus = "ready" | "disabled" | "incomplete" | "invalid";

export const CONTACT_ENV_NAMES = [
  "CONTACT_FORM_ENABLED",
  "RESEND_API_KEY",
  "CONTACT_FROM_EMAIL",
  "CONTACT_TO_EMAIL",
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
  "TURNSTILE_SECRET_KEY",
] as const;

type EnvSource = Readonly<Record<string, string | undefined>>;

const ADDRESS = "[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@[A-Za-z0-9-]+(?:\\.[A-Za-z0-9-]+)+";
const PLAIN_ADDRESS = new RegExp(`^${ADDRESS}$`);
/** `Nome <endereco>`: sem aspas, sinais de maior/menor ou quebras no nome. */
const NAMED_ADDRESS = new RegExp(`^[^"<>\\r\\n]{1,80} <${ADDRESS}>$`);
const KEY_PATTERN = /^[A-Za-z0-9_.-]{8,256}$/;
const MAX_RECIPIENTS = 5;

function read(env: EnvSource, name: string) {
  return (env[name] ?? "").trim();
}

/** Lê e valida a configuração; `config` só existe quando `status` é `ready`. */
export function readContactConfig(env: EnvSource): { status: ContactConfigStatus; config: ContactConfig | null } {
  if (read(env, "CONTACT_FORM_ENABLED").toLowerCase() !== "true") return { status: "disabled", config: null };

  const resendApiKey = read(env, "RESEND_API_KEY");
  const fromEmail = read(env, "CONTACT_FROM_EMAIL");
  const to = read(env, "CONTACT_TO_EMAIL");
  const turnstileSiteKey = read(env, "NEXT_PUBLIC_TURNSTILE_SITE_KEY");
  const turnstileSecretKey = read(env, "TURNSTILE_SECRET_KEY");

  if (!resendApiKey || !fromEmail || !to || !turnstileSiteKey || !turnstileSecretKey) {
    return { status: "incomplete", config: null };
  }

  const toEmails = to.split(",").map((address) => address.trim()).filter(Boolean);
  const valid =
    KEY_PATTERN.test(resendApiKey) &&
    KEY_PATTERN.test(turnstileSiteKey) &&
    KEY_PATTERN.test(turnstileSecretKey) &&
    (PLAIN_ADDRESS.test(fromEmail) || NAMED_ADDRESS.test(fromEmail)) &&
    toEmails.length > 0 &&
    toEmails.length <= MAX_RECIPIENTS &&
    toEmails.every((address) => PLAIN_ADDRESS.test(address));
  if (!valid) return { status: "invalid", config: null };

  return {
    status: "ready",
    config: { resendApiKey, fromEmail, toEmails, turnstileSiteKey, turnstileSecretKey },
  };
}

/** Configuração da requisição atual (variáveis do Worker ou `.env.local` no `next dev`). */
export function getContactConfig() {
  return readContactConfig(process.env);
}
