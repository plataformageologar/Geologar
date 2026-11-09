"use client";

import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { startTransition, useActionState, useEffect, useRef, useState, type ReactNode } from "react";

import {
  parseSiteSettingsValues,
  siteSettingsFields,
  siteSettingsTextRules,
  type SiteSettingsField,
  type SiteSettingsFieldErrors,
  type SiteSettingsFormValues,
} from "@/lib/admin/site-settings";
import { saveSiteSettings, type SiteSettingsSaveState } from "@/lib/admin/site-settings-actions";
import { countCharacters, EMAIL_MAX_LENGTH } from "@/lib/admin/validation";

import { describedBy, Field, FormSection, TextArea, TextInput } from "../form-controls";
import { buildFormData, FailureAction, SaveBar, useUnsavedChangesWarning } from "../save-bar";

type SiteSettingsFormProps = {
  initialValues: SiteSettingsFormValues;
  initialUpdatedAt: string;
  logoSrc: string | null;
  faviconSrc: string | null;
  hasLogo: boolean;
  hasFavicon: boolean;
  /** Editores consultam; somente administradores salvam. */
  readOnly: boolean;
};

async function submit(state: SiteSettingsSaveState, formData: FormData): Promise<SiteSettingsSaveState> {
  try {
    return await saveSiteSettings(state, formData);
  } catch {
    return {
      status: "error",
      reason: "connection",
      message: "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente; nada foi perdido.",
    };
  }
}

function focusFirstError(errors: SiteSettingsFieldErrors) {
  const first = siteSettingsFields.find((field) => errors[field]);
  if (first) document.getElementById(first)?.focus();
}

function isDirty(a: SiteSettingsFormValues, b: SiteSettingsFormValues) {
  return siteSettingsFields.some((field) => a[field] !== b[field]);
}

const emailHint = "Opcional. Exibido no rodapé e na página de contato.";
const phoneHint = "Opcional. Gravado exatamente como digitado (ex.: +55 41 3360-0000).";

/** Informações institucionais (registro único de site_settings). */
export function SiteSettingsForm({
  initialValues,
  initialUpdatedAt,
  logoSrc,
  faviconSrc,
  hasLogo,
  hasFavicon,
  readOnly,
}: SiteSettingsFormProps) {
  const [values, setValues] = useState(initialValues);
  const [saved, setSaved] = useState({ values: initialValues, updatedAt: initialUpdatedAt });
  const [errors, setErrors] = useState<SiteSettingsFieldErrors>({});
  const [clientMessage, setClientMessage] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState<SiteSettingsSaveState, FormData>(submit, {
    status: "idle",
  });

  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.status === "success") {
      setSaved({ values: state.values, updatedAt: state.updatedAt });
      setValues(state.values);
      setErrors({});
    } else if (state.status === "error") {
      setErrors(state.fieldErrors ?? {});
    }
  }

  const dirty = isDirty(values, saved.values);
  const submitting = useRef(false);

  useEffect(() => {
    submitting.current = false;
    if (state.status === "error" && state.fieldErrors) focusFirstError(state.fieldErrors);
  }, [state]);

  useUnsavedChangesWarning(dirty && !readOnly);

  function update(field: SiteSettingsField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    if (errors[field]) {
      setErrors((current) => {
        const next = { ...current };
        delete next[field];
        return next;
      });
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readOnly || pending || submitting.current) return;
    const { errors: found } = parseSiteSettingsValues(values);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      setClientMessage("Revise os campos destacados antes de salvar.");
      focusFirstError(found);
      return;
    }
    submitting.current = true;
    setClientMessage(null);
    const formData = buildFormData({ ...values, updated_at: saved.updatedAt });
    startTransition(() => formAction(formData));
  }

  function cancel() {
    setValues(saved.values);
    setErrors({});
    setClientMessage(null);
  }

  function textField(
    field: keyof typeof siteSettingsTextRules,
    label: string,
    options: { hint?: ReactNode; rows?: number; autoComplete?: string } = {},
  ) {
    const rule: { max: number; required?: boolean; multiline?: boolean } = siteSettingsTextRules[field];
    const control = {
      id: field,
      name: field,
      value: values[field],
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        update(field, event.target.value),
      "aria-invalid": errors[field] ? true : undefined,
      "aria-describedby": describedBy(field, { hint: options.hint, error: errors[field] }),
      "aria-required": rule.required || undefined,
    };
    return (
      <Field
        id={field}
        label={label}
        hint={options.hint}
        error={errors[field]}
        required={rule.required}
        count={readOnly ? undefined : { current: countCharacters(values[field]), max: rule.max }}
      >
        {rule.multiline ? (
          <TextArea rows={options.rows ?? 4} {...control} />
        ) : (
          <TextInput type="text" autoComplete={options.autoComplete ?? "off"} {...control} />
        )}
      </Field>
    );
  }

  const message =
    clientMessage !== null
      ? ({ tone: "error", text: clientMessage } as const)
      : state.status === "error"
        ? ({ tone: "error", text: state.message } as const)
        : state.status === "success" && !dirty
          ? ({ tone: "success", text: state.message } as const)
          : null;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-8">
      <fieldset disabled={readOnly || pending} className="flex min-w-0 flex-col gap-8">
        <FormSection
          id="identificacao"
          title="Identificação"
          description="Nome e apresentação usados no cabeçalho, no rodapé e nos metadados do site."
        >
          {textField("site_name", "Nome do site", {
            hint: "Obrigatório. Aparece no título das abas do navegador e no cabeçalho.",
          })}
          {textField("institutional_name", "Nome institucional completo", {
            hint: "Opcional. Nome por extenso da rede, exibido no rodapé.",
          })}
          {textField("tagline", "Slogan", {
            hint: "Opcional. Frase curta de apresentação; reservada (o layout atual do site ainda não a exibe).",
          })}
          {textField("short_description", "Descrição curta", {
            rows: 4,
            hint: "Opcional. Usada como descrição do site em buscadores e no rodapé.",
          })}
        </FormSection>

        <FormSection
          id="contato"
          title="Contato"
          description="Canais oficiais. Deixe em branco o que ainda não foi definido; nada é preenchido automaticamente."
        >
          <Field id="contact_email" label="E-mail de contato" hint={emailHint} error={errors.contact_email}>
            <TextInput
              id="contact_email"
              name="contact_email"
              type="email"
              inputMode="email"
              autoComplete="off"
              spellCheck={false}
              maxLength={EMAIL_MAX_LENGTH}
              value={values.contact_email}
              onChange={(event) => update("contact_email", event.target.value)}
              aria-invalid={errors.contact_email ? true : undefined}
              aria-describedby={describedBy("contact_email", { hint: emailHint, error: errors.contact_email })}
            />
          </Field>
          <Field id="contact_phone" label="Telefone de contato" hint={phoneHint} error={errors.contact_phone}>
            <TextInput
              id="contact_phone"
              name="contact_phone"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              maxLength={40}
              value={values.contact_phone}
              onChange={(event) => update("contact_phone", event.target.value)}
              aria-invalid={errors.contact_phone ? true : undefined}
              aria-describedby={describedBy("contact_phone", { hint: phoneHint, error: errors.contact_phone })}
              className="sm:max-w-72"
            />
          </Field>
        </FormSection>

        <FormSection id="localizacao" title="Localização" description="Endereço institucional. Todos os campos são opcionais.">
          {textField("address", "Endereço", { hint: "Logradouro, número e complemento." })}
          <div className="grid gap-6 md:grid-cols-3">
            {textField("city", "Cidade")}
            {textField("state", "Estado")}
            {textField("country", "País")}
          </div>
        </FormSection>

        <FormSection
          id="identidade-visual"
          title="Identidade visual"
          description="Logotipo e ícone oficiais do portal, exibidos sem alterações."
        >
          <div className="grid gap-6 md:grid-cols-2">
            {(
              [
                { label: "Logotipo", src: logoSrc, has: hasLogo, empty: "Nenhum logotipo cadastrado no banco." },
                { label: "Favicon", src: faviconSrc, has: hasFavicon, empty: "Nenhum favicon cadastrado no banco." },
              ] as const
            ).map((item) => (
              <div key={item.label} className="flex flex-col gap-3">
                <p className="text-label">{item.label}</p>
                {item.src ? (
                  <div className="relative h-28 w-full overflow-hidden rounded-xl border border-border bg-white">
                    <Image src={item.src} alt="" fill sizes="20rem" className="object-contain p-4" />
                  </div>
                ) : (
                  <div className="flex items-start gap-3 rounded-xl border border-dashed border-border bg-surface-muted/60 p-4 text-body-sm text-muted-foreground">
                    <ImageIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
                    <p>{item.has ? "Arquivo cadastrado, mas a pré-visualização ainda não está disponível." : item.empty}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="text-caption text-muted-foreground">
            Somente leitura. Hoje o portal exibe o logotipo e o ícone oficiais incluídos no código do site; a
            troca pelo CMS chega com a biblioteca de mídia, em uma próxima etapa.
          </p>
        </FormSection>
      </fieldset>

      {!readOnly && (
        <SaveBar
          message={message}
          messageAction={
            state.status === "error" && clientMessage === null ? (
              <FailureAction reason={state.reason} loginNext="/admin/configuracoes" />
            ) : null
          }
          pending={pending}
          dirty={dirty}
          onCancel={cancel}
          submitLabel="Salvar informações"
        />
      )}
    </form>
  );
}
