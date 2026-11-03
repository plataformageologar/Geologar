import { createClient } from "@/lib/supabase/server";

import { logQueryError } from "./shared";

export type ContentCount = {
  id: "research_lines" | "projects" | "publications" | "institutions";
  label: string;
  /** Página pública correspondente. */
  href: string;
  /** `null` quando a contagem não pôde ser obtida (nunca um valor presumido). */
  total: number | null;
};

const tables: Omit<ContentCount, "total">[] = [
  { id: "research_lines", label: "Linhas de pesquisa", href: "/pesquisa" },
  { id: "projects", label: "Projetos", href: "/projetos" },
  { id: "publications", label: "Publicações", href: "/publicacoes" },
  { id: "institutions", label: "Instituições", href: "/instituicoes" },
];

/**
 * Totais de conteúdo **publicado** para o painel, contados no banco com a
 * sessão do usuário (mesmas regras de RLS do site: apenas publicados).
 */
export async function getPublishedContentCounts(): Promise<ContentCount[]> {
  const supabase = await createClient();

  return Promise.all(
    tables.map(async (table) => {
      const { count, error } = await supabase
        .from(table.id)
        .select("id", { count: "exact", head: true })
        .eq("is_published", true);

      if (error) logQueryError(`${table.id} count`, error);
      return { ...table, total: error ? null : count };
    }),
  );
}
