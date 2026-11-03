import Image from "next/image";

import { cn } from "@/lib/utils/cn";
import { safeExternalUrl } from "@/lib/utils/format";
import type { InstitutionSummary } from "@/types/content";

/**
 * Área padronizada para cada marca: o logotipo é contido (object-contain),
 * sem deformação nem alteração de cor, centralizado em um fundo neutro. Sem
 * logotipo, exibe o nome da instituição.
 */
export function InstitutionLogo({ institution }: { institution: InstitutionSummary }) {
  const label = institution.acronym
    ? `${institution.name} (${institution.acronym})`
    : institution.name;
  const websiteUrl = safeExternalUrl(institution.website_url);

  const tile = (
    <span
      className={cn(
        "relative flex aspect-[3/2] items-center justify-center rounded-xl border bg-surface p-4",
        institution.logo_path ? "border-border" : "border-dashed border-border",
      )}
    >
      {institution.logo_path ? (
        <span className="relative size-full">
          <Image
            src={institution.logo_path}
            alt={institution.logo_alt ?? label}
            fill
            sizes="(min-width: 1024px) 180px, (min-width: 640px) 30vw, 45vw"
            className="object-contain"
          />
        </span>
      ) : (
        <span className="text-center text-caption break-words text-muted-foreground">{label}</span>
      )}
    </span>
  );

  return websiteUrl ? (
    <a href={websiteUrl} className="block rounded-xl transition-colors hover:[&>span]:border-primary/40">
      {tile}
    </a>
  ) : (
    tile
  );
}
