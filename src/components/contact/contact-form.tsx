"use client";

import { LoaderCircle, Send } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";

import { describedBy, Field, FormMessage, Select, TextArea, TextInput } from "@/components/admin/form-controls";
import { Button } from "@/components/ui/button";
import { CONTACT_MESSAGES } from "@/lib/contact/messages";
import {
  CONTACT_LIMITS,
  CONTACT_SUBJECTS,
  HONEYPOT_FIELD,
  validateContactValues,
  type ContactField,
  type ContactFieldErrors,
  type ContactValues,
} from "@/lib/contact/schema";

import { TurnstileWidget, type TurnstileHandle } from "./turnstile-widget";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "success" }
  | { kind: "error"; message: string };

const EMPTY: ContactValues = { name: "", email: "", subject: "", message: "" };
const FIELD_ORDER: ContactField[] = ["name", "email", "subject", "message"];
const KNOWN_FIELDS = new Set<string>(FIELD_ORDER);

const ERROR_MESSAGES: Record<string, string> = {
  validation: CONTACT_MESSAGES.validation,
  verification: CONTACT_MESSAGES.verification,
  "rate-limited": CONTACT_MESSAGES.rateLimited,
};

function newSubmissionId() {
  return crypto.randomUUID();
}

/** Somente os campos conhecidos e mensagens em texto (resposta do servidor). */
function readFieldErrors(value: unknown): ContactFieldErrors {
  if (typeof value !== "object" || value === null) return {};
  return Object.fromEntries(
    Object.entries(value).filter(([key, message]) => KNOWN_FIELDS.has(key) && typeof message === "string"),
  ) as ContactFieldErrors;
}

/**
 * Formulário de contato público. Valida no navegador com as mesmas regras do
 * servidor, exige o token do Turnstile e só confirma o envio depois que a
 * rota `/api/contact` responde que o provedor aceitou a mensagem. Em caso de
 * erro, os dados digitados são mantidos.
 */
export function ContactForm({ turnstileSiteKey }: { turnstileSiteKey: string }) {
  const [values, setValues] = useState<ContactValues>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<ContactFieldErrors>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [token, setToken] = useState("");
  const [verificationUnavailable, setVerificationUnavailable] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const turnstileRef = useRef<TurnstileHandle>(null);
  const sendingRef = useRef(false);
  // Identificador do envio: o mesmo enquanto a mensagem não for aceita, para
  // que uma repetição (ex.: resposta perdida) não gere outro e-mail.
  const submissionIdRef = useRef<string | null>(null);

  const sending = status.kind === "sending";

  function update(field: ContactField, value: string) {
    const next = { ...values, [field]: value };
    setValues(next);
    if (status.kind === "success") setStatus({ kind: "idle" });
    // Depois de um erro, a mensagem do campo some assim que ele é corrigido.
    if (fieldErrors[field]) {
      const { errors } = validateContactValues(next);
      const remaining = { ...fieldErrors, [field]: errors[field] };
      setFieldErrors(remaining);
      const validationNotice = status.kind === "error" && status.message === CONTACT_MESSAGES.validation;
      if (validationNotice && !FIELD_ORDER.some((key) => remaining[key])) setStatus({ kind: "idle" });
    }
  }

  function focusFirstInvalid(errors: ContactFieldErrors) {
    const first = FIELD_ORDER.find((field) => errors[field]);
    if (first) formRef.current?.querySelector<HTMLElement>(`#contact-${first}`)?.focus();
  }

  function showFeedback(next: Status) {
    setStatus(next);
    requestAnimationFrame(() => feedbackRef.current?.focus());
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sendingRef.current) return;

    const { errors } = validateContactValues(values);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setStatus({ kind: "error", message: CONTACT_MESSAGES.validation });
      focusFirstInvalid(errors);
      return;
    }
    if (verificationUnavailable) {
      showFeedback({ kind: "error", message: CONTACT_MESSAGES.verificationUnavailable });
      return;
    }
    if (!token) {
      showFeedback({ kind: "error", message: CONTACT_MESSAGES.waitVerification });
      return;
    }

    sendingRef.current = true;
    submissionIdRef.current ??= newSubmissionId();
    setStatus({ kind: "sending" });

    let next: Status = { kind: "error", message: CONTACT_MESSAGES.failure };
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(30_000),
        body: JSON.stringify({
          submissionId: submissionIdRef.current,
          ...values,
          turnstileToken: token,
          [HONEYPOT_FIELD]: honeypotRef.current?.value ?? "",
        }),
      });
      const result = (await response.json().catch(() => null)) as {
        status?: unknown;
        code?: unknown;
        fieldErrors?: unknown;
      } | null;

      if (response.ok && result?.status === "success") {
        next = { kind: "success" };
        setValues(EMPTY);
        setFieldErrors({});
        submissionIdRef.current = null;
      } else {
        const code = typeof result?.code === "string" ? result.code : "";
        next = { kind: "error", message: ERROR_MESSAGES[code] ?? CONTACT_MESSAGES.failure };
        if (code === "validation") {
          const serverErrors = readFieldErrors(result?.fieldErrors);
          setFieldErrors(serverErrors);
          sendingRef.current = false;
          setStatus(next);
          focusFirstInvalid(serverErrors);
          turnstileRef.current?.reset();
          return;
        }
      }
    } catch {
      // Rede indisponível ou tempo esgotado: os dados continuam no formulário.
    }

    sendingRef.current = false;
    // Cada token do Turnstile vale uma vez: gera outro para o próximo envio.
    turnstileRef.current?.reset();
    showFeedback(next);
  }

  const counters = {
    name: { current: values.name.length, max: CONTACT_LIMITS.name },
    message: { current: values.message.length, max: CONTACT_LIMITS.message },
  };

  return (
    <form ref={formRef} noValidate onSubmit={handleSubmit} aria-busy={sending} className="@container flex flex-col gap-6">
      <div ref={feedbackRef} tabIndex={-1} className="flex flex-col gap-2 outline-none empty:hidden">
        {status.kind === "success" && <FormMessage tone="success">{CONTACT_MESSAGES.success}</FormMessage>}
        {status.kind === "error" && <FormMessage tone="error">{status.message}</FormMessage>}
      </div>

      {/* Nome e e-mail lado a lado só quando o próprio formulário tem largura (≥ 32rem). */}
      <div className="grid gap-6 @lg:grid-cols-2">
        <Field id="contact-name" label="Nome" required error={fieldErrors.name} count={counters.name}>
          <TextInput
            id="contact-name"
            name="name"
            autoComplete="name"
            maxLength={CONTACT_LIMITS.name}
            value={values.name}
            onChange={(event) => update("name", event.target.value)}
            aria-required="true"
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={describedBy("contact-name", { error: fieldErrors.name })}
          />
        </Field>

        <Field id="contact-email" label="E-mail" required error={fieldErrors.email}>
          <TextInput
            id="contact-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            spellCheck={false}
            maxLength={CONTACT_LIMITS.email}
            value={values.email}
            onChange={(event) => update("email", event.target.value)}
            aria-required="true"
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={describedBy("contact-email", { error: fieldErrors.email })}
          />
        </Field>
      </div>

      <Field id="contact-subject" label="Assunto" required error={fieldErrors.subject}>
        <Select
          id="contact-subject"
          name="subject"
          value={values.subject}
          onChange={(event) => update("subject", event.target.value)}
          aria-required="true"
          aria-invalid={Boolean(fieldErrors.subject)}
          aria-describedby={describedBy("contact-subject", { error: fieldErrors.subject })}
        >
          <option value="">Selecione um assunto</option>
          {CONTACT_SUBJECTS.map((subject) => (
            <option key={subject.value} value={subject.value}>
              {subject.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        id="contact-message"
        label="Mensagem"
        required
        error={fieldErrors.message}
        count={counters.message}
        hint={`Até ${new Intl.NumberFormat("pt-BR").format(CONTACT_LIMITS.message)} caracteres. Não é possível anexar arquivos.`}
      >
        <TextArea
          id="contact-message"
          name="message"
          rows={7}
          maxLength={CONTACT_LIMITS.message}
          value={values.message}
          onChange={(event) => update("message", event.target.value)}
          aria-required="true"
          aria-invalid={Boolean(fieldErrors.message)}
          aria-describedby={describedBy("contact-message", { hint: true, error: fieldErrors.message })}
        />
      </Field>

      {/* Campo-armadilha para robôs: fora da tela, fora da ordem de tabulação e oculto de leitores de tela. */}
      <div aria-hidden="true" className="absolute -left-[10000px] top-auto size-px overflow-hidden">
        <label htmlFor={`contact-${HONEYPOT_FIELD}`}>Não preencha este campo</label>
        <input
          ref={honeypotRef}
          id={`contact-${HONEYPOT_FIELD}`}
          name={HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      <div className="flex flex-col gap-2">
        <TurnstileWidget
          ref={turnstileRef}
          siteKey={turnstileSiteKey}
          onToken={setToken}
          onUnavailable={() => setVerificationUnavailable(true)}
        />
        {verificationUnavailable && (
          <FormMessage tone="warning">{CONTACT_MESSAGES.verificationUnavailable}</FormMessage>
        )}
      </div>

      <p className="text-caption text-muted-foreground">{CONTACT_MESSAGES.privacy}</p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" size="lg" aria-disabled={sending} className="w-full sm:w-auto">
          {sending ? (
            <LoaderCircle aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none" />
          ) : (
            <Send aria-hidden="true" className="size-5" />
          )}
          {sending ? CONTACT_MESSAGES.sending : "Enviar mensagem"}
        </Button>
        <p role="status" aria-live="polite" className="sr-only">
          {sending ? CONTACT_MESSAGES.sending : ""}
        </p>
      </div>
    </form>
  );
}
