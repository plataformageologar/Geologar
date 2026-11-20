"use client";

import { Plus } from "lucide-react";

import { pillarIcons } from "@/components/network/pillar-list";
import { countCharacters } from "@/lib/admin/validation";
import { moveItem, newKey } from "@/lib/site/lists";
import {
  PILLAR_ICON_LABELS,
  PILLAR_ICONS,
  PILLAR_RULES,
  PILLARS_MAX,
  type PillarDraft,
  type PillarFieldErrors,
} from "@/lib/site/pillars";

import { describedBy, Field, Select, TextArea, TextInput } from "../form-controls";
import { HiddenBadge, ItemToolbar } from "./list-controls";

/** Edição dos pilares (lista completa, controlada). Usada no CMS e no editor visual. */
export function PillarsFields({
  items,
  onChange,
  errors = {},
  disabled,
  focusKey,
}: {
  items: PillarDraft[];
  onChange: (items: PillarDraft[]) => void;
  errors?: Record<string, PillarFieldErrors>;
  disabled?: boolean;
  /** Item destacado (selecionado no editor visual). */
  focusKey?: string;
}) {
  const update = (key: string, patch: Partial<PillarDraft>) =>
    onChange(items.map((item) => (item.key === key ? { ...item, ...patch } : item)));

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col gap-4">
        {items.map((item, index) => {
          const id = `pilar-${item.key}`;
          const itemErrors = errors[item.key] ?? {};
          const Icon = pillarIcons[item.icon];
          const name = item.title.trim() || `Pilar ${index + 1}`;
          return (
            <li
              key={item.key}
              data-item-key={item.key}
              className={
                "flex flex-col gap-4 rounded-2xl border bg-surface p-4 sm:p-5 " +
                (focusKey === item.key ? "border-primary ring-2 ring-primary/30" : "border-border")
              }
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="flex items-center gap-3 text-label">
                  <span className="inline-flex size-9 items-center justify-center rounded-lg bg-secondary-soft text-secondary">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <span>
                    {index + 1}. {name}
                  </span>
                  {!item.is_visible && <HiddenBadge />}
                </p>
                <ItemToolbar
                  label={name}
                  index={index}
                  count={items.length}
                  disabled={disabled}
                  onMove={(offset) => onChange(moveItem(items, index, offset))}
                  visible={item.is_visible}
                  onToggleVisible={() => update(item.key, { is_visible: !item.is_visible })}
                  onRemove={() => onChange(items.filter((entry) => entry.key !== item.key))}
                  removeWarning="Excluir o pilar? Para só tirá-lo do site, use Ocultar."
                />
              </div>
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,16rem)]">
                <Field
                  id={`${id}-title`}
                  label="Título"
                  required
                  error={itemErrors.title}
                  count={{ current: countCharacters(item.title), max: PILLAR_RULES.title.max }}
                >
                  <TextInput
                    id={`${id}-title`}
                    value={item.title}
                    disabled={disabled}
                    onChange={(event) => update(item.key, { title: event.target.value })}
                    aria-invalid={Boolean(itemErrors.title)}
                    aria-describedby={describedBy(`${id}-title`, { error: itemErrors.title })}
                  />
                </Field>
                <Field id={`${id}-icon`} label="Ícone" error={itemErrors.icon}>
                  <Select
                    id={`${id}-icon`}
                    value={item.icon}
                    disabled={disabled}
                    onChange={(event) => update(item.key, { icon: event.target.value as PillarDraft["icon"] })}
                  >
                    {PILLAR_ICONS.map((icon) => (
                      <option key={icon} value={icon}>
                        {PILLAR_ICON_LABELS[icon]}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field
                id={`${id}-description`}
                label="Descrição"
                error={itemErrors.description}
                count={{ current: countCharacters(item.description), max: PILLAR_RULES.description.max }}
              >
                <TextArea
                  id={`${id}-description`}
                  rows={2}
                  className="min-h-20"
                  value={item.description}
                  disabled={disabled}
                  onChange={(event) => update(item.key, { description: event.target.value })}
                  aria-invalid={Boolean(itemErrors.description)}
                  aria-describedby={describedBy(`${id}-description`, { error: itemErrors.description })}
                />
              </Field>
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        disabled={disabled || items.length >= PILLARS_MAX}
        onClick={() =>
          onChange([
            ...items,
            { id: null, key: newKey("pilar"), title: "", description: "", icon: "globe", is_visible: true },
          ])
        }
        className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl border border-dashed border-primary/50 px-4 text-label text-primary hover:bg-primary-soft disabled:opacity-50"
      >
        <Plus aria-hidden="true" className="size-4" />
        Adicionar pilar
      </button>
    </div>
  );
}
