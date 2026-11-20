"use client";

import { Plus } from "lucide-react";

import { countCharacters } from "@/lib/admin/validation";
import { moveItem, newKey } from "@/lib/site/lists";
import { NAV_LABEL_RULE, NAV_MAX, type NavDraft, type NavFieldErrors } from "@/lib/site/navigation";

import { Checkbox, describedBy, Field, TextInput } from "../form-controls";
import { HiddenBadge, ItemToolbar } from "./list-controls";

/** Links de um menu (cabeçalho ou rodapé). Lista controlada, somente administradores. */
export function NavigationFields({
  location,
  items,
  onChange,
  errors = {},
  disabled,
}: {
  location: "header" | "footer";
  items: NavDraft[];
  onChange: (items: NavDraft[]) => void;
  errors?: Record<string, NavFieldErrors>;
  disabled?: boolean;
}) {
  const update = (key: string, patch: Partial<NavDraft>) =>
    onChange(items.map((item) => (item.key === key ? { ...item, ...patch } : item)));

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col gap-3">
        {items.map((item, index) => {
          const id = `menu-${location}-${item.key}`;
          const itemErrors = errors[item.key] ?? {};
          const name = item.label.trim() || `Link ${index + 1}`;
          const external = /^https?:\/\//i.test(item.href.trim());
          return (
            <li key={item.key} className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-label">
                  {index + 1}. {name}
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
                  removeWarning="Excluir o link do menu?"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  id={`${id}-label`}
                  label="Texto do link"
                  required
                  error={itemErrors.label}
                  count={{ current: countCharacters(item.label), max: NAV_LABEL_RULE.max }}
                >
                  <TextInput
                    id={`${id}-label`}
                    value={item.label}
                    disabled={disabled}
                    onChange={(event) => update(item.key, { label: event.target.value })}
                    aria-invalid={Boolean(itemErrors.label)}
                    aria-describedby={describedBy(`${id}-label`, { error: itemErrors.label })}
                  />
                </Field>
                <Field
                  id={`${id}-href`}
                  label="Destino"
                  required
                  error={itemErrors.href}
                  hint="Página do site (ex.: /projetos) ou endereço completo https://…"
                >
                  <TextInput
                    id={`${id}-href`}
                    value={item.href}
                    disabled={disabled}
                    inputMode="url"
                    spellCheck={false}
                    onChange={(event) => update(item.key, { href: event.target.value })}
                    aria-invalid={Boolean(itemErrors.href)}
                    aria-describedby={describedBy(`${id}-href`, { hint: true, error: itemErrors.href })}
                  />
                </Field>
              </div>
              {external && (
                <Checkbox
                  id={`${id}-new-tab`}
                  label="Abrir em nova aba"
                  description="Recomendado para sites externos; o visitante é avisado."
                  checked={item.open_in_new_tab}
                  disabled={disabled}
                  onChange={(event) => update(item.key, { open_in_new_tab: event.target.checked })}
                />
              )}
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        disabled={disabled || items.length >= NAV_MAX}
        onClick={() =>
          onChange([
            ...items,
            { id: null, key: newKey("link"), label: "", href: "/", open_in_new_tab: false, is_visible: true },
          ])
        }
        className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl border border-dashed border-primary/50 px-4 text-label text-primary hover:bg-primary-soft disabled:opacity-50"
      >
        <Plus aria-hidden="true" className="size-4" />
        Adicionar link
      </button>
    </div>
  );
}
