/**
 * Páginas que o editor visual abre. `pagina` vem da URL e só é aceita se for
 * um destes caminhos (ou um detalhe com slug válido): nunca uma URL externa
 * ou um caminho arbitrário.
 */

export type EditorListKey = "pesquisa" | "projetos" | "publicacoes" | "instituicoes" | "contato";

export type EditorPage =
  | { kind: "home"; path: "/"; label: string }
  | { kind: "rede"; path: "/rede"; label: string }
  | { kind: "list"; key: EditorListKey; path: string; label: string }
  | { kind: "project"; slug: string; path: string; label: string }
  | { kind: "research-line"; slug: string; path: string; label: string }
  | { kind: "custom"; slug: string; path: string; label: string };

export const EDITOR_PAGES: readonly EditorPage[] = [
  { kind: "home", path: "/", label: "Página inicial" },
  { kind: "rede", path: "/rede", label: "A Rede" },
  { kind: "list", key: "pesquisa", path: "/pesquisa", label: "Pesquisa" },
  { kind: "list", key: "projetos", path: "/projetos", label: "Projetos" },
  { kind: "list", key: "publicacoes", path: "/publicacoes", label: "Publicações" },
  { kind: "list", key: "instituicoes", path: "/instituicoes", label: "Instituições" },
  { kind: "list", key: "contato", path: "/contato", label: "Contato" },
];

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function resolveEditorPage(value: unknown): EditorPage | null {
  if (typeof value !== "string" || value.length > 200) return null;
  const fixed = EDITOR_PAGES.find((page) => page.path === value);
  if (fixed) return fixed;

  const custom = /^\/paginas\/([^/?#]+)$/.exec(value);
  if (custom) {
    const slug = custom[1];
    if (slug.length < 3 || slug.length > 100 || !SLUG.test(slug)) return null;
    return { kind: "custom", slug, path: value, label: "Página personalizada" };
  }

  const detail = /^\/(projetos|pesquisa)\/([^/?#]+)$/.exec(value);
  if (!detail || detail[2].length > 160 || !SLUG.test(detail[2])) return null;
  const slug = detail[2];
  return detail[1] === "projetos"
    ? { kind: "project", slug, path: value, label: "Projeto" }
    : { kind: "research-line", slug, path: value, label: "Linha de pesquisa" };
}

/** Endereço do editor para uma página pública (ou `null` se não editável). */
export function editorHref(path: string): string | null {
  const page = resolveEditorPage(path);
  return page ? `/admin/editor?pagina=${encodeURIComponent(page.path)}` : null;
}
