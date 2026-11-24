import Image from "next/image";
import Link from "next/link";

import symbol from "@/assets/brand/geologar-symbol.png";
import { cn } from "@/lib/utils/cn";

const HOME_LABEL = "página inicial";

/**
 * Nome “GeoLogar” com as cores da referência visual: “Geo” no azul da marca
 * e “Logar” no tom terroso das ações. Outros nomes aparecem em uma cor só.
 */
function Wordmark({ name }: { name: string }) {
  const match = /^(Geo)(Logar)$/.exec(name);
  return (
    <span className="font-sans text-[1.625rem] leading-none font-bold tracking-[-0.01em] lg:text-[2rem]">
      {match ? (
        <>
          <span className="text-brand-blue">{match[1]}</span>
          <span className="text-primary">{match[2]}</span>
        </>
      ) : (
        <span className="text-brand-blue">{name}</span>
      )}
    </span>
  );
}

/**
 * Marca do cabeçalho com link para a página inicial.
 *
 * Sem logotipo configurado no CMS: símbolo oficial (recorte do arquivo
 * oficial, sem o texto, sem redesenho nem distorção) + nome do site em texto
 * + nome institucional — o nome aparece uma vez só. Com logotipo da
 * biblioteca de mídia: a imagem é exibida sozinha e inteira (object-contain),
 * porque ela pode já conter o nome.
 */
export function SiteBrand({
  src,
  siteName,
  tagline,
  className,
}: {
  src?: string | null;
  siteName?: string | null;
  tagline?: string | null;
  className?: string;
}) {
  const name = siteName?.trim() || "GeoLogar";

  if (src) {
    return (
      <Link href="/" className={cn("inline-flex shrink-0 rounded-sm", className)}>
        <Image
          src={src}
          alt={`${name} — ${HOME_LABEL}`}
          // Proporção provisória até a imagem carregar; a altura é fixa e a
          // largura acompanha a proporção real do arquivo.
          width={320}
          height={112}
          priority
          sizes="240px"
          className="h-12 w-auto max-w-[11rem] object-contain object-left sm:max-w-[14rem] lg:h-16"
        />
      </Link>
    );
  }

  return (
    <Link href="/" aria-label={`${name} — ${HOME_LABEL}`} className={cn("flex min-w-0 shrink items-center gap-3 rounded-sm", className)}>
      <Image src={symbol} alt="" priority sizes="96px" className="h-10 w-auto shrink-0 lg:h-14" />
      <span className="flex min-w-0 flex-col gap-1">
        <Wordmark name={name} />
        {tagline && (
          <span className="hidden max-w-[28rem] text-caption leading-snug text-muted-foreground sm:block">
            {tagline}
          </span>
        )}
      </span>
    </Link>
  );
}
