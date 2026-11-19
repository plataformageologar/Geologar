import { homepageFields, type HomepageRecord } from "@/lib/admin/homepage";
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

export const homepageEditColumns = [...homepageFields, "updated_at"].join(", ");

export type HomepageForEdit =
  | {
      status: "ready";
      record: HomepageRecord;
      /** Versão carregada, usada para detectar edições simultâneas. */
      updatedAt: string;
    }
  | { status: "missing" }
  | { status: "error" };

/**
 * Registro único de `homepage_content` para o CMS, lido com a sessão do
 * editor. Diferente de `getHomepageContent()`, nunca recorre ao fallback
 * editorial: falha de leitura e registro ausente são informados como tais.
 */
export async function getHomepageForEdit(): Promise<HomepageForEdit> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("homepage_content")
    .select(homepageEditColumns)
    .maybeSingle<HomepageRecord & { updated_at: string }>();

  if (error) {
    logQueryError("homepage_content (CMS)", error);
    return { status: "error" };
  }
  if (!data) return { status: "missing" };

  const { updated_at, ...record } = data;
  return { status: "ready", record, updatedAt: updated_at };
}
