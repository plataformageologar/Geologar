import Image from "next/image";
import Link from "next/link";

import logo from "@/assets/brand/geologar-logo.png";
import { cn } from "@/lib/utils/cn";

const LOGO_ALT = "GeoLogar — página inicial";

/**
 * Logotipo com link para a página inicial. Sem logotipo configurado no CMS
 * (ou com referência inválida), usa o arquivo oficial incluído no código, um
 * recorte do logotipo circular sem alteração de proporções. O logotipo da
 * biblioteca é exibido inteiro (object-contain), na altura do cabeçalho e
 * com a proporção original.
 */
export function SiteLogo({ src, className }: { src?: string | null; className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex shrink-0 rounded-sm", className)}>
      {src ? (
        <Image
          src={src}
          alt={LOGO_ALT}
          // Proporção provisória até a imagem carregar; a altura é fixa e a
          // largura acompanha a proporção real do arquivo.
          width={320}
          height={112}
          priority
          sizes="240px"
          className="h-12 w-auto max-w-[11rem] object-contain object-left sm:max-w-[14rem] lg:h-14"
        />
      ) : (
        <Image src={logo} alt={LOGO_ALT} priority sizes="64px" className="h-12 w-auto lg:h-14" />
      )}
    </Link>
  );
}
