"use client";

import { Palette, RotateCcw } from "lucide-react";
import { useState } from "react";

import {
  BUTTON_SHAPE_LABELS,
  BUTTON_SHAPES,
  CARD_STYLE_LABELS,
  CARD_STYLES,
  COLOR_FIELDS,
  COLOR_LABELS,
  CORNER_STYLE_LABELS,
  CORNER_STYLES,
  DEFAULT_APPEARANCE,
  DEFAULT_COLORS,
  HEADING_FONT_LABELS,
  HEADING_FONTS,
  REFERENCE_PRESET,
  SECTION_BACKGROUND_LABELS,
  SECTION_BACKGROUND_OPTIONS,
  SECTION_STYLE_LABELS,
  SECTION_STYLES,
  validateAppearance,
  type Appearance,
  type AppearanceFieldErrors,
} from "@/lib/site/appearance";

import { describedBy, Field, FormMessage, Select, TextInput } from "../form-controls";

const sameAppearance = (a: Appearance, b: Appearance) =>
  (Object.keys(a) as (keyof Appearance)[]).every((key) => a[key] === b[key]);

/**
 * Aparência do site a partir de opções controladas. O contraste é verificado
 * enquanto se escolhe a cor (a mesma regra é aplicada de novo no servidor).
 */
export function AppearanceFields({
  values,
  onChange,
  errors: serverErrors = {},
  disabled,
}: {
  values: Appearance;
  onChange: (values: Appearance) => void;
  errors?: AppearanceFieldErrors;
  disabled?: boolean;
}) {
  const [confirm, setConfirm] = useState<"reset" | "preset" | null>(null);
  const isPreset = sameAppearance(validateAppearance(values).data, REFERENCE_PRESET);
  const liveErrors = validateAppearance(values).errors;
  const errors = { ...serverErrors, ...liveErrors };

  const select = <
    K extends "section_background" | "button_shape" | "corner_style" | "heading_font" | "card_style" | "section_style",
  >(
    key: K,
    label: string,
    options: readonly Appearance[K][],
    labels: Record<Appearance[K], string>,
    hint?: string,
  ) => (
    <Field id={`aparencia-${key}`} label={label} hint={hint} error={errors[key]}>
      <Select
        id={`aparencia-${key}`}
        value={values[key]}
        disabled={disabled}
        aria-describedby={describedBy(`aparencia-${key}`, { hint, error: errors[key] })}
        onChange={(event) => onChange({ ...values, [key]: event.target.value as Appearance[K] })}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {labels[option]}
          </option>
        ))}
      </Select>
    </Field>
  );

  return (
    <div className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-5">
        <legend className="mb-2 text-label">Cores</legend>
        {COLOR_FIELDS.map((key) => {
          const current = values[key] ?? DEFAULT_COLORS[key];
          const id = `aparencia-${key}`;
          return (
            <Field key={key} id={id} label={COLOR_LABELS[key].label} hint={COLOR_LABELS[key].hint} error={errors[key]}>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="color"
                  aria-label={`${COLOR_LABELS[key].label}: seletor`}
                  value={/^#[0-9a-f]{6}$/i.test(current) ? current.toLowerCase() : DEFAULT_COLORS[key]}
                  disabled={disabled}
                  onChange={(event) => onChange({ ...values, [key]: event.target.value.toLowerCase() })}
                  className="h-12 w-16 cursor-pointer rounded-xl border border-border bg-surface p-1 disabled:cursor-not-allowed"
                />
                <TextInput
                  id={id}
                  value={current}
                  disabled={disabled}
                  spellCheck={false}
                  maxLength={7}
                  className="w-36 font-mono"
                  aria-invalid={Boolean(errors[key])}
                  aria-describedby={describedBy(id, { hint: true, error: errors[key] })}
                  onChange={(event) => onChange({ ...values, [key]: event.target.value.trim().toLowerCase() })}
                />
                <span
                  aria-hidden="true"
                  className="inline-flex min-h-12 items-center rounded-xl px-4 text-label text-white"
                  style={{ backgroundColor: /^#[0-9a-f]{6}$/i.test(current) ? current : DEFAULT_COLORS[key] }}
                >
                  Texto de exemplo
                </span>
                {values[key] !== null && values[key] !== DEFAULT_COLORS[key] && (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange({ ...values, [key]: null })}
                    className="text-label text-primary underline underline-offset-2"
                  >
                    Usar a cor padrão
                  </button>
                )}
              </div>
            </Field>
          );
        })}
      </fieldset>

      <div className="grid gap-5 md:grid-cols-2">
        {select("section_background", "Fundo das páginas", SECTION_BACKGROUND_OPTIONS, SECTION_BACKGROUND_LABELS)}
        {select("heading_font", "Fonte dos títulos", HEADING_FONTS, HEADING_FONT_LABELS)}
        {select("button_shape", "Formato dos botões", BUTTON_SHAPES, BUTTON_SHAPE_LABELS)}
        {select("corner_style", "Cantos de cards e imagens", CORNER_STYLES, CORNER_STYLE_LABELS)}
        {select("card_style", "Estilo dos cards", CARD_STYLES, CARD_STYLE_LABELS)}
        {select(
          "section_style",
          "Seções das páginas públicas",
          SECTION_STYLES,
          SECTION_STYLE_LABELS,
          "Compactas: menos espaço entre as seções e títulos em caixa alta com marcador.",
        )}
      </div>

      {Object.keys(liveErrors).length > 0 && (
        <FormMessage tone="warning">
          Alguma cor não tem contraste suficiente com textos brancos ou com o fundo. Ajuste antes de salvar.
        </FormMessage>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
        {confirm ? (
          <>
            <span className="text-body-sm font-semibold">
              {confirm === "preset"
                ? "Substituir as opções atuais pelo preset “Referência GeoLogar”?"
                : "Voltar todas as opções ao padrão da GeoLogar?"}
            </span>
            <button
              type="button"
              onClick={() => {
                onChange(confirm === "preset" ? REFERENCE_PRESET : DEFAULT_APPEARANCE);
                setConfirm(null);
              }}
              className="inline-flex min-h-10 items-center rounded-lg bg-primary px-3 text-label text-primary-foreground"
            >
              {confirm === "preset" ? "Aplicar preset" : "Restaurar padrão"}
            </button>
            <button
              type="button"
              autoFocus
              onClick={() => setConfirm(null)}
              className="inline-flex min-h-10 items-center rounded-lg border border-border px-3 text-label"
            >
              Cancelar
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={disabled || isPreset}
              onClick={() => setConfirm("preset")}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-label hover:border-primary/40 disabled:opacity-50"
            >
              <Palette aria-hidden="true" className="size-4" />
              {isPreset ? "Preset “Referência GeoLogar” em uso" : "Aplicar preset “Referência GeoLogar”"}
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => setConfirm("reset")}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-label hover:border-primary/40 disabled:opacity-50"
            >
              <RotateCcw aria-hidden="true" className="size-4" />
              Restaurar aparência padrão
            </button>
          </>
        )}
        <p className="basis-full text-caption text-muted-foreground">
          O preset e a restauração só preenchem o formulário: nada muda no site antes de salvar o rascunho e publicar.
          Depois de aplicar, cada cor e opção continua editável.
        </p>
      </div>
    </div>
  );
}
