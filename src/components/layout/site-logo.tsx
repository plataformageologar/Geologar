import Image from "next/image";
import Link from "next/link";

import logo from "@/assets/brand/geologar-logo.png";
import { cn } from "@/lib/utils/cn";

/**
 * Logotipo oficial com link para a página inicial.
 * O arquivo é um recorte do logotipo circular, sem alteração de proporções.
 */
export function SiteLogo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex shrink-0 rounded-sm", className)}>
      <Image
        src={logo}
        alt="GeoLogar — página inicial"
        priority
        sizes="64px"
        className="h-12 w-auto lg:h-14"
      />
    </Link>
  );
}
