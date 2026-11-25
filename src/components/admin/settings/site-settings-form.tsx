"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type ReactNode } from "react";

import {
  FOOTER_DEFAULT_DESCRIPTION,
  FOOTER_DEFAULT_TITLES,
  FOOTER_LOGO_MODE_LABELS,
  FOOTER_LOGO_MODES,
  HEADER_STYLE_LABELS,
  HEADER_STYLES,
  parseSiteSettingsValues,
  siteSettingsFields,
  siteSettingsTextRules,
  type SiteSettingsField,
  type SiteSettingsFieldErrors,
  type SiteSettingsFormValues,
} from "@/lib/admin/site-settings";
import { saveSiteSettings, type SiteSettingsSaveState } from "@/lib/admin/site-settings-actions";
import { countCharacters, EMAIL_MAX_LENGTH } from "@/lib/admin/validation";
import { WHATSAPP_MAX_LENGTH } from "@/lib/site/contact";

import { describedBy, Field, FormMessage, FormSection, Select, TextArea, TextInput } from "../form-controls";
import { MediaField } from "../media/media-field";
import { useOptionalEditorial, useReportDirty } from "../editorial/editorial-scope";
import { buildFormData, FailureAction, SaveBar, useUnsavedChangesWarning } from "../save-bar";

type SiteSettingsFormProps = {
  /** Rascunho atual (ou versão publicada); para editores, a versão publicada. */
  initialValues: SiteSettingsFormValues;
  /** Editores consultam; somente administradores salvam (dentro de EditorialScope). */
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

const emailHint = "Opcional. Exibido na coluna Contato do rodapé.";
const phoneHint = "Opcional. Gravado exatamente como digitado (ex.: +55 41 3360-0000).";
const whatsappHint =
  "Opcional. Número oficial com + e código do país (ex.: +55 e o DDD). Não é copiado do telefone; vazio, não aparece.";

/** Informações institucionais (registro único de site_settings). */
export function SiteSettingsForm({ initialValues, readOnly }: SiteSettingsFormProps) {
  const editorial = useOptionalEditorial();
  const [values, setValues] = useState(initialValues);
  const [saved, setSaved] = useState({ values: initialValues });
  const [errors, setErrors] = useState<SiteSettingsFieldErrors>({});
  const [clientMessage, setClientMessage] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState<SiteSettingsSaveState, FormData>(submit, {
    status: "idle",
  });

  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.status === "success") {
      setSaved({ values: state.values });
      setValues(state.values);
      setErrors({});
    } else if (state.status === "error") {
      setErrors(state.fieldErrors ?? {});
    }
  }

  const dirty = isDirty(values, saved.values);
  const submitting = useRef(false);

  // Atualiza a versão do escopo editorial (pai) depois da renderização.
  const setEditorialVersion = editorial?.setVersion;
  useEffect(() => {
    submitting.current = false;
    if (state.status === "success") setEditorialVersion?.(state.version);
    if (state.status === "error" && state.fieldErrors) focusFirstError(state.fieldErrors);
  }, [state, setEditorialVersion]);

  useUnsavedChangesWarning(dirty && !readOnly);
  useReportDirty("settings", dirty && !readOnly);

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
    if (readOnly || !editorial || pending || submitting.current) return;
    const { errors: found } = parseSiteSettingsValues(values, {
      logoPath: saved.values.logo_path || null,
      faviconPath: saved.values.favicon_path || null,
      footerLogoPath: saved.values.footer_logo_path || null,
    });
    if (Object.keys(found).length > 0) {
      setErrors(found);
      setClientMessage("Revise os campos destacados antes de salvar.");
      focusFirstError(found);
      return;
    }
    submitting.current = true;
    setClientMessage(null);
    const formData = buildFormData({ ...values, document: editorial.token });
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
          <Field id="contact_whatsapp" label="WhatsApp" hint={whatsappHint} error={errors.contact_whatsapp}>
            <TextInput
              id="contact_whatsapp"
              name="contact_whatsapp"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              maxLength={WHATSAPP_MAX_LENGTH}
              value={values.contact_whatsapp}
              onChange={(event) => update("contact_whatsapp", event.target.value)}
              aria-invalid={errors.contact_whatsapp ? true : undefined}
              aria-describedby={describedBy("contact_whatsapp", { hint: whatsappHint, error: errors.contact_whatsapp })}
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
          description="Logotipo do cabeçalho e ícone do navegador (favicon). Vazios, o portal usa os arquivos oficiais incluídos no código do site."
        >
          <div className="grid gap-8 lg:grid-cols-2">
            <MediaField
              id="logo_path"
              label="Logotipo do cabeçalho"
              value={values.logo_path}
              onChange={(value) => update("logo_path", value)}
              error={errors.logo_path}
              hint="Somente o arquivo oficial, sem alterações: PNG ou WebP horizontal com fundo transparente (altura mínima de 112 px)."
              emptyText="Usando o logotipo oficial incluído no código do site."
              fit="contain"
              aspect="aspect-[3/1] max-w-md"
              canUpload={!readOnly}
              disabled={readOnly || pending}
            />
            <MediaField
              id="favicon_path"
              label="Favicon"
              value={values.favicon_path}
              onChange={(value) => update("favicon_path", value)}
              error={errors.favicon_path}
              hint="PNG quadrado, de preferência 512 × 512 px. Os navegadores podem levar algum tempo para trocar o ícone salvo em cache."
              emptyText="Usando o ícone oficial incluído no código do site."
              fit="contain"
              aspect="aspect-square max-w-40"
              canUpload={!readOnly}
              disabled={readOnly || pending}
            />
          </div>
        </FormSection>

        <FormSection
          id="cabecalho-rodape"
          title="Cabeçalho e rodapé"
          description="Textos e logotipo do rodapé e estilo do cabeçalho. Os links dos menus ficam em Navegação."
        >
          <Field
            id="header_style"
            label="Estilo do cabeçalho"
            hint="Translúcido deixa o fundo da página aparecer levemente atrás do menu."
            error={errors.header_style}
          >
            <Select
              id="header_style"
              name="header_style"
              value={values.header_style}
              onChange={(event) => update("header_style", event.target.value)}
              aria-describedby={describedBy("header_style", { hint: true, error: errors.header_style })}
              className="sm:max-w-72"
            >
              {HEADER_STYLES.map((style) => (
                <option key={style} value={style}>
                  {HEADER_STYLE_LABELS[style]}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            id="footer_logo_mode"
            label="Logotipo do rodapé"
            hint="O logotipo oficial é o padrão. Trocar o logotipo altera a identidade da rede: confirme com a coordenação antes."
            error={errors.footer_logo_mode}
          >
            <Select
              id="footer_logo_mode"
              name="footer_logo_mode"
              value={values.footer_logo_mode}
              onChange={(event) => update("footer_logo_mode", event.target.value)}
              aria-describedby={describedBy("footer_logo_mode", { hint: true, error: errors.footer_logo_mode })}
              className="sm:max-w-md"
            >
              {FOOTER_LOGO_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {FOOTER_LOGO_MODE_LABELS[mode]}
                </option>
              ))}
            </Select>
          </Field>
          {values.footer_logo_mode === "custom" && (
            <>
              <FormMessage tone="warning">
                Use somente uma versão oficial do logotipo GeoLogar, sem distorções ou alterações de cor.
              </FormMessage>
              <MediaField
                id="footer_logo_path"
                label="Arquivo do logotipo do rodapé"
                value={values.footer_logo_path}
                onChange={(value) => update("footer_logo_path", value)}
                error={errors.footer_logo_path}
                hint="PNG ou WebP com fundo transparente, legível sobre o fundo escuro do rodapé."
                emptyText="Nenhum arquivo escolhido."
                fit="contain"
                aspect="aspect-[3/1] max-w-md"
                canUpload={!readOnly}
                disabled={readOnly || pending}
              />
            </>
          )}
          {textField("footer_description", "Texto de apresentação do rodapé", {
            rows: 3,
            hint: `Opcional. Vazio, o rodapé usa: “${FOOTER_DEFAULT_DESCRIPTION}”`,
          })}
          <div className="grid gap-6 md:grid-cols-2">
            {textField("footer_nav_title", "Título da coluna de links", {
              hint: `Vazio: “${FOOTER_DEFAULT_TITLES.footer_nav_title}”.`,
            })}
            {textField("footer_contact_title", "Título da coluna de contato", {
              hint: `Vazio: “${FOOTER_DEFAULT_TITLES.footer_contact_title}”.`,
            })}
            {textField("footer_links_title", "Título dos links úteis", {
              hint: `Vazio: “${FOOTER_DEFAULT_TITLES.footer_links_title}”.`,
            })}
            {textField("footer_social_title", "Título das redes sociais", {
              hint: `Vazio: “${FOOTER_DEFAULT_TITLES.footer_social_title}”.`,
            })}
          </div>
          {textField("footer_note", "Nota final do rodapé", {
            rows: 2,
            hint: "Opcional. Texto curto exibido abaixo do rodapé, ao lado dos direitos autorais.",
          })}
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
          submitLabel="Salvar rascunho"
          cancelLabel="Descartar alterações não salvas"
          idleLabel="Nenhuma alteração fora do rascunho"
        />
      )}
    </form>
  );
}
