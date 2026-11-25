import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { documentToken, parseDocumentToken } from "../../src/lib/admin/editorial";
import {
  diffContent,
  documentEditHref,
  hasPublishableDraft,
  pageContentDocument,
  parseContent,
  type NavItem,
  type SectionItem,
} from "../../src/lib/editorial/content";
import { partSlice, sliceErrors, slicesFromContent } from "../../src/lib/editorial/editor-slices";
import { resolveEditorPage } from "../../src/lib/site/editor-pages";
import { newBlockSettings, validateSectionList } from "../../src/lib/site/sections";

const DOC = "c9600000-0000-4000-8000-000000000123";

describe("token de documento (conflito de edição)", () => {
  it("ida e volta", () => {
    assert.deepEqual(parseDocumentToken(documentToken(DOC, 7)), { documentId: DOC, version: 7 });
  });

  it("recusa formatos inválidos", () => {
    assert.equal(parseDocumentToken(`${DOC}:-1`), null);
    assert.equal(parseDocumentToken(`${DOC}:1.5`), null);
    assert.equal(parseDocumentToken("2026-11-23T10:00:00Z"), null);
    assert.equal(parseDocumentToken(`${DOC}:1;drop`), null);
    assert.equal(parseDocumentToken(42), null);
  });
});

describe("conteúdo das unidades editoriais", () => {
  it("lê o JSONB de forma tolerante e só com as partes do tipo", () => {
    const content = parseContent("navigation", {
      header: [{ id: null, label: "Início", href: "/", open_in_new_tab: false, is_visible: true }],
      footer: [],
      intruso: { x: 1 },
    });
    assert.ok(content);
    assert.equal(content.header?.length, 1);
    assert.deepEqual(Object.keys(content).sort(), ["footer", "header", "useful"]);
    // Revisões anteriores aos Links úteis continuam legíveis (lista vazia).
    assert.deepEqual(content.useful, []);
    assert.equal(parseContent("navigation", "texto"), null);
  });

  it("descreve as diferenças entre versões (texto, ocultar, mover, incluir, remover)", () => {
    const text = (id: string, title: string, visible = true): SectionItem => ({
      id,
      section_type: "text",
      is_visible: visible,
      settings: { ...newBlockSettings("text"), title },
    });
    const before = { sections: [text("a", "Um"), text("b", "Dois"), text("c", "Três")] };
    const after = {
      sections: [text("b", "Dois", false), text("a", "Um (novo)"), { ...text("x", "Novo"), id: null }],
    };
    const kinds = diffContent("custom", before, after).map((entry) => entry.kind);
    assert.ok(kinds.includes("removed"), "bloco c removido");
    assert.ok(kinds.includes("added"), "bloco novo");
    assert.ok(kinds.includes("hidden"), "bloco b ocultado");
    assert.ok(kinds.includes("moved"), "ordem mudou");
    assert.ok(kinds.includes("changed"), "título alterado");
    assert.deepEqual(diffContent("custom", before, before), []);
  });

  it("compara links de menu pelo id", () => {
    const link = (id: string, href: string): NavItem => ({ id, label: "Contato", href, open_in_new_tab: false, is_visible: true });
    const entries = diffContent("navigation", { header: [link("1", "/contato")], footer: [] }, { header: [link("1", "/fale")], footer: [] });
    assert.equal(entries.length, 1);
    assert.equal(entries[0].kind, "changed");
    assert.equal(entries[0].after, "/fale");
  });

  it("indica a unidade e a tela do CMS de cada conteúdo", () => {
    assert.deepEqual(pageContentDocument("rede"), { type: "rede", key: "rede" });
    assert.deepEqual(pageContentDocument("contato"), { type: "page", key: "contato" });
    assert.equal(documentEditHref("custom", DOC), `/admin/paginas/${DOC}`);
    assert.equal(documentEditHref("page", "projetos"), "/admin/textos-das-paginas?pagina=projetos");
  });
});

describe("o que pode ser publicado", () => {
  it("sem rascunho não há o que publicar", () => {
    assert.equal(hasPublishableDraft({ type: "home", hasDraft: false, differs: false }), false);
    assert.equal(hasPublishableDraft({ type: "custom", hasDraft: false, differs: false }), false);
  });

  it("rascunho igual ao publicado não habilita Publicar", () => {
    assert.equal(hasPublishableDraft({ type: "home", hasDraft: true, differs: false }), false);
    assert.equal(hasPublishableDraft({ type: "navigation", hasDraft: true, differs: false }), false);
  });

  it("rascunho com diferenças pode ser publicado", () => {
    assert.equal(hasPublishableDraft({ type: "page", hasDraft: true, differs: true }), true);
  });

  it("página personalizada aceita rascunho igual (republicar depois de despublicar)", () => {
    assert.equal(hasPublishableDraft({ type: "custom", hasDraft: true, differs: false }), true);
  });
});

describe("páginas personalizadas", () => {
  it("aceitam somente blocos (nunca seções fixas do site)", () => {
    const empty = new Map();
    const ok = validateSectionList("custom", [{ id: null, key: "k1", section_type: "text", is_visible: true, settings: newBlockSettings("text") }], empty);
    assert.equal(ok.listError, null);
    assert.equal(ok.items.length, 1);
    const builtin = validateSectionList("custom", [{ id: null, key: "k1", section_type: "hero", is_visible: true, settings: {} }], empty);
    assert.ok(builtin.listError);
  });

  it("o editor visual abre /paginas/<endereço> válido e nada além disso", () => {
    assert.deepEqual(resolveEditorPage("/paginas/quem-somos"), {
      kind: "custom",
      slug: "quem-somos",
      path: "/paginas/quem-somos",
      label: "Página personalizada",
    });
    assert.equal(resolveEditorPage("/paginas/ab"), null);
    assert.equal(resolveEditorPage("/paginas/../admin"), null);
    assert.equal(resolveEditorPage("/paginas/Maiuscula"), null);
    assert.equal(resolveEditorPage("/paginas/x/y"), null);
  });
});

describe("fatias do editor visual", () => {
  it("convertem o conteúdo salvo de volta para o formato dos formulários", () => {
    const slices = slicesFromContent(["navHeader", "navFooter"], {
      header: [{ id: null, label: "Início", href: "/", open_in_new_tab: false, is_visible: true }],
      footer: [],
    });
    assert.equal(slices.navHeader?.[0].label, "Início");
    assert.equal(slices.navHeader?.[0].key, "novo-0");
    assert.deepEqual(slices.navFooter, []);
  });

  it("levam os erros de cada parte para a fatia certa", () => {
    assert.equal(partSlice("items"), "pillars");
    assert.equal(partSlice("page"), "pageContent");
    assert.deepEqual(sliceErrors("pageContent", { fieldErrors: { title: "x" } }), { pageContent: { title: "x" } });
    assert.deepEqual(sliceErrors("sections", { itemErrors: { k1: { title: "y" } } }), { sections: { k1: { title: "y" } } });
  });
});
