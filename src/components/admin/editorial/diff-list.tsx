import type { DiffEntry, DiffKind } from "@/lib/editorial/content";

/** Comparação estruturada entre duas versões (texto, nunca só cor). */

const KIND_LABELS: Record<DiffKind, string> = {
  changed: "Alterado",
  added: "Adicionado",
  removed: "Removido",
  hidden: "Ocultado",
  shown: "Exibido",
  moved: "Mudou de posição",
};

const KIND_CLASSES: Record<DiffKind, string> = {
  changed: "bg-primary-soft text-primary",
  added: "bg-secondary-soft text-secondary",
  removed: "bg-danger-soft text-danger",
  hidden: "bg-surface-muted text-foreground",
  shown: "bg-secondary-soft text-secondary",
  moved: "bg-earth-soft text-earth",
};

function Value({ value, image }: { value: string | null | undefined; image?: boolean }) {
  if (value === undefined) return null;
  if (value === null || value === "") return <em className="text-muted-foreground">(vazio)</em>;
  return <span className={image ? "break-all font-mono text-caption" : "whitespace-pre-line break-words"}>{value}</span>;
}

export function DiffList({ entries, beforeLabel, afterLabel }: { entries: DiffEntry[]; beforeLabel: string; afterLabel: string }) {
  if (entries.length === 0) {
    return <p className="text-body-sm text-muted-foreground">Nenhuma diferença: as duas versões têm o mesmo conteúdo.</p>;
  }
  const areas = [...new Set(entries.map((entry) => entry.area))];
  return (
    <div className="flex flex-col gap-5">
      {areas.map((area) => (
        <section key={area} className="flex flex-col gap-2">
          <h3 className="text-label font-semibold">{area}</h3>
          <ul className="flex flex-col gap-2">
            {entries
              .filter((entry) => entry.area === area)
              .map((entry, index) => (
                <li key={`${entry.label}-${index}`} className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-caption font-semibold ${KIND_CLASSES[entry.kind]}`}>
                      {KIND_LABELS[entry.kind]}
                    </span>
                    <span className="text-body-sm font-semibold">{entry.label}</span>
                  </div>
                  {(entry.before !== undefined || entry.after !== undefined) && (
                    <dl className="grid gap-2 text-body-sm sm:grid-cols-2">
                      {entry.before !== undefined && (
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <dt className="text-caption text-muted-foreground">{beforeLabel}</dt>
                          <dd>
                            <Value value={entry.before} image={entry.image} />
                          </dd>
                        </div>
                      )}
                      {entry.after !== undefined && (
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <dt className="text-caption text-muted-foreground">{afterLabel}</dt>
                          <dd>
                            <Value value={entry.after} image={entry.image} />
                          </dd>
                        </div>
                      )}
                    </dl>
                  )}
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
