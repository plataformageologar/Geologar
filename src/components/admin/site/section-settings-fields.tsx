"use client";

import { countCharacters } from "@/lib/admin/validation";
import { EXPERIENCE_COLUMN_OPTIONS } from "@/lib/site/experiences";
import { moveItem } from "@/lib/site/lists";
import {
  ALIGN_LABELS,
  ALIGNS,
  BACKGROUND_LABELS,
  COLUMN_OPTIONS,
  GALLERY_MAX_IMAGES,
  HERO_LAYOUT_LABELS,
  HERO_LAYOUTS,
  IMAGE_POSITION_LABELS,
  IMAGE_POSITIONS,
  IMAGE_SIDE_LABELS,
  IMAGE_SIDES,
  LIMIT_OPTIONS,
  LOGOS_MAX_INSTITUTIONS,
  OVERLAY_LABELS,
  OVERLAYS,
  SECTION_KEYS,
  SECTION_TEXT_RULES,
  sectionBackgroundOptions,
  type SectionFieldErrors,
  type SectionSettings,
  type SectionType,
  type SettingKey,
} from "@/lib/site/sections";

import { Checkbox, describedBy, Field, Select, TextArea, TextInput } from "../form-controls";
import { MediaField } from "../media/media-field";
import { ExperiencesFields } from "./experiences-fields";
import { ItemToolbar } from "./list-controls";

export type InstitutionOption = { id: string; name: string; published: boolean };

const TEXT_LABELS: Record<keyof typeof SECTION_TEXT_RULES, string> = {
  eyebrow: "Sobretítulo",
  title: "Título",
  description: "Texto",
  cta_label: "Texto do botão ou link",
  image_alt: "Texto alternativo da imagem",
};

/**
 * Campos de configuração de uma seção ou bloco, conforme o tipo — só as
 * opções que o tipo realmente suporta (mesma lista do banco).
 */
export function SectionSettingsFields({
  idPrefix,
  type,
  settings,
  onChange,
  errors = {},
  disabled,
  canUpload,
  institutions = [],
  focusExperienceId,
}: {
  idPrefix: string;
  type: SectionType;
  settings: SectionSettings;
  onChange: (settings: SectionSettings) => void;
  errors?: SectionFieldErrors;
  disabled?: boolean;
  canUpload: boolean;
  institutions?: InstitutionOption[];
  /** Experiência clicada na tela do editor visual (abre o card). */
  focusExperienceId?: string | null;
}) {
  const keys = SECTION_KEYS[type];
  const has = (key: SettingKey) => keys.includes(key);
  const set = <K extends SettingKey>(key: K, value: SectionSettings[K] | undefined) => {
    const next = { ...settings };
    if (value === undefined || value === "") delete next[key];
    else next[key] = value;
    onChange(next);
  };

  const textField = (key: keyof typeof SECTION_TEXT_RULES, hint?: string) => {
    if (!has(key) || key === "image_alt") return null;
    const id = `${idPrefix}-${key}`;
    const rule: { max: number; multiline?: boolean } = SECTION_TEXT_RULES[key];
    const value = settings[key] ?? "";
    const common = {
      id,
      value,
      disabled,
      "aria-invalid": Boolean(errors[key]),
      "aria-describedby": describedBy(id, { hint, error: errors[key] }),
    };
    return (
      <Field
        key={key}
        id={id}
        label={TEXT_LABELS[key]}
        hint={hint}
        error={errors[key]}
        count={{ current: countCharacters(value), max: rule.max }}
      >
        {rule.multiline ? (
          <TextArea {...common} rows={4} onChange={(event) => set(key, event.target.value)} />
        ) : (
          <TextInput {...common} onChange={(event) => set(key, event.target.value)} />
        )}
      </Field>
    );
  };

  const select = <T extends string | number>(
    key: SettingKey,
    label: string,
    options: readonly T[],
    labels: (option: T) => string,
    fallback: T,
    hint?: string,
  ) => {
    if (!has(key) || options.length === 0) return null;
    const id = `${idPrefix}-${key}`;
    const current = (settings[key] as T | undefined) ?? fallback;
    return (
      <Field key={key} id={id} label={label} hint={hint} error={errors[key]}>
        <Select
          id={id}
          value={String(current)}
          disabled={disabled}
          aria-describedby={describedBy(id, { hint, error: errors[key] })}
          onChange={(event) => {
            const raw = event.target.value;
            const option = options.find((item) => String(item) === raw);
            set(key, option as SectionSettings[typeof key]);
          }}
        >
          {options.map((option) => (
            <option key={String(option)} value={String(option)}>
              {labels(option)}
            </option>
          ))}
        </Select>
      </Field>
    );
  };

  const backgrounds = sectionBackgroundOptions(type);
  const images = settings.images ?? [];
  const selectedInstitutions = settings.institution_ids ?? [];

  return (
    <div className="flex flex-col gap-5">
      {textField("eyebrow", "Pequeno texto acima do título. Opcional.")}
      {textField(
        "title",
        type === "research" || type === "projects" || type === "publications" || type === "institutions" || type === "pillars"
          ? "Vazio: usa o título padrão da seção."
          : undefined,
      )}
      {textField("description")}

      {has("cta_label") && (
        <div className="grid gap-4 md:grid-cols-2">
          {textField("cta_label", "Vazio: o botão ou link não aparece.")}
          <Field
            id={`${idPrefix}-cta_href`}
            label="Destino do botão ou link"
            hint="Página do site (ex.: /contato) ou endereço https://…"
            error={errors.cta_href}
          >
            <TextInput
              id={`${idPrefix}-cta_href`}
              value={settings.cta_href ?? ""}
              disabled={disabled}
              inputMode="url"
              spellCheck={false}
              aria-invalid={Boolean(errors.cta_href)}
              aria-describedby={describedBy(`${idPrefix}-cta_href`, { hint: true, error: errors.cta_href })}
              onChange={(event) => set("cta_href", event.target.value)}
            />
          </Field>
        </div>
      )}

      {has("image_path") && (
        <MediaField
          id={`${idPrefix}-image_path`}
          label="Imagem"
          value={settings.image_path ?? ""}
          onChange={(value) => set("image_path", value)}
          error={errors.image_path}
          emptyText="Nenhuma imagem selecionada."
          aspect="aspect-[4/3] max-w-md"
          canUpload={canUpload}
          disabled={disabled}
        >
          <Field
            id={`${idPrefix}-image_alt`}
            label="Texto alternativo"
            hint="Descreva a imagem para quem usa leitor de tela."
            error={errors.image_alt}
            count={{ current: countCharacters(settings.image_alt ?? ""), max: SECTION_TEXT_RULES.image_alt.max }}
          >
            <TextInput
              id={`${idPrefix}-image_alt`}
              value={settings.image_alt ?? ""}
              disabled={disabled}
              onChange={(event) => set("image_alt", event.target.value)}
            />
          </Field>
        </MediaField>
      )}

      {has("images") && (
        <fieldset className="flex flex-col gap-4">
          <legend className="text-label">Imagens da galeria</legend>
          {errors.images && <p className="text-caption font-semibold text-danger">{errors.images}</p>}
          {images.map((image, index) => (
            <div key={`${image.path}-${index}`} className="flex flex-col gap-3 rounded-xl border border-border p-3">
              <ItemToolbar
                label={`imagem ${index + 1}`}
                index={index}
                count={images.length}
                disabled={disabled}
                onMove={(offset) => set("images", moveItem(images, index, offset))}
                onRemove={() => set("images", images.filter((_, position) => position !== index))}
                removeWarning="Tirar a imagem da galeria? O arquivo continua na biblioteca."
              />
              <MediaField
                id={`${idPrefix}-images-${index}`}
                label={`Imagem ${index + 1}`}
                value={image.path}
                onChange={(value) =>
                  set(
                    "images",
                    value
                      ? images.map((entry, position) => (position === index ? { ...entry, path: value } : entry))
                      : images.filter((_, position) => position !== index),
                  )
                }
                emptyText="Sem imagem."
                aspect="aspect-[4/3] max-w-xs"
                canUpload={canUpload}
                disabled={disabled}
              >
                <Field id={`${idPrefix}-images-${index}-alt`} label="Texto alternativo">
                  <TextInput
                    id={`${idPrefix}-images-${index}-alt`}
                    value={image.alt}
                    disabled={disabled}
                    maxLength={SECTION_TEXT_RULES.image_alt.max}
                    onChange={(event) =>
                      set(
                        "images",
                        images.map((entry, position) => (position === index ? { ...entry, alt: event.target.value } : entry)),
                      )
                    }
                  />
                </Field>
              </MediaField>
            </div>
          ))}
          {images.length < GALLERY_MAX_IMAGES && (
            <MediaField
              id={`${idPrefix}-images-new`}
              label="Adicionar imagem"
              value=""
              onChange={(value) => value && set("images", [...images, { path: value, alt: "" }])}
              emptyText={`Escolha na biblioteca (até ${GALLERY_MAX_IMAGES} imagens).`}
              aspect="aspect-[4/3] max-w-xs"
              canUpload={canUpload}
              disabled={disabled}
            />
          )}
        </fieldset>
      )}

      {has("experiences") && (
        <ExperiencesFields
          idPrefix={idPrefix}
          items={settings.experiences ?? []}
          onChange={(items) => onChange({ ...settings, experiences: items })}
          errors={errors.experience_items}
          listError={errors.experience_items ? undefined : errors.experiences}
          disabled={disabled}
          canUpload={canUpload}
          focusId={focusExperienceId}
        />
      )}

      {has("institution_ids") && (
        <fieldset className="flex flex-col gap-3">
          <legend className="text-label">Instituições exibidas</legend>
          <p className="text-caption text-muted-foreground">
            Somente instituições publicadas aparecem no site (até {LOGOS_MAX_INSTITUTIONS}). A ordem segue a da
            seleção.
          </p>
          {errors.institution_ids && (
            <p className="text-caption font-semibold text-danger">{errors.institution_ids}</p>
          )}
          {institutions.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">Nenhuma instituição cadastrada.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {institutions.map((institution) => (
                <li key={institution.id}>
                  <Checkbox
                    id={`${idPrefix}-inst-${institution.id}`}
                    label={institution.name}
                    description={institution.published ? undefined : "Rascunho: não aparece no site até ser publicada."}
                    checked={selectedInstitutions.includes(institution.id)}
                    disabled={
                      disabled ||
                      (!selectedInstitutions.includes(institution.id) &&
                        selectedInstitutions.length >= LOGOS_MAX_INSTITUTIONS)
                    }
                    onChange={(event) =>
                      set(
                        "institution_ids",
                        event.target.checked
                          ? [...selectedInstitutions, institution.id]
                          : selectedInstitutions.filter((id) => id !== institution.id),
                      )
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </fieldset>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {select("layout", "Layout", HERO_LAYOUTS, (option) => HERO_LAYOUT_LABELS[option], "default")}
        {select("image_position", "Enquadramento da imagem", IMAGE_POSITIONS, (option) => IMAGE_POSITION_LABELS[option], "right")}
        {select(
          "overlay",
          "Camada escura sobre a imagem",
          OVERLAYS,
          (option) => OVERLAY_LABELS[option],
          "medium",
          "Mais forte = texto mais legível sobre fotos claras.",
        )}
        {select("align", "Alinhamento", ALIGNS, (option) => ALIGN_LABELS[option], "left")}
        {select("image_side", "Posição da imagem", IMAGE_SIDES, (option) => IMAGE_SIDE_LABELS[option], "left")}
        {select("limit", "Quantidade de itens", LIMIT_OPTIONS, (option) => String(option), type === "projects" ? 3 : type === "publications" ? 5 : 6)}
        {type === "experiences"
          ? select("columns", "Colunas (telas largas)", EXPERIENCE_COLUMN_OPTIONS, (option) => `${option} colunas`, 2)
          : select("columns", "Colunas (telas largas)", COLUMN_OPTIONS, (option) => `${option} colunas`, 3)}
        {select(
          "background",
          "Fundo",
          backgrounds,
          (option) => BACKGROUND_LABELS[option],
          type === "cooperation" || type === "cta" ? "primary" : "default",
        )}
      </div>

      {has("show_primary_cta") && (
        <Checkbox
          id={`${idPrefix}-show_primary_cta`}
          label="Exibir o botão principal"
          checked={settings.show_primary_cta !== false}
          disabled={disabled}
          onChange={(event) => set("show_primary_cta", event.target.checked ? undefined : false)}
        />
      )}
      {has("show_secondary_cta") && (
        <Checkbox
          id={`${idPrefix}-show_secondary_cta`}
          label="Exibir o botão secundário"
          checked={settings.show_secondary_cta !== false}
          disabled={disabled}
          onChange={(event) => set("show_secondary_cta", event.target.checked ? undefined : false)}
        />
      )}
      {has("show_pillars") && (
        <Checkbox
          id={`${idPrefix}-show_pillars`}
          label="Exibir os pilares ao lado do texto"
          checked={settings.show_pillars !== false}
          disabled={disabled}
          onChange={(event) => set("show_pillars", event.target.checked ? undefined : false)}
        />
      )}
    </div>
  );
}

