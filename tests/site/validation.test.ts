import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isLinkAvailable } from "../../src/lib/site/anchors";
import {
  appearanceCss,
  contrastRatio,
  DEFAULT_APPEARANCE,
  normalizeHex,
  validateAppearance,
} from "../../src/lib/site/appearance";
import { editorHref, resolveEditorPage } from "../../src/lib/site/editor-pages";
import { moveItem } from "../../src/lib/site/lists";
import { validateNavHref, validateNavList } from "../../src/lib/site/navigation";
import { resolvePageHeader, validatePageContent } from "../../src/lib/site/page-content";
import { validatePillarList } from "../../src/lib/site/pillars";
import {
  sanitizeSectionSettings,
  validateSectionList,
  validateSectionSettings,
  type SectionType,
} from "../../src/lib/site/sections";
import { safeAdminPath } from "../../src/lib/auth/redirect";

const UUID = "0b8c4c3e-5d1a-4f7e-9a8b-1c2d3e4f5a6b";
const OTHER_UUID = "1b8c4c3e-5d1a-4f7e-9a8b-1c2d3e4f5a6b";

describe("aparência", () => {
  it("normaliza cores hexadecimais e recusa outros formatos", () => {
    assert.equal(normalizeHex("#143B5C"), "#143b5c");
    assert.equal(normalizeHex("143b5c"), "#143b5c");
    assert.equal(normalizeHex("#abc"), "#aabbcc");
    assert.equal(normalizeHex("red"), null);
    assert.equal(normalizeHex("#143b5c;}body{display:none"), null);
  });

  it("calcula o contraste WCAG", () => {
    assert.equal(Math.round(contrastRatio("#000000", "#ffffff")), 21);
    assert.equal(contrastRatio("#ffffff", "#ffffff"), 1);
  });

  it("recusa cores com contraste insuficiente", () => {
    const { errors } = validateAppearance({ ...DEFAULT_APPEARANCE, primary_color: "#ffd700" });
    assert.ok(errors.primary_color);
  });

  it("aceita cores escuras e opções da lista", () => {
    const { data, errors } = validateAppearance({ ...DEFAULT_APPEARANCE, primary_color: "#0b3d2e", button_shape: "square" });
    assert.deepEqual(errors, {});
    assert.equal(data.primary_color, "#0b3d2e");
    assert.equal(data.button_shape, "square");
  });

  it("recusa opções fora da lista", () => {
    const { errors } = validateAppearance({ ...DEFAULT_APPEARANCE, heading_font: "Comic Sans" });
    assert.ok(errors.heading_font);
  });

  it("gera CSS apenas com variáveis conhecidas", () => {
    assert.equal(appearanceCss(DEFAULT_APPEARANCE), "");
    const css = appearanceCss({ ...DEFAULT_APPEARANCE, primary_color: "#0b3d2e", button_shape: "square" });
    assert.match(css, /^:root\{/);
    assert.match(css, /--primary:#0b3d2e/);
    assert.doesNotMatch(css, /<|>|url\(|@import/);
  });
});

describe("navegação", () => {
  it("aceita caminhos internos, âncoras e https", () => {
    assert.equal(validateNavHref("/rede"), null);
    assert.equal(validateNavHref("/#pesquisa"), null);
    assert.equal(validateNavHref("https://example.com/página"), null);
  });

  it("recusa a área administrativa, APIs e esquemas inseguros", () => {
    for (const href of ["/admin", "/admin/editor", "/api/editor-access", "/auth/confirm", "javascript:alert(1)", "ftp://example.com", "//example.com", "data:text/html,x"]) {
      assert.ok(validateNavHref(href), href);
    }
  });

  it("recusa ids que não são UUID", () => {
    const result = validateNavList([{ id: "1 or 1=1", key: "a", label: "Início", href: "/", open_in_new_tab: false, is_visible: true }]);
    assert.ok(result.listError);
  });
});

describe("pilares", () => {
  it("valida ícone da lista fixa e título obrigatório", () => {
    const result = validatePillarList([
      { id: null, key: "a", title: "", description: "", icon: "microscope", is_visible: true },
      { id: null, key: "b", title: "Ok", description: "", icon: "<svg onload=alert(1)>", is_visible: true },
    ]);
    assert.ok(result.errors.a?.title);
    assert.ok(result.errors.b?.icon || result.listError);
  });
});

describe("seções e blocos", () => {
  it("descarta chaves desconhecidas na leitura", () => {
    const settings = sanitizeSectionSettings("text", { title: "Título", html: "<script>x</script>", style: "color:red" });
    assert.deepEqual(Object.keys(settings), ["title"]);
  });

  it("recusa chaves desconhecidas na gravação", () => {
    const { errors } = validateSectionSettings("text", { title: "Título", sql: "drop table x" });
    assert.ok(errors.title);
  });

  it("recusa links externos inseguros e limites fora da faixa", () => {
    assert.ok(validateSectionSettings("cta", { title: "Chamada", cta_label: "Ir", cta_href: "javascript:alert(1)" }).errors.cta_href);
    assert.ok(validateSectionSettings("projects", { limit: 50 }).errors.limit);
  });

  it("aceita imagens da biblioteca e recusa caminhos arbitrários", () => {
    const ok = validateSectionSettings("image_text", {
      title: "Imagem",
      image_path: "uploads/0b8c4c3e-5d1a-4f7e-9a8b-1c2d3e4f5a6b.webp",
      image_alt: "Descrição",
    });
    assert.deepEqual(ok.errors, {});
    const bad = validateSectionSettings("image_text", { title: "Imagem", image_path: "https://example.com/x.png", image_alt: "x" });
    assert.ok(bad.errors.image_path);
  });

  it("não permite adicionar seções nativas nem trocar o tipo de uma existente", () => {
    const current = new Map<string, { section_type: SectionType; images: ReadonlySet<string> }>([
      [UUID, { section_type: "hero", images: new Set() }],
    ]);
    const added = validateSectionList("home", [
      { id: UUID, key: UUID, section_type: "hero", is_visible: true, settings: {} },
      { id: null, key: "novo", section_type: "hero", is_visible: true, settings: {} },
    ], current);
    assert.ok(added.listError);
    const changed = validateSectionList("home", [{ id: UUID, key: UUID, section_type: "text", is_visible: true, settings: {} }], current);
    assert.ok(changed.listError);
    const foreign = validateSectionList("home", [{ id: OTHER_UUID, key: "x", section_type: "text", is_visible: true, settings: {} }], current);
    assert.ok(foreign.listError);
  });

  it("move itens sem sair dos limites", () => {
    assert.deepEqual(moveItem(["a", "b", "c"], 0, 1), ["b", "a", "c"]);
    assert.deepEqual(moveItem(["a", "b", "c"], 0, -1), ["a", "b", "c"]);
  });
});

describe("textos das páginas", () => {
  it("usa o padrão quando o campo está vazio", () => {
    const empty = { eyebrow: null, title: null, description: null };
    assert.equal(resolvePageHeader("projetos", empty).title, "Projetos de pesquisa");
    const home = { about_title: "Sobre", about_description: "Texto", cooperation_description: "Coop" };
    assert.equal(resolvePageHeader("rede", empty, home).title, "Sobre");
    assert.equal(resolvePageHeader("contato", empty, home).description, "Coop");
  });

  it("recusa imagem de compartilhamento fora da biblioteca", () => {
    const { errors } = validatePageContent({ title: "x", seo_image_path: "https://example.com/a.png" }, null);
    assert.ok(errors.seo_image_path);
  });
});

describe("páginas do editor e redirecionamento", () => {
  it("aceita só páginas públicas conhecidas e detalhes com slug válido", () => {
    assert.equal(resolveEditorPage("/")?.kind, "home");
    assert.equal(resolveEditorPage("/projetos/meu-projeto")?.kind, "project");
    for (const value of ["https://example.com", "//example.com", "/admin", "/projetos/../admin", "/projetos/A B", "/pesquisa/x?y=1", "javascript:alert(1)"]) {
      assert.equal(resolveEditorPage(value), null, value);
    }
    assert.equal(editorHref("/rede"), "/admin/editor?pagina=%2Frede");
  });

  it("volta ao editor depois do login apenas para páginas permitidas", () => {
    assert.equal(safeAdminPath("/admin/editor?pagina=%2Frede"), "/admin/editor?pagina=%2Frede");
    assert.equal(safeAdminPath("/admin/editor?pagina=https%3A%2F%2Fexample.com"), "/admin");
    assert.equal(safeAdminPath("/admin/editor?pagina=%E0%A4%A"), "/admin");
  });

  it("filtra CTAs para âncoras ausentes", () => {
    assert.equal(isLinkAvailable("/#pesquisa", new Set(["pesquisa"])), true);
    assert.equal(isLinkAvailable("/#pesquisa", new Set()), false);
    assert.equal(isLinkAvailable("/contato", new Set()), true);
  });
});
