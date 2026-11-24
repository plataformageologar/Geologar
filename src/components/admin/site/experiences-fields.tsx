"use client";

import { ChevronDown, ExternalLink, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { countCharacters } from "@/lib/admin/validation";
import {
  AVAILABILITY_LABELS,
  EXPERIENCE_AVAILABILITY,
  EXPERIENCE_TEXT_RULES,
  EXPERIENCE_URL_MAX,
  EXPERIENCES_MAX,
  experienceId,
  isValidExperienceUrl,
  newExperience,
  type Experience,
  type ExperienceAvailability,
  type ExperienceFieldErrors,
} from "@/lib/site/experiences";
import { moveItem } from "@/lib/site/lists";
import { cn } from "@/lib/utils/cn";

import { Checkbox, describedBy, Field, Select, TextArea, TextInput } from "../form-controls";
import { MediaField } from "../media/media-field";
import { HiddenBadge, ItemToolbar } from "./list-controls";

type TextKey = keyof typeof EXPERIENCE_TEXT_RULES;

const TEXT_LABELS: Record<TextKey, string> = {
  title: "Título",
  label: "Identificação complementar",
  description: "Descrição",
  image_alt: "Texto alternativo da imagem",
  button_label: "Texto do botão",
  unavailable_label: "Texto quando não disponível",
};

const TEXT_HINTS: Partial<Record<TextKey, string>> = {
  label: "Ex.: Experiência imersiva 360°, Aplicação 3D, Mapa interativo.",
  image_alt: "Descreva a imagem para quem usa leitor de tela.",
  button_label: "Vazio: “Iniciar experiência”.",
  unavailable_label: "Aparece no lugar do botão (ex.: Em breve).",
};

/**
 * Lista editável das experiências digitais (CMS e editor visual): ordem,
 * visibilidade, disponibilidade, capa da biblioteca e endereço externo.
 * `focusId` abre o card escolhido (clique na tela do editor visual).
 */
export function ExperiencesFields({
  idPrefix,
  items,
  onChange,
  errors,
  listError,
  disabled,
  canUpload,
  focusId,
}: {
  idPrefix: string;
  items: Experience[];
  onChange: (items: Experience[]) => void;
  errors?: Record<string, ExperienceFieldErrors>;
  listError?: string;
  disabled?: boolean;
  canUpload: boolean;
  focusId?: string | null;
}) {
  const [open, setOpen] = useState<string | null>(focusId ?? null);
  const [lastFocus, setLastFocus] = useState(focusId);
  const listRef = useRef<HTMLOListElement>(null);

  // Card clicado na tela do editor: abre (durante a renderização) e rola até ele.
  if (focusId !== lastFocus) {
    setLastFocus(focusId);
    if (focusId) setOpen(focusId);
  }
  useEffect(() => {
    if (!focusId) return;
    const frame = window.requestAnimationFrame(() => {
      listRef.current
        ?.querySelector(`[data-experience-field="${CSS.escape(focusId)}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusId]);

  const update = (id: string, patch: Partial<Experience>) =>
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const setText = (item: Experience, key: TextKey, value: string) => {
    const next: Experience = { ...item };
    if (key === "title") next.title = value;
    else if (value === "") delete next[key];
    else next[key] = value;
    onChange(items.map((entry) => (entry.id === item.id ? next : entry)));
  };

  const add = () => {
    const id = experienceId();
    onChange([...items, newExperience(id)]);
    setOpen(id);
  };

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="text-label">Experiências</legend>
      <p className="text-caption text-muted-foreground">
        Até {EXPERIENCES_MAX} experiências. A experiência abre fora do portal, pelo endereço informado; o portal não
        verifica o endereço automaticamente — confira o link antes de publicar.
      </p>
      {listError && <p className="text-caption font-semibold text-danger">{listError}</p>}

      <ol ref={listRef} className="flex flex-col gap-3">
        {items.map((item, index) => {
          const cardErrors = errors?.[item.id] ?? {};
          const hasErrors = Object.keys(cardErrors).length > 0;
          const expanded = open === item.id;
          const base = `${idPrefix}-exp-${item.id}`;
          const panelId = `${base}-painel`;
          const name = item.title.trim() || `Experiência ${index + 1}`;

          const text = (key: TextKey, options: { required?: boolean } = {}) => {
            const id = `${base}-${key}`;
            const rule: { max: number; multiline?: boolean } = EXPERIENCE_TEXT_RULES[key];
            const value = key === "title" ? item.title : (item[key] ?? "");
            const hint = TEXT_HINTS[key];
            const common = {
              id,
              value,
              disabled,
              "aria-invalid": Boolean(cardErrors[key]),
              "aria-describedby": describedBy(id, { hint, error: cardErrors[key] }),
            };
            return (
              <Field
                id={id}
                label={TEXT_LABELS[key]}
                hint={hint}
                error={cardErrors[key]}
                required={options.required}
                count={{ current: countCharacters(value), max: rule.max }}
              >
                {rule.multiline ? (
                  <TextArea {...common} rows={4} onChange={(event) => setText(item, key, event.target.value)} />
                ) : (
                  <TextInput {...common} onChange={(event) => setText(item, key, event.target.value)} />
                )}
              </Field>
            );
          };

          const urlId = `${base}-external_url`;
          const urlHint = "Endereço completo e seguro (https://…). A experiência abre fora do portal.";
          const url = item.external_url ?? "";
          const availabilityId = `${base}-availability`;

          return (
            <li
              key={item.id}
              data-experience-field={item.id}
              className={cn(
                "scroll-mt-4 rounded-2xl border bg-surface",
                hasErrors ? "border-danger" : "border-border",
                !item.is_visible && "bg-surface-muted",
              )}
            >
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  onClick={() => setOpen(expanded ? null : item.id)}
                  className="flex min-h-11 flex-1 items-center gap-3 text-left"
                >
                  <ChevronDown
                    aria-hidden="true"
                    className={cn("size-5 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")}
                  />
                  <span className="flex min-w-0 flex-col">
                    <span className="text-label break-words">
                      {index + 1}. {name}
                    </span>
                    <span className="text-caption text-muted-foreground">
                      {AVAILABILITY_LABELS[item.availability]}
                      {hasErrors ? " · revise os campos" : ""}
                    </span>
                  </span>
                  {!item.is_visible && <HiddenBadge />}
                </button>
                <ItemToolbar
                  label={name}
                  index={index}
                  count={items.length}
                  disabled={disabled}
                  onMove={(offset) => onChange(moveItem(items, index, offset))}
                  visible={item.is_visible}
                  onToggleVisible={() => update(item.id, { is_visible: !item.is_visible })}
                  onRemove={() => {
                    onChange(items.filter((entry) => entry.id !== item.id));
                    if (open === item.id) setOpen(null);
                  }}
                  removeWarning="Remover a experiência? A imagem continua na biblioteca."
                />
              </div>

              <div id={panelId} hidden={!expanded} className="flex flex-col gap-5 border-t border-border p-4 sm:p-5">
                {text("title", { required: true })}
                {text("label")}
                {text("description")}

                <MediaField
                  id={`${base}-image_path`}
                  label="Imagem de capa"
                  hint="Horizontal (16:9), de preferência uma captura real da experiência ou do local retratado."
                  value={item.image_path ?? ""}
                  onChange={(value) => {
                    const next: Experience = { ...item };
                    if (value) next.image_path = value;
                    else delete next.image_path;
                    onChange(items.map((entry) => (entry.id === item.id ? next : entry)));
                  }}
                  error={cardErrors.image_path}
                  emptyText="Sem imagem: o card usa uma capa neutra da GeoLogar."
                  aspect="aspect-video max-w-md"
                  canUpload={canUpload}
                  disabled={disabled}
                >
                  {text("image_alt")}
                </MediaField>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field id={availabilityId} label="Disponibilidade" error={cardErrors.availability}>
                    <Select
                      id={availabilityId}
                      value={item.availability}
                      disabled={disabled}
                      aria-invalid={Boolean(cardErrors.availability)}
                      aria-describedby={describedBy(availabilityId, { error: cardErrors.availability })}
                      onChange={(event) => {
                        const option = EXPERIENCE_AVAILABILITY.find((value) => value === event.target.value);
                        if (option) update(item.id, { availability: option as ExperienceAvailability });
                      }}
                    >
                      {EXPERIENCE_AVAILABILITY.map((option) => (
                        <option key={option} value={option}>
                          {AVAILABILITY_LABELS[option]}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <div className="flex items-end pb-1">
                    <Checkbox
                      id={`${base}-open_in_new_tab`}
                      label="Abrir em nova aba"
                      description="Recomendado: o visitante não perde a página do portal."
                      checked={item.open_in_new_tab}
                      disabled={disabled}
                      onChange={(event) => update(item.id, { open_in_new_tab: event.target.checked })}
                    />
                  </div>
                </div>

                <Field
                  id={urlId}
                  label="Endereço de acesso"
                  hint={urlHint}
                  error={cardErrors.external_url}
                  required={item.availability === "available"}
                  count={{ current: countCharacters(url), max: EXPERIENCE_URL_MAX }}
                >
                  <TextInput
                    id={urlId}
                    value={url}
                    disabled={disabled}
                    inputMode="url"
                    type="url"
                    spellCheck={false}
                    autoComplete="off"
                    placeholder="https://"
                    aria-invalid={Boolean(cardErrors.external_url)}
                    aria-describedby={describedBy(urlId, { hint: urlHint, error: cardErrors.external_url })}
                    onChange={(event) => {
                      const next: Experience = { ...item };
                      if (event.target.value === "") delete next.external_url;
                      else next.external_url = event.target.value;
                      onChange(items.map((entry) => (entry.id === item.id ? next : entry)));
                    }}
                  />
                </Field>
                {isValidExperienceUrl(url) && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 w-fit items-center gap-2 text-label text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
                  >
                    Testar o endereço
                    <ExternalLink aria-hidden="true" className="size-4" />
                    <span className="sr-only">(abre em nova aba)</span>
                  </a>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  {text("button_label")}
                  {text("unavailable_label")}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {items.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-4 text-body-sm text-muted-foreground">
          Nenhuma experiência cadastrada. Enquanto não houver experiências visíveis, a seção não aparece no site.
        </p>
      )}

      <button
        type="button"
        onClick={add}
        disabled={disabled || items.length >= EXPERIENCES_MAX}
        className="inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-xl border border-primary/40 px-4 text-label text-primary hover:bg-primary-soft disabled:opacity-50"
      >
        <Plus aria-hidden="true" className="size-4" />
        Adicionar experiência
      </button>
      {items.length >= EXPERIENCES_MAX && (
        <p className="text-caption text-muted-foreground">A seção atingiu o limite de {EXPERIENCES_MAX} experiências.</p>
      )}
    </fieldset>
  );
}
