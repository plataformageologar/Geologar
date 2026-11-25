import { Globe } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Ícones simples (traço, 24 × 24) das redes mais comuns. O lucide-react não
 * inclui marcas; plataformas sem ícone usam o globo. Sempre decorativos: o
 * nome da rede aparece no texto do link.
 */
const PATHS: Record<string, ReactNode> = {
  instagram: (
    <>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M17.5 6.5h.01" />
    </>
  ),
  youtube: (
    <>
      <path d="M2.5 17a24 24 0 0 1 0-10 2 2 0 0 1 1.4-1.4 50 50 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24 24 0 0 1 0 10 2 2 0 0 1-1.4 1.4 50 50 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <path d="m10 15 5-3-5-3z" />
    </>
  ),
  linkedin: (
    <>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </>
  ),
  facebook: <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />,
  x: <path d="M4 4l11.7 16H20L8.3 4zM4 20l6.8-6.8M20 4l-6.8 6.8" />,
};
PATHS.twitter = PATHS.x;

export function SocialIcon({ platform, className }: { platform: string; className?: string }) {
  const paths = PATHS[platform];
  if (!paths) return <Globe aria-hidden="true" className={className} />;
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {paths}
    </svg>
  );
}
