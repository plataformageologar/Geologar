import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { diffContent } from "../../src/lib/editorial/content";
import { parseSearchTerm } from "../../src/lib/queries/search";
import {
  appearanceCss,
  appearanceVariables,
  contrastRatio,
  DEFAULT_APPEARANCE,
  deepMutedColor,
  MIN_CONTRAST,
  REFERENCE_PRESET,
  sanitizeAppearance,
  validateAppearance,
} from "../../src/lib/site/appearance";
import { groupSections } from "../../src/lib/site/section-pairs";
import { sanitizeSectionSettings, validateSectionSettings, type SectionType } from "../../src/lib/site/sections";

describe("preset “Referência GeoLogar” (Etapa 10.7)", () => {
  it("é válido e mantém o contraste mínimo", () => {
    const { data, errors } = validateAppearance(REFERENCE_PRESET);
    assert.deepEqual(errors, {});
    assert.deepEqual(data, REFERENCE_PRESET);
    for (const color of [REFERENCE_PRESET.primary_color, REFERENCE_PRESET.secondary_color]) {
      assert.ok(color);
      assert.ok(contrastRatio(color, "#f7f3ea") >= MIN_CONTRAST, color);
      assert.ok(contrastRatio(color, "#ffffff") >= MIN_CONTRAST, color);
    }
    const dark = REFERENCE_PRESET.dark_color;
    assert.ok(dark);
    assert.ok(contrastRatio(deepMutedColor(dark), dark) >= MIN_CONTRAST);
  });

  it("gera as variáveis de fundo creme, tom escuro e seções compactas", () => {
    const vars = appearanceVariables(REFERENCE_PRESET);
    assert.equal(vars["--background"], "#f7f3ea");
    assert.equal(vars["--surface"], "#fffcf6");
    assert.equal(vars["--deep"], "#443020");
    assert.equal(vars["--section-title-transform"], "uppercase");
    assert.equal(vars["--section-marker"], "block");
    assert.match(vars["--heading-font"] ?? "", /source-sans/);
  });

  it("o padrão continua sem CSS extra (nada muda sem publicar)", () => {
    assert.equal(appearanceCss(DEFAULT_APPEARANCE), "");
    assert.equal(DEFAULT_APPEARANCE.section_style, "spacious");
    assert.equal(DEFAULT_APPEARANCE.dark_color, null);
  });
});

describe("aparência: campos novos", () => {
  it("recusa tom escuro claro demais e densidade desconhecida", () => {
    const light = validateAppearance({ ...DEFAULT_APPEARANCE, dark_color: "#8a8a8a" });
    assert.ok(light.errors.dark_color);
    const style = validateAppearance({ ...DEFAULT_APPEARANCE, section_style: "giant" });
    assert.ok(style.errors.section_style);
    const css = validateAppearance({ ...DEFAULT_APPEARANCE, dark_color: "black; background: url(x)" });
    assert.ok(css.errors.dark_color);
  });

  it("revisões antigas (sem os campos novos) são lidas com o padrão", () => {
    const old = sanitizeAppearance({ primary_color: "#0b3d2e", section_background: "sand" });
    assert.equal(old.dark_color, null);
    assert.equal(old.section_style, "spacious");
    assert.equal(sanitizeAppearance({ section_background: "cream" }).section_background, "cream");
  });

  it("o histórico descreve a troca de densidade e do tom escuro", () => {
    const entries = diffContent(
      "appearance",
      { appearance: DEFAULT_APPEARANCE },
      { appearance: REFERENCE_PRESET },
    );
    const labels = entries.map((entry) => entry.label).join(" | ");
    assert.match(labels, /Tom escuro/);
    assert.match(labels, /Densidade das seções/);
  });
});

describe("seções: opções novas", () => {
  it("banner aceita o layout brand", () => {
    assert.deepEqual(validateSectionSettings("hero", { layout: "brand" }).errors, {});
    assert.ok(validateSectionSettings("hero", { layout: "mosaic" }).errors.layout);
  });

  it("linhas de pesquisa: cards ou fotos; projetos: side_by_side booleano", () => {
    assert.equal(validateSectionSettings("research", { display: "photos" }).data.display, "photos");
    assert.ok(validateSectionSettings("research", { display: "carousel" }).errors.display);
    assert.ok(validateSectionSettings("projects", { display: "photos" }).errors.title, "chave estranha ao tipo");
    assert.equal(validateSectionSettings("projects", { side_by_side: true }).data.side_by_side, true);
    assert.ok(validateSectionSettings("projects", { side_by_side: "sim" }).errors.side_by_side);
    assert.equal(sanitizeSectionSettings("publications", { side_by_side: true }).side_by_side, undefined);
  });

  it("projetos ficam ao lado das publicações só quando a próxima seção é de publicações", () => {
    const section = (section_type: SectionType, settings = {}) => ({ section_type, settings });
    const paired = groupSections([
      section("hero"),
      section("projects", { side_by_side: true }),
      section("publications"),
      section("institutions"),
    ]);
    assert.deepEqual(
      paired.map((unit) => unit.kind),
      ["single", "pair", "single"],
    );
    const apart = groupSections([section("projects", { side_by_side: true }), section("institutions"), section("publications")]);
    assert.ok(apart.every((unit) => unit.kind === "single"));
    const off = groupSections([section("projects"), section("publications")]);
    assert.ok(off.every((unit) => unit.kind === "single"));
    // No editor, uma seção oculta ou vazia não forma par.
    const hidden = groupSections(
      [section("projects", { side_by_side: true }), section("publications")],
      (item) => item.section_type !== "publications",
    );
    assert.ok(hidden.every((unit) => unit.kind === "single"));
  });
});

describe("busca do site", () => {
  it("normaliza o termo e recusa termos curtos", () => {
    assert.equal(parseSearchTerm(undefined), null);
    assert.equal(parseSearchTerm(" a "), null);
    assert.equal(parseSearchTerm("mármore"), "mármore");
    // Caracteres da sintaxe de filtros do PostgREST são removidos.
    assert.equal(parseSearchTerm('rocha,"x"(y)*%'), "rocha x y");
    assert.equal(parseSearchTerm("x".repeat(200))?.length, 80);
  });
});
