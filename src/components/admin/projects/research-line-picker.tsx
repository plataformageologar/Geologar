"use client";

import { Search } from "lucide-react";
import { useId, useState } from "react";

import { Badge } from "@/components/ui/badge";
import type { ResearchLineOption } from "@/lib/queries/admin-content";

import { TextInput } from "../form-controls";

type ResearchLinePickerProps = {
  options: ResearchLineOption[];
  selected: string[];
  error?: string;
  onChange: (selected: string[]) => void;
};

/** A partir deste total de linhas aparece o campo de busca. */
const SEARCH_THRESHOLD = 8;

function normalize(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Seleção múltipla acessível: um grupo de checkboxes nativos (teclado e
 * leitores de tela sem biblioteca extra) com busca opcional. Linhas ocultas
 * pela busca continuam selecionadas (o envio usa o estado do formulário).
 */
export function ResearchLinePicker({ options, selected, error, onChange }: ResearchLinePickerProps) {
  const [query, setQuery] = useState("");
  const id = useId();
  const showSearch = options.length >= SEARCH_THRESHOLD;
  const term = normalize(query.trim());
  const visible = term ? options.filter((option) => normalize(option.title).includes(term)) : options;
  const hiddenSelected = selected.filter((value) => !visible.some((option) => option.id === value));

  function toggle(lineId: string, checked: boolean) {
    onChange(checked ? [...selected, lineId].sort() : selected.filter((value) => value !== lineId));
  }

  return (
    <fieldset
      id="research_line_ids"
      tabIndex={-1}
      aria-describedby={[`${id}-hint`, error ? `${id}-error` : null].filter(Boolean).join(" ")}
      aria-invalid={error ? true : undefined}
      className="flex min-w-0 flex-col gap-4 focus:outline-none"
    >
      <legend className="sr-only">Linhas de pesquisa relacionadas</legend>
      <p id={`${id}-hint`} className="text-body-sm text-muted-foreground">
        {selected.length === 0
          ? "Nenhuma linha selecionada."
          : selected.length === 1
            ? "1 linha selecionada."
            : `${selected.length} linhas selecionadas.`}{" "}
        O vínculo aparece no site quando o projeto e a linha estão publicados.
      </p>
      {error && (
        <p id={`${id}-error`} className="text-caption font-semibold text-danger">
          {error}
        </p>
      )}

      {showSearch && (
        <div className="relative">
          <label htmlFor={`${id}-search`} className="sr-only">
            Buscar linha de pesquisa
          </label>
          <Search aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-4 my-auto size-4 text-muted-foreground" />
          <TextInput
            id={`${id}-search`}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar linha de pesquisa"
            className="pl-11"
          />
        </div>
      )}

      {options.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">
          Nenhuma linha de pesquisa cadastrada ainda. Cadastre linhas em “Linhas de pesquisa”.
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {visible.map((option) => {
            const checkboxId = `${id}-${option.id}`;
            const checked = selected.includes(option.id);
            return (
              <li key={option.id}>
                <label
                  htmlFor={checkboxId}
                  className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-border px-4 py-3 transition-colors hover:border-primary/40 has-[:checked]:border-primary has-[:checked]:bg-primary-soft/60"
                >
                  <input
                    id={checkboxId}
                    type="checkbox"
                    name="research_line_ids"
                    value={option.id}
                    checked={checked}
                    onChange={(event) => toggle(option.id, event.target.checked)}
                    className="mt-0.5 size-5 shrink-0 cursor-pointer accent-primary"
                  />
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="text-body-sm font-semibold">{option.title}</span>
                    {!option.is_published && <Badge>Rascunho</Badge>}
                  </span>
                </label>
              </li>
            );
          })}
          {visible.length === 0 && (
            <li className="text-body-sm text-muted-foreground">Nenhuma linha encontrada para “{query}”.</li>
          )}
        </ul>
      )}

      {hiddenSelected.length > 0 && (
        <p className="text-caption text-muted-foreground">
          {hiddenSelected.length === 1
            ? "1 linha selecionada está fora do resultado da busca e continua selecionada."
            : `${hiddenSelected.length} linhas selecionadas estão fora do resultado da busca e continuam selecionadas.`}
        </p>
      )}
    </fieldset>
  );
}
