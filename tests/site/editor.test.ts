import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { historyReducer, initHistory } from "../../src/components/admin/editor/editor-history";
import {
  draftNavigation,
  draftPillars,
  editorKey,
  EDITOR_MESSAGE,
  parseCanvasMessage,
  type EditorDraft,
} from "../../src/lib/site/editor-document";

const draft: EditorDraft = {
  homepage: null,
  settings: null,
  pillars: [],
  sections: [],
  pageContent: null,
  navHeader: [],
  navFooter: [],
  navUseful: [],
  appearance: null,
};

describe("mensagens da tela do editor", () => {
  it("aceita apenas mensagens do protocolo com alvos válidos", () => {
    assert.deepEqual(parseCanvasMessage({ source: EDITOR_MESSAGE, type: "ready" }), { source: EDITOR_MESSAGE, type: "ready" });
    assert.equal(parseCanvasMessage({ source: "outro", type: "ready" }), null);
    assert.equal(parseCanvasMessage("ready"), null);
    assert.equal(parseCanvasMessage({ source: EDITOR_MESSAGE, type: "select", target: "section:<img>" }), null);
    assert.equal(parseCanvasMessage({ source: EDITOR_MESSAGE, type: "select", target: "body" }), null);
    const selected = parseCanvasMessage({ source: EDITOR_MESSAGE, type: "select", target: "header", record: { kind: "project", slug: "../x" } });
    assert.deepEqual(selected, { source: EDITOR_MESSAGE, type: "select", target: "header", record: null });
    assert.equal(parseCanvasMessage({ source: EDITOR_MESSAGE, type: "key", key: "rm -rf" }), null);
  });

  it("traduz atalhos de teclado", () => {
    const key = (key: string, extra: Partial<{ ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }> = {}) =>
      editorKey({ key, ctrlKey: false, metaKey: false, shiftKey: false, ...extra });
    assert.equal(key("z", { ctrlKey: true }), "undo");
    assert.equal(key("Z", { ctrlKey: true, shiftKey: true }), "redo");
    assert.equal(key("y", { metaKey: true }), "redo");
    assert.equal(key("s", { ctrlKey: true }), "save");
    assert.equal(key("Escape"), "escape");
    assert.equal(key("z"), null);
  });
});

describe("rascunho → componentes públicos", () => {
  it("omite itens ocultos ou incompletos", () => {
    const nav = draftNavigation([
      { id: null, key: "a", label: "Início", href: "/", open_in_new_tab: false, is_visible: true },
      { id: null, key: "b", label: "Oculto", href: "/rede", open_in_new_tab: false, is_visible: false },
      { id: null, key: "c", label: " ", href: "/x", open_in_new_tab: false, is_visible: true },
    ]);
    assert.deepEqual(nav, [{ label: "Início", href: "/", openInNewTab: false }]);
    const pillars = draftPillars([
      { id: null, key: "p", title: "Pesquisa", description: "", icon: "microscope", is_visible: true },
      { id: null, key: "q", title: "Oculto", description: "", icon: "microscope", is_visible: false },
    ]);
    assert.deepEqual(pillars, [{ id: "p", title: "Pesquisa", description: null, icon: "microscope" }]);
  });
});

describe("histórico do editor", () => {
  const nav = (label: string) => [{ id: null, key: "a", label, href: "/", open_in_new_tab: false, is_visible: true }];

  it("agrupa digitação contínua no mesmo campo e desfaz/refaz", () => {
    let state = initHistory(draft);
    state = historyReducer(state, { type: "change", slice: "navHeader", value: nav("I"), group: "nav", at: 1000 });
    state = historyReducer(state, { type: "change", slice: "navHeader", value: nav("In"), group: "nav", at: 1200 });
    state = historyReducer(state, { type: "change", slice: "navHeader", value: nav("Ini"), group: "nav", at: 1400 });
    assert.equal(state.past.length, 1);
    state = historyReducer(state, { type: "undo" });
    assert.deepEqual(state.present.navHeader, []);
    state = historyReducer(state, { type: "redo" });
    assert.equal(state.present.navHeader?.[0]?.label, "Ini");
  });

  it("separa passos de campos diferentes ou após uma pausa", () => {
    let state = initHistory(draft);
    state = historyReducer(state, { type: "change", slice: "navHeader", value: nav("A"), group: "nav", at: 1000 });
    state = historyReducer(state, { type: "change", slice: "navHeader", value: nav("AB"), group: "nav", at: 5000 });
    state = historyReducer(state, { type: "change", slice: "navFooter", value: nav("C"), group: "footer", at: 5100 });
    assert.equal(state.past.length, 3);
  });

  it("recomeça o histórico depois de salvar", () => {
    let state = initHistory(draft);
    state = historyReducer(state, { type: "change", slice: "navHeader", value: nav("A"), group: "nav", at: 1000 });
    state = historyReducer(state, { type: "saved", patch: { navHeader: nav("A (salvo)") } });
    assert.equal(state.past.length, 0);
    assert.equal(state.present.navHeader?.[0]?.label, "A (salvo)");
  });
});
