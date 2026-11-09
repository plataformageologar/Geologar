"use client";

import type { ResearchLineOption } from "@/lib/queries/admin-content";

import { RecordPicker } from "../record-picker";

type ResearchLinePickerProps = {
  options: ResearchLineOption[];
  selected: string[];
  error?: string;
  onChange: (selected: string[]) => void;
  /** Regra de exibição no site, conforme o formulário que usa a seleção. */
  note?: string;
};

/** Seleção das linhas de pesquisa relacionadas (projetos e publicações). */
export function ResearchLinePicker({
  options,
  selected,
  error,
  onChange,
  note = "O vínculo aparece no site quando o projeto e a linha estão publicados.",
}: ResearchLinePickerProps) {
  return (
    <RecordPicker
      id="research_line_ids"
      legend="Linhas de pesquisa relacionadas"
      options={options}
      selected={selected}
      error={error}
      onChange={onChange}
      counter={{ none: "Nenhuma linha selecionada.", one: "linha selecionada", many: "linhas selecionadas" }}
      note={note}
      searchLabel="Buscar linha de pesquisa"
      emptyText="Nenhuma linha de pesquisa cadastrada ainda. Cadastre linhas em “Linhas de pesquisa”."
    />
  );
}
