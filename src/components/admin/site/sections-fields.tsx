"use client";

import { ChevronDown, Plus } from "lucide-react";
import { useState } from "react";

import { moveItem, newKey } from "@/lib/site/lists";
import {
  BLOCK_DESCRIPTIONS,
  BLOCK_TYPES,
  isBlockType,
  newBlockSettings,
  SECTION_LABELS,
  SECTIONS_MAX,
  type BlockType,
  type SectionDraft,
  type SectionFieldErrors,
  type SectionScope,
} from "@/lib/site/sections";
import { cn } from "@/lib/utils/cn";

import { Field, FormMessage, Select } from "../form-controls";
import { HiddenBadge, ItemToolbar } from "./list-controls";
import { SectionSettingsFields, type InstitutionOption } from "./section-settings-fields";

/** Seções nativas cujo conteúdo vem de outros módulos do CMS. */
export const CONTENT_NOTES: Partial<Record<SectionDraft["section_type"], { text: string; href: string }>> = {
  hero: { text: "Título, texto, imagem e botões do banner ficam em Homepage.", href: "/admin/homepage" },
  about: { text: "Título e texto da apresentação ficam em Homepage; os pilares, em Pilares da rede.", href: "/admin/homepage" },
  pillars: { text: "Os pilares são editados em Pilares da rede.", href: "/admin/pilares" },
  research: { text: "As linhas exibidas são as publicadas (destaques primeiro).", href: "/admin/linhas-de-pesquisa" },
  projects: { text: "Aparecem os projetos publicados marcados como destaque.", href: "/admin/projetos" },
  publications: { text: "Aparecem as publicações publicadas (destaques e mais recentes primeiro).", href: "/admin/publicacoes" },
  institutions: { text: "Aparecem as instituições publicadas, por categoria.", href: "/admin/instituicoes" },
  cooperation: { text: "Título, texto e botão da chamada ficam em Homepage.", href: "/admin/homepage" },
};

export function sectionTitle(section: SectionDraft) {
  const custom = section.settings.title?.trim();
  return isBlockType(section.section_type) && custom
    ? `${SECTION_LABELS[section.section_type]}: ${custom}`
    : SECTION_LABELS[section.section_type];
}

/**
 * Lista de seções de uma página: ordem (mover para cima/baixo), visibilidade,
 * configurações e blocos (adicionar, duplicar, excluir). Seções nativas só
 * podem ser ocultadas.
 */
export function SectionsFields({
  page,
  items,
  onChange,
  errors = {},
  disabled,
  canUpload,
  institutions,
}: {
  page: SectionScope;
  items: SectionDraft[];
  onChange: (items: SectionDraft[]) => void;
  errors?: Record<string, SectionFieldErrors>;
  disabled?: boolean;
  canUpload: boolean;
  institutions: InstitutionOption[];
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [blockType, setBlockType] = useState<BlockType>("text");

  const update = (key: string, patch: Partial<SectionDraft>) =>
    onChange(items.map((item) => (item.key === key ? { ...item, ...patch } : item)));

  const addBlock = () => {
    const key = newKey("bloco");
    onChange([...items, { id: null, key, section_type: blockType, is_visible: true, settings: newBlockSettings(blockType) }]);
    setOpen(key);
  };

  return (
    <div className="flex flex-col gap-5">
      <ol className="flex flex-col gap-3">
        {items.map((section, index) => {
          const name = sectionTitle(section);
          const expanded = open === section.key;
          const panelId = `secao-${section.key}-painel`;
          const sectionErrors = errors[section.key];
          const note = CONTENT_NOTES[section.section_type];
          return (
            <li
              key={section.key}
              className={cn(
                "rounded-2xl border bg-surface",
                sectionErrors ? "border-danger" : "border-border",
                !section.is_visible && "bg-surface-muted",
              )}
            >
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  onClick={() => setOpen(expanded ? null : section.key)}
                  className="flex min-h-11 flex-1 items-center gap-3 text-left"
                >
                  <ChevronDown
                    aria-hidden="true"
                    className={cn("size-5 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")}
                  />
                  <span className="flex flex-col">
                    <span className="text-label">
                      {index + 1}. {name}
                    </span>
                    <span className="text-caption text-muted-foreground">
                      {isBlockType(section.section_type) ? "Bloco" : "Seção da página"}
                      {sectionErrors ? " · revise os campos" : ""}
                    </span>
                  </span>
                  {!section.is_visible && <HiddenBadge />}
                </button>
                <ItemToolbar
                  label={name}
                  index={index}
                  count={items.length}
                  disabled={disabled}
                  onMove={(offset) => onChange(moveItem(items, index, offset))}
                  visible={section.is_visible}
                  onToggleVisible={() => update(section.key, { is_visible: !section.is_visible })}
                  onDuplicate={
                    isBlockType(section.section_type) && items.length < SECTIONS_MAX
                      ? () => {
                          const copy = { ...section, id: null, key: newKey("bloco"), settings: structuredClone(section.settings) };
                          onChange([...items.slice(0, index + 1), copy, ...items.slice(index + 1)]);
                        }
                      : undefined
                  }
                  onRemove={
                    isBlockType(section.section_type)
                      ? () => onChange(items.filter((item) => item.key !== section.key))
                      : undefined
                  }
                  removeWarning="Excluir o bloco? Imagens continuam na biblioteca."
                />
              </div>
              <div id={panelId} hidden={!expanded} className="border-t border-border p-4 sm:p-5">
                {note && (
                  <p className="mb-5 text-body-sm text-muted-foreground">
                    {note.text}{" "}
                    <a href={note.href} className="font-semibold text-primary underline underline-offset-2">
                      Abrir
                    </a>
                  </p>
                )}
                <SectionSettingsFields
                  idPrefix={`secao-${section.key}`}
                  type={section.section_type}
                  settings={section.settings}
                  onChange={(settings) => update(section.key, { settings })}
                  errors={sectionErrors}
                  disabled={disabled}
                  canUpload={canUpload}
                  institutions={institutions}
                />
              </div>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-border p-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Field
            id={`novo-bloco-${page}`}
            label="Adicionar bloco"
            hint={BLOCK_DESCRIPTIONS[blockType]}
          >
            <Select
              id={`novo-bloco-${page}`}
              value={blockType}
              disabled={disabled}
              onChange={(event) => setBlockType(event.target.value as BlockType)}
              aria-describedby={`novo-bloco-${page}-hint`}
            >
              {BLOCK_TYPES.map((type) => (
                <option key={type} value={type}>
                  {SECTION_LABELS[type]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <button
          type="button"
          onClick={addBlock}
          disabled={disabled || items.length >= SECTIONS_MAX}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-label text-primary-foreground hover:bg-primary-hover disabled:opacity-50 sm:mb-6"
        >
          <Plus aria-hidden="true" className="size-4" />
          Adicionar no fim da página
        </button>
      </div>
      {items.length >= SECTIONS_MAX && (
        <FormMessage tone="info">A página atingiu o limite de {SECTIONS_MAX} seções.</FormMessage>
      )}
    </div>
  );
}
