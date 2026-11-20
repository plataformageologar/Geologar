"use client";

import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, Trash2 } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils/cn";

const iconButton =
  "inline-flex size-10 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:pointer-events-none disabled:opacity-40";

/**
 * Ações de um item de lista ordenada: mover para cima/baixo (alternativa
 * acessível ao arrastar), ocultar/exibir, duplicar e excluir com
 * confirmação em dois passos. Cada botão diz o que faz e com qual item.
 */
export function ItemToolbar({
  label,
  index,
  count,
  onMove,
  visible,
  onToggleVisible,
  onDuplicate,
  onRemove,
  removeWarning,
  disabled,
}: {
  /** Nome do item, usado nos rótulos acessíveis ("Mover Pesquisa para cima"). */
  label: string;
  index: number;
  count: number;
  onMove: (offset: -1 | 1) => void;
  visible?: boolean;
  onToggleVisible?: () => void;
  onDuplicate?: () => void;
  onRemove?: () => void;
  removeWarning?: string;
  disabled?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);

  if (confirming && onRemove) {
    return (
      <div role="group" aria-label={`Confirmar exclusão de ${label}`} className="flex flex-wrap items-center gap-2">
        <span className="text-caption font-semibold text-danger">{removeWarning ?? "Excluir este item?"}</span>
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            onRemove();
          }}
          className="inline-flex min-h-10 items-center rounded-lg bg-danger px-3 text-label text-white hover:bg-danger/90"
        >
          Confirmar exclusão
        </button>
        <button
          type="button"
          autoFocus
          onClick={() => setConfirming(false)}
          className="inline-flex min-h-10 items-center rounded-lg border border-border px-3 text-label hover:border-primary/40"
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        className={iconButton}
        onClick={() => onMove(-1)}
        disabled={disabled || index === 0}
        aria-label={`Mover ${label} para cima`}
        title="Mover para cima"
      >
        <ArrowUp aria-hidden="true" className="size-4" />
      </button>
      <button
        type="button"
        className={iconButton}
        onClick={() => onMove(1)}
        disabled={disabled || index === count - 1}
        aria-label={`Mover ${label} para baixo`}
        title="Mover para baixo"
      >
        <ArrowDown aria-hidden="true" className="size-4" />
      </button>
      {onToggleVisible && (
        <button
          type="button"
          className={cn(iconButton, !visible && "border-earth/40 text-earth")}
          onClick={onToggleVisible}
          disabled={disabled}
          aria-pressed={!visible}
          aria-label={visible ? `Ocultar ${label}` : `Exibir ${label}`}
          title={visible ? "Ocultar no site" : "Exibir no site"}
        >
          {visible ? <Eye aria-hidden="true" className="size-4" /> : <EyeOff aria-hidden="true" className="size-4" />}
        </button>
      )}
      {onDuplicate && (
        <button
          type="button"
          className={iconButton}
          onClick={onDuplicate}
          disabled={disabled}
          aria-label={`Duplicar ${label}`}
          title="Duplicar"
        >
          <Copy aria-hidden="true" className="size-4" />
        </button>
      )}
      {onRemove && (
        <button
          type="button"
          className={cn(iconButton, "hover:border-danger/40 hover:text-danger")}
          onClick={() => setConfirming(true)}
          disabled={disabled}
          aria-label={`Excluir ${label}`}
          title="Excluir"
        >
          <Trash2 aria-hidden="true" className="size-4" />
        </button>
      )}
    </div>
  );
}

/** Selo textual (não só cor) para itens ocultos. */
export function HiddenBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-earth-soft px-2.5 py-0.5 text-caption font-semibold text-earth">
      <EyeOff aria-hidden="true" className="size-3" />
      Oculto
    </span>
  );
}
