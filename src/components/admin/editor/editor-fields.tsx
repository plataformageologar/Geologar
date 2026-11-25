"use client";

import type { ReactNode } from "react";

import {
  homepageTextRules,
  type HomepageField,
  type HomepageFieldErrors,
  type HomepageFormValues,
} from "@/lib/admin/homepage";
import {
  FOOTER_DEFAULT_DESCRIPTION,
  FOOTER_DEFAULT_TITLES,
  FOOTER_LOGO_MODE_LABELS,
  FOOTER_LOGO_MODES,
  HEADER_STYLE_LABELS,
  HEADER_STYLES,
  siteSettingsTextRules,
  type SiteSettingsField,
  type SiteSettingsFieldErrors,
  type SiteSettingsFormValues,
} from "@/lib/admin/site-settings";
import { countCharacters, EMAIL_MAX_LENGTH } from "@/lib/admin/validation";
import { WHATSAPP_MAX_LENGTH } from "@/lib/site/contact";

import { describedBy, Field, FormMessage, Select, TextArea, TextInput } from "../form-controls";
import { MediaField } from "../media/media-field";

/** Campo de texto controlado com contador (painel do editor). */
export function TextField({
  id,
  label,
  value,
  onChange,
  max,
  multiline,
  rows = 3,
  required,
  hint,
  error,
  disabled,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  max: number;
  multiline?: boolean;
  rows?: number;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  disabled?: boolean;
  type?: "text" | "email" | "tel";
}) {
  const props = {
    id,
    value,
    disabled,
    "aria-invalid": error ? true : undefined,
    "aria-required": required || undefined,
    "aria-describedby": describedBy(id, { hint, error }),
  };
  return (
    <Field
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={required}
      count={{ current: countCharacters(value), max }}
    >
      {multiline ? (
        <TextArea {...props} rows={rows} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <TextInput
          {...props}
          type={type}
          autoComplete="off"
          spellCheck={type === "text" ? undefined : false}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </Field>
  );
}

const LINK_HINT =
  "Caminho do site (ex.: /pesquisa), /#contato (contato do rodapé) ou endereço completo começando com https://.";

// Homepage ---------------------------------------------------------------------------------

export type HomepageGroup = "hero" | "about" | "cooperation";

export function HomepageGroupFields({
  group,
  values,
  onChange,
  errors = {},
  disabled,
}: {
  group: HomepageGroup;
  values: HomepageFormValues;
  onChange: (values: HomepageFormValues) => void;
  errors?: HomepageFieldErrors;
  disabled?: boolean;
}) {
  const set = (field: HomepageField, value: string) => onChange({ ...values, [field]: value });
  const text = (
    field: keyof typeof homepageTextRules,
    label: string,
    options: { hint?: string; required?: boolean } = {},
  ) => {
    const rule: { max: number; multiline?: boolean; required?: boolean } = homepageTextRules[field];
    return (
      <TextField
        id={`editor-${field}`}
        label={label}
        value={values[field]}
        onChange={(value) => set(field, value)}
        max={rule.max}
        multiline={rule.multiline}
        rows={rule.max > 600 ? 6 : 3}
        required={options.required ?? rule.required}
        hint={options.hint}
        error={errors[field]}
        disabled={disabled}
      />
    );
  };
  const link = (field: "hero_primary_cta_href" | "hero_secondary_cta_href" | "cooperation_cta_href") => (
    <TextField
      id={`editor-${field}`}
      label="Destino do botão"
      value={values[field]}
      onChange={(value) => set(field, value)}
      max={2048}
      hint={LINK_HINT}
      error={errors[field]}
      disabled={disabled}
    />
  );

  if (group === "hero") {
    return (
      <div className="flex flex-col gap-5">
        {text("hero_title", "Título principal")}
        {text("hero_description", "Texto de apresentação")}
        <MediaField
          id="editor-hero_image_path"
          label="Imagem de fundo"
          value={values.hero_image_path}
          onChange={(value) => set("hero_image_path", value)}
          error={errors.hero_image_path}
          hint="Horizontal e ampla (ex.: 2400 × 1200 px). Trocar a imagem não apaga a anterior da biblioteca."
          emptyText="Sem imagem: o banner usa o fundo padrão."
          aspect="aspect-[2/1] w-full"
          canUpload
          disabled={disabled}
        >
          {values.hero_image_path &&
            text("hero_image_alt", "Texto alternativo da imagem", {
              required: true,
              hint: "Descreva a imagem para quem usa leitores de tela.",
            })}
        </MediaField>
        <fieldset className="flex flex-col gap-4 rounded-xl border border-border p-4">
          <legend className="px-1 text-label">Botão principal</legend>
          {text("hero_primary_cta_label", "Texto do botão", { hint: "Vazio: o botão não aparece." })}
          {link("hero_primary_cta_href")}
        </fieldset>
        <fieldset className="flex flex-col gap-4 rounded-xl border border-border p-4">
          <legend className="px-1 text-label">Botão secundário</legend>
          {text("hero_secondary_cta_label", "Texto do botão", { hint: "Vazio: o botão não aparece." })}
          {link("hero_secondary_cta_href")}
        </fieldset>
      </div>
    );
  }
  if (group === "about") {
    return (
      <div className="flex flex-col gap-5">
        {text("about_title", "Título da apresentação", { hint: "Vazio: a seção não aparece." })}
        {text("about_description", "Texto da apresentação", { hint: "Quebras de linha são mantidas." })}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-5">
      {text("cooperation_title", "Título da chamada", { hint: "Vazio: a chamada não aparece." })}
      {text("cooperation_description", "Texto da chamada")}
      {text("cooperation_cta_label", "Texto do botão", { hint: "Vazio: o botão não aparece." })}
      {link("cooperation_cta_href")}
    </div>
  );
}

// Configurações (somente administradores) ------------------------------------------------

type SettingsProps = {
  values: SiteSettingsFormValues;
  saved: SiteSettingsFormValues | null;
  onChange: (values: SiteSettingsFormValues) => void;
  errors?: SiteSettingsFieldErrors;
  disabled?: boolean;
};

function settingsText(
  { values, onChange, errors = {}, disabled }: SettingsProps,
  field: keyof typeof siteSettingsTextRules,
  label: string,
  hint?: string,
) {
  const rule: { max: number; multiline?: boolean; required?: boolean } = siteSettingsTextRules[field];
  return (
    <TextField
      id={`editor-${field}`}
      label={label}
      value={values[field]}
      onChange={(value) => onChange({ ...values, [field]: value })}
      max={rule.max}
      multiline={rule.multiline}
      required={rule.required}
      hint={hint}
      error={errors[field]}
      disabled={disabled}
    />
  );
}

function settingsSelect<T extends string>(
  { values, onChange, errors = {}, disabled }: SettingsProps,
  field: SiteSettingsField,
  label: string,
  options: readonly T[],
  labels: Record<T, string>,
  hint?: string,
) {
  const id = `editor-${field}`;
  return (
    <Field id={id} label={label} hint={hint} error={errors[field]}>
      <Select
        id={id}
        value={values[field]}
        disabled={disabled}
        aria-describedby={describedBy(id, { hint, error: errors[field] })}
        onChange={(event) => onChange({ ...values, [field]: event.target.value })}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {labels[option]}
          </option>
        ))}
      </Select>
    </Field>
  );
}

export function HeaderSettingsFields(props: SettingsProps) {
  const { values, saved, onChange, errors = {}, disabled } = props;
  const logoChanged = saved !== null && values.logo_path !== saved.logo_path;
  return (
    <div className="flex flex-col gap-5">
      {settingsText(props, "site_name", "Nome do site", "Aparece nas abas do navegador e como texto do logotipo.")}
      {settingsText(props, "institutional_name", "Nome institucional", "Exibido ao lado do logotipo em telas largas.")}
      {settingsSelect(props, "header_style", "Estilo do cabeçalho", HEADER_STYLES, HEADER_STYLE_LABELS)}
      <MediaField
        id="editor-logo_path"
        label="Logotipo do cabeçalho"
        value={values.logo_path}
        onChange={(value) => onChange({ ...values, logo_path: value })}
        error={errors.logo_path}
        hint="Somente o arquivo oficial, sem alterações. Vazio: o portal usa o logotipo oficial do código."
        emptyText="Usando o logotipo oficial incluído no código do site."
        fit="contain"
        aspect="aspect-[3/1] w-full"
        canUpload
        disabled={disabled}
      />
      {logoChanged && (
        <FormMessage tone="warning">
          O logotipo é a identidade oficial da rede. Confirme a troca com a coordenação antes de salvar.
        </FormMessage>
      )}
    </div>
  );
}

export function FooterSettingsFields(props: SettingsProps) {
  const { values, saved, onChange, errors = {}, disabled } = props;
  const logoChanged =
    saved !== null &&
    (values.footer_logo_mode !== saved.footer_logo_mode || values.footer_logo_path !== saved.footer_logo_path);
  return (
    <div className="flex flex-col gap-5">
      {settingsSelect(props, "footer_logo_mode", "Logotipo do rodapé", FOOTER_LOGO_MODES, FOOTER_LOGO_MODE_LABELS)}
      {values.footer_logo_mode === "custom" && (
        <MediaField
          id="editor-footer_logo_path"
          label="Arquivo do logotipo do rodapé"
          value={values.footer_logo_path}
          onChange={(value) => onChange({ ...values, footer_logo_path: value })}
          error={errors.footer_logo_path}
          hint="PNG ou WebP com fundo transparente, legível sobre o fundo escuro do rodapé."
          emptyText="Nenhum arquivo escolhido."
          fit="contain"
          aspect="aspect-[3/1] w-full"
          canUpload
          disabled={disabled}
        />
      )}
      {logoChanged && (
        <FormMessage tone="warning">
          Trocar o logotipo altera a identidade da rede. Confirme com a coordenação antes de salvar.
        </FormMessage>
      )}
      {settingsText(props, "footer_description", "Texto de apresentação", `Vazio: “${FOOTER_DEFAULT_DESCRIPTION}”`)}
      {settingsText(props, "footer_nav_title", "Título da coluna de links", `Vazio: “${FOOTER_DEFAULT_TITLES.footer_nav_title}”.`)}
      {settingsText(
        props,
        "footer_contact_title",
        "Título da coluna de contato",
        `Vazio: “${FOOTER_DEFAULT_TITLES.footer_contact_title}”.`,
      )}
      {settingsText(
        props,
        "footer_links_title",
        "Título dos links úteis",
        `Vazio: “${FOOTER_DEFAULT_TITLES.footer_links_title}”.`,
      )}
      {settingsText(
        props,
        "footer_social_title",
        "Título das redes sociais",
        `Vazio: “${FOOTER_DEFAULT_TITLES.footer_social_title}”.`,
      )}
      {settingsText(props, "footer_note", "Nota final", "Texto curto exibido ao lado dos direitos autorais.")}
      <fieldset className="flex flex-col gap-4 rounded-xl border border-border p-4">
        <legend className="px-1 text-label">Contato</legend>
        <p className="text-caption text-muted-foreground">
          Coluna “Contato” do rodapé (destino de /#contato). Só canais oficiais: campos vazios não aparecem no site
          e nada é preenchido automaticamente.
        </p>
        <TextField
          id="editor-contact_email"
          label="E-mail"
          type="email"
          value={values.contact_email}
          onChange={(value) => onChange({ ...values, contact_email: value })}
          max={EMAIL_MAX_LENGTH}
          error={errors.contact_email}
          disabled={disabled}
        />
        <TextField
          id="editor-contact_phone"
          label="Telefone"
          type="tel"
          value={values.contact_phone}
          onChange={(value) => onChange({ ...values, contact_phone: value })}
          max={40}
          error={errors.contact_phone}
          disabled={disabled}
        />
        <TextField
          id="editor-contact_whatsapp"
          label="WhatsApp"
          type="tel"
          value={values.contact_whatsapp}
          onChange={(value) => onChange({ ...values, contact_whatsapp: value })}
          max={WHATSAPP_MAX_LENGTH}
          hint="Opcional. Com + e código do país (ex.: +55 e o DDD). Não é copiado do telefone."
          error={errors.contact_whatsapp}
          disabled={disabled}
        />
        {settingsText(props, "address", "Endereço")}
        {settingsText(props, "city", "Cidade")}
        {settingsText(props, "state", "Estado")}
        {settingsText(props, "country", "País")}
      </fieldset>
    </div>
  );
}
