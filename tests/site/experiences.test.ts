import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { diffContent, type SectionItem } from "../../src/lib/editorial/content";
import { EDITOR_MESSAGE, parseCanvasMessage } from "../../src/lib/site/editor-document";
import {
  EXPERIENCES_MAX,
  experienceLink,
  isValidExperienceUrl,
  newExperience,
  sanitizeExperiences,
  unavailableText,
  validateExperiences,
  type Experience,
} from "../../src/lib/site/experiences";
import {
  addableSectionTypes,
  isAllowedOnPage,
  newBlockSettings,
  sanitizeSectionSettings,
  sectionImagePaths,
  validateSectionList,
  validateSectionSettings,
} from "../../src/lib/site/sections";

const ID_A = "e1000000-0000-4000-8000-000000000001";
const ID_B = "e1000000-0000-4000-8000-000000000002";
const SEED_IMAGE = "/images/experiencias/bege-bahia-pedreira.webp";
const MEDIA_IMAGE = "uploads/0b6c2c2e-6d8f-4a7e-9c11-3f1a2b3c4d5e.webp";

const card = (id: string, patch: Partial<Experience> = {}): Experience => ({
  id,
  title: "Tour de teste",
  availability: "available",
  external_url: "https://experiencias.example.com/tour/",
  is_visible: true,
  open_in_new_tab: true,
  ...patch,
});

const acceptAll = () => true;

describe("endereço das experiências", () => {
  it("aceita somente https:// com domínio", () => {
    assert.equal(isValidExperienceUrl("https://bernardo-aeonvr.github.io/Geologar-2/"), true);
    assert.equal(isValidExperienceUrl("https://example.com/caminho?x=1#cena"), true);
    assert.equal(isValidExperienceUrl("https://example.com:8443/app"), true);
  });

  it("recusa protocolos perigosos, endereços malformados e credenciais", () => {
    for (const value of [
      "javascript:alert(1)",
      "JAVASCRIPT:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "file:///C:/Windows/win.ini",
      "http://example.com/tour",
      "#",
      "/experiencias",
      "https://localhost/app",
      "https://exa mple.com/app",
      "https://user:senha@example.com/app",
      "https://example.com\\app",
      "https://example.com/\napp",
      `https://example.com/${"a".repeat(300)}`,
      "",
      null,
      42,
    ]) {
      assert.equal(isValidExperienceUrl(value), false, String(value));
    }
  });
});

describe("lista de experiências", () => {
  it("valida campos obrigatórios e a regra de disponibilidade", () => {
    const result = validateExperiences(
      [
        card(ID_A),
        card(ID_B, { title: " ", availability: "available", external_url: undefined }),
      ],
      acceptAll,
    );
    assert.equal(result.listError, null);
    assert.equal(result.data.length, 1);
    assert.ok(result.errors[ID_B]?.title);
    assert.match(result.errors[ID_B]?.external_url ?? "", /disponível/);
  });

  it("“Em breve” não exige endereço e mantém o card", () => {
    const result = validateExperiences([card(ID_A, { availability: "coming_soon", external_url: undefined })], acceptAll);
    assert.deepEqual(result.errors, {});
    assert.equal(result.data[0].availability, "coming_soon");
  });

  it("explica o erro de endereço inseguro", () => {
    const result = validateExperiences([card(ID_A, { external_url: "http://example.com/tour" })], acceptAll);
    assert.match(result.errors[ID_A]?.external_url ?? "", /https:\/\//);
    const js = validateExperiences([card(ID_A, { external_url: "javascript:alert(1)" })], acceptAll);
    assert.ok(js.errors[ID_A]?.external_url);
  });

  it("recusa ids repetidos, chaves desconhecidas, base64 e listas longas", () => {
    assert.ok(validateExperiences([card(ID_A), card(ID_A)], acceptAll).listError);
    assert.ok(validateExperiences([{ ...card(ID_A), onclick: "x" }], acceptAll).listError);
    assert.ok(validateExperiences([card("nao-e-uuid")], acceptAll).listError);
    const many = Array.from({ length: EXPERIENCES_MAX + 1 }, () => card(crypto.randomUUID()));
    assert.ok(validateExperiences(many, acceptAll).listError);
    const base64 = validateExperiences([card(ID_A, { image_path: "data:image/png;base64,AAAA" })], (value) =>
      value.startsWith("uploads/"),
    );
    assert.ok(base64.errors[ID_A]?.image_path);
  });

  it("limita o tamanho dos textos", () => {
    const result = validateExperiences([card(ID_A, { description: "x".repeat(401) })], acceptAll);
    assert.ok(result.errors[ID_A]?.description);
  });

  it("leitura tolerante: disponível sem endereço válido vira “em breve” e nunca gera link", () => {
    const [item] = sanitizeExperiences(
      [{ ...card(ID_A), external_url: "javascript:alert(1)" }],
      (value): value is string => typeof value === "string",
    );
    assert.equal(item.availability, "coming_soon");
    assert.equal(item.external_url, undefined);
    assert.equal(experienceLink(item), null);
    assert.equal(unavailableText(item), "Em breve");
    assert.deepEqual(sanitizeExperiences("x", (value): value is string => typeof value === "string"), []);
  });

  it("link só para experiência disponível; textos padrão de indisponível", () => {
    assert.equal(experienceLink(card(ID_A)), "https://experiencias.example.com/tour/");
    assert.equal(experienceLink(card(ID_A, { availability: "unavailable" })), null);
    assert.equal(unavailableText(card(ID_A, { availability: "unavailable" })), "Temporariamente indisponível");
    assert.equal(unavailableText(card(ID_A, { availability: "coming_soon", unavailable_label: "Lançamento em 2027" })), "Lançamento em 2027");
    const created = newExperience(ID_B);
    assert.equal(created.availability, "coming_soon");
    assert.equal(created.open_in_new_tab, true);
  });
});

describe("seção de experiências", () => {
  it("só existe na página inicial e no máximo uma vez", () => {
    assert.equal(isAllowedOnPage("home", "experiences"), true);
    assert.equal(isAllowedOnPage("rede", "experiences"), false);
    assert.equal(isAllowedOnPage("custom", "experiences"), false);
    assert.ok(addableSectionTypes("home", []).includes("experiences"));
    assert.ok(!addableSectionTypes("home", [{ section_type: "experiences" }]).includes("experiences"));
    assert.ok(!addableSectionTypes("rede", []).includes("experiences"));

    const section = (key: string) => ({
      id: null,
      key,
      section_type: "experiences",
      is_visible: true,
      settings: newBlockSettings("experiences"),
    });
    const empty = new Map();
    assert.equal(validateSectionList("home", [section("e1")], empty).listError, null);
    assert.ok(validateSectionList("home", [section("e1"), section("e2")], empty).listError);
    assert.ok(validateSectionList("rede", [section("e1")], empty).listError);
    assert.ok(validateSectionList("custom", [section("e1")], empty).listError);
  });

  it("aceita a capa inicial do site e imagens da biblioteca; recusa outros caminhos", () => {
    const settings = (image_path: string) => ({
      ...newBlockSettings("experiences"),
      experiences: [card(ID_A, { image_path, image_alt: "Pedreira" })],
    });
    assert.deepEqual(validateSectionSettings("experiences", settings(SEED_IMAGE)).errors, {});
    assert.deepEqual(validateSectionSettings("experiences", settings(MEDIA_IMAGE)).errors, {});
    const other = validateSectionSettings("experiences", settings("/images/qualquer.webp"));
    assert.ok(other.errors.experience_items?.[ID_A]?.image_path);
    assert.ok(other.errors.experiences);
    assert.deepEqual(sectionImagePaths(settings(MEDIA_IMAGE)), [MEDIA_IMAGE]);
  });

  it("colunas: 2 ou 3", () => {
    const base = newBlockSettings("experiences");
    assert.deepEqual(validateSectionSettings("experiences", { ...base, columns: 3 }).errors, {});
    assert.ok(validateSectionSettings("experiences", { ...base, columns: 4 }).errors.columns);
    assert.equal(sanitizeSectionSettings("experiences", { ...base, columns: 4 }).columns, undefined);
  });
});

describe("histórico e editor visual", () => {
  it("a comparação de versões descreve cada experiência", () => {
    const section = (experiences: Experience[]): SectionItem => ({
      id: "s1",
      section_type: "experiences",
      is_visible: true,
      settings: { ...newBlockSettings("experiences"), experiences },
    });
    const before = { sections: [section([card(ID_A)])] };
    const after = {
      sections: [section([card(ID_A, { availability: "unavailable" }), card(ID_B, { title: "Nova" })])],
    };
    const entries = diffContent("home", before, after);
    assert.ok(entries.some((entry) => entry.kind === "added" && entry.label.includes("Nova")));
    assert.ok(entries.some((entry) => entry.kind === "changed" && entry.label.includes("Tour de teste")));
    assert.deepEqual(diffContent("home", before, before), []);
  });

  it("aceita a seleção de um card pelo id estável e recusa ids inválidos", () => {
    const message = parseCanvasMessage({
      source: EDITOR_MESSAGE,
      type: "select",
      target: "section:experiencias-1",
      record: { kind: "experience", id: ID_A },
    });
    assert.deepEqual(message, {
      source: EDITOR_MESSAGE,
      type: "select",
      target: "section:experiencias-1",
      record: { kind: "experience", id: ID_A },
    });
    const invalid = parseCanvasMessage({
      source: EDITOR_MESSAGE,
      type: "select",
      target: "section:experiencias-1",
      record: { kind: "experience", id: "<img src=x>" },
    });
    assert.equal(invalid && invalid.type === "select" ? invalid.record : "x", null);
  });
});
