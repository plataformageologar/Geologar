import type { SectionSettings, SectionType } from "./sections";

export type SectionUnit<T> = { kind: "single"; section: T } | { kind: "pair"; left: T; right: T };

/**
 * Agrupa “Projetos” marcados para ficar ao lado das publicações
 * (`side_by_side`) com a seção de publicações logo em seguida (Etapa 10.7).
 * `canPair` decide se as duas podem dividir a largura (no site, a lista já
 * vem filtrada; no editor, só seções visíveis e com conteúdo). Se uma delas
 * some, a outra ocupa a largura toda.
 */
export function groupSections<T extends { section_type: SectionType; settings: SectionSettings }>(
  sections: readonly T[],
  canPair: (section: T) => boolean = () => true,
): SectionUnit<T>[] {
  const units: SectionUnit<T>[] = [];
  for (let index = 0; index < sections.length; index += 1) {
    const section = sections[index];
    const next = sections[index + 1];
    if (
      section.section_type === "projects" &&
      section.settings.side_by_side === true &&
      next?.section_type === "publications" &&
      canPair(section) &&
      canPair(next)
    ) {
      units.push({ kind: "pair", left: section, right: next });
      index += 1;
    } else {
      units.push({ kind: "single", section });
    }
  }
  return units;
}
