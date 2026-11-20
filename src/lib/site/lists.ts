import { isUuid } from "@/lib/admin/validation";

/** Utilitários das listas ordenadas (pilares, navegação, seções). */

export function isUuidOrNull(value: unknown): value is string | null {
  return value === null || isUuid(value);
}

/** Versões carregadas (id, updated_at) — formato aceito pelas funções do banco. */
export type ListVersion = { id: string; updated_at: string };

export function isListVersions(value: unknown): value is ListVersion[] {
  return (
    Array.isArray(value) &&
    value.length <= 100 &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        isUuid((item as ListVersion).id) &&
        typeof (item as ListVersion).updated_at === "string" &&
        (item as ListVersion).updated_at.length <= 40,
    )
  );
}

/** Move o item `index` uma posição para cima (-1) ou para baixo (+1). */
export function moveItem<T>(items: readonly T[], index: number, offset: -1 | 1): T[] {
  const target = index + offset;
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) return [...items];
  const next = [...items];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}

/** Chave estável para itens novos no navegador. */
export function newKey(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
