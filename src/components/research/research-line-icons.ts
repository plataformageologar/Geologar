import { Gem, Landmark, Layers, Recycle, Satellite, Sprout } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Ícones de apoio por linha (o slug é estável; o ícone não faz parte do conteúdo).
const icons: Record<string, LucideIcon> = {
  "geologia-e-geodiversidade": Layers,
  "recursos-minerais": Gem,
  "geologia-ambiental": Sprout,
  "sustentabilidade-e-economia-circular": Recycle,
  "patrimonio-geologico": Landmark,
  "geotecnologias-e-geoprocessamento": Satellite,
};

const tints = ["green", "earth", "blue"] as const;

export function researchLineIcon(slug: string): LucideIcon {
  return icons[slug] ?? Layers;
}

/** Alterna as cores de fundo dos cards pela posição na lista. */
export function researchLineTint(index: number) {
  return tints[index % tints.length];
}
