"use client";

import { Search } from "lucide-react";
import { useId, useState } from "react";

import { Badge } from "@/components/ui/badge";

import { TextInput } from "./form-controls";

export type RecordOption = { id: string; title: string; is_published: boolean };

type RecordPickerProps = {
  /** id do fieldset (foco no primeiro erro) e nome do campo. */
  id: string;
  legend: string;
  options: RecordOption[];
  selected: string[];
  error?: string;
  onChange: (selected: string[]) => void;
  /** Ex.: { one: "linha selecionada", many: "linhas selecionadas" }. */
  counter: { none: string; one: string; many: string };
  /** Texto complementar fixo (ex.: regra de exibição no site). */
  note?: string;
  searchLabel: string;
  emptyText: string;
};

/** A partir deste total de opções aparece o campo de busca. */
const SEARCH_THRESHOLD = 8;

function normalize(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Seleção múltipla acessível: grupo de checkboxes nativos (teclado e leitores
 * de tela sem biblioteca extra) com busca opcional. Itens ocultos pela busca
 * continuam selecionados (o envio usa o estado do formulário). Rascunhos
 * aparecem com selo próprio.
 */
export function RecordPicker({
  id,
  legend,
  options,
  selected,
  error,
  onChange,
  counter,
  note,
  searchLabel,
  emptyText,
}: RecordPickerProps) {
  const [query, setQuery] = useState("");
  const uid = useId();
  const showSearch = options.length >= SEARCH_THRESHOLD;
  const term = normalize(query.trim());
  const visible = term ? options.filter((option) => normalize(option.title).includes(term)) : options;
  const hiddenSelected = selected.filter((value) => !visible.some((option) => option.id === value));

  function toggle(optionId: string, checked: boolean) {
    onChange(checked ? [...selected, optionId].sort() : selected.filter((value) => value !== optionId));
  }

  return (
    <fieldset
      id={id}
      tabIndex={-1}
      aria-describedby={[`${uid}-hint`, error ? `${uid}-error` : null].filter(Boolean).join(" ")}
      aria-invalid={error ? true : undefined}
      className="flex min-w-0 flex-col gap-4 focus:outline-none"
    >
      <legend className="sr-only">{legend}</legend>
      <p id={`${uid}-hint`} className="text-body-sm text-muted-foreground">
        {selected.length === 0
          ? counter.none
          : selected.length === 1
            ? `1 ${counter.one}.`
            : `${selected.length} ${counter.many}.`}
        {note ? ` ${note}` : null}
      </p>
      {error && (
        <p id={`${uid}-error`} className="text-caption font-semibold text-danger">
          {error}
        </p>
      )}

      {showSearch && (
        <div className="relative">
          <label htmlFor={`${uid}-search`} className="sr-only">
            {searchLabel}
          </label>
          <Search aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-4 my-auto size-4 text-muted-foreground" />
          <TextInput
            id={`${uid}-search`}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchLabel}
            className="pl-11"
          />
        </div>
      )}

      {options.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {visible.map((option) => {
            const checkboxId = `${uid}-${option.id}`;
            return (
              <li key={option.id} className="min-w-0">
                <label
                  htmlFor={checkboxId}
                  className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-border px-4 py-3 transition-colors hover:border-primary/40 has-[:checked]:border-primary has-[:checked]:bg-primary-soft/60"
                >
                  <input
                    id={checkboxId}
                    type="checkbox"
                    name={id}
                    value={option.id}
                    checked={selected.includes(option.id)}
                    onChange={(event) => toggle(option.id, event.target.checked)}
                    className="mt-0.5 size-5 shrink-0 cursor-pointer accent-primary"
                  />
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="break-words text-body-sm font-semibold">{option.title}</span>
                    {!option.is_published && <Badge>Rascunho</Badge>}
                  </span>
                </label>
              </li>
            );
          })}
          {visible.length === 0 && (
            <li className="text-body-sm text-muted-foreground">Nenhum resultado para “{query}”.</li>
          )}
        </ul>
      )}

      {hiddenSelected.length > 0 && (
        <p className="text-caption text-muted-foreground">
          {hiddenSelected.length === 1
            ? "1 item selecionado está fora do resultado da busca e continua selecionado."
            : `${hiddenSelected.length} itens selecionados estão fora do resultado da busca e continuam selecionados.`}
        </p>
      )}
    </fieldset>
  );
}
