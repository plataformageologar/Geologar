import Image from "next/image";
import Link from "next/link";

import type { ResearchLineSummary } from "@/types/content";

/**
 * Card fotográfico de linha de pesquisa (Etapa 10.7): a imagem da linha
 * ocupa o card e o título fica sobre um degradê escuro, para manter o
 * contraste em qualquer fotografia. Sem imagem, fundo escuro com curvas de
 * nível. O card inteiro é o link.
 */
export function ResearchLinePhotoCard({
  researchLine,
  href,
  sizes,
}: {
  researchLine: ResearchLineSummary;
  href: string;
  sizes: string;
}) {
  return (
    <Link
      href={href}
      className="group relative isolate flex aspect-[4/5] overflow-hidden rounded-2xl bg-deep text-deep-foreground focus-visible:outline-ring sm:aspect-[3/4]"
    >
      {researchLine.image_path ? (
        <Image
          src={researchLine.image_path}
          alt={researchLine.image_alt ?? ""}
          fill
          sizes={sizes}
          className="-z-20 object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none"
        />
      ) : (
        <div aria-hidden="true" className="topo-pattern absolute inset-0 -z-20 text-white/[0.12]" />
      )}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/35 via-45% to-transparent"
      />
      <h3 className="mt-auto p-4 font-sans text-body leading-snug font-bold text-white break-words drop-shadow-[0_1px_2px_rgb(0_0_0/0.6)] md:p-5">
        {researchLine.title}
      </h3>
    </Link>
  );
}
