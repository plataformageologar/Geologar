import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { unavailableCustomPageLinks } from "../../src/lib/site/navigation";
import { parseSiteOrigin, WORKERS_DEV_ORIGIN } from "../../src/lib/site/url";

describe("endereço público do site (NEXT_PUBLIC_SITE_URL)", () => {
  it("aceita apenas uma origem https (ou http em localhost)", () => {
    assert.equal(parseSiteOrigin("https://portal.example.org"), "https://portal.example.org");
    assert.equal(parseSiteOrigin("https://portal.example.org/"), "https://portal.example.org");
    assert.equal(parseSiteOrigin(" https://portal.example.org:8443 "), "https://portal.example.org:8443");
    assert.equal(parseSiteOrigin("http://localhost:8787"), "http://localhost:8787");
  });

  it("recusa valores que não são uma origem segura", () => {
    for (const value of [
      undefined,
      "",
      "portal.example.org",
      "http://portal.example.org",
      "https://portal.example.org/caminho",
      "https://portal.example.org/?q=1",
      "https://user:pass@portal.example.org",
      "javascript:alert(1)",
      "ftp://portal.example.org",
    ]) {
      assert.equal(parseSiteOrigin(value), null, String(value));
    }
  });

  it("o padrão é o endereço atual do Worker", () => {
    assert.equal(WORKERS_DEV_ORIGIN, "https://geologar.plataformageologar.workers.dev");
  });
});

describe("links do menu para páginas personalizadas fora do ar", () => {
  const pages = [
    { slug: "laboratorios", status: "published" },
    { slug: "rascunho-teste", status: "draft" },
    { slug: "antiga-teste", status: "archived" },
  ];

  it("aponta rascunho, arquivada e inexistente; ignora as publicadas e outros links", () => {
    const result = unavailableCustomPageLinks(
      {
        header: [
          { label: "Laboratórios", href: "/paginas/laboratorios" },
          { label: "Rascunho", href: "/paginas/rascunho-teste" },
          { label: "Pesquisa", href: "/pesquisa" },
          { label: "Externo", href: "https://example.org/paginas/rascunho-teste" },
        ],
        footer: [
          { label: "Antiga", href: "/paginas/antiga-teste/" },
          { label: "Sumiu", href: "/paginas/nao-existe-teste" },
        ],
      },
      pages,
    );
    assert.deepEqual(
      result.map((link) => [link.location, link.label, link.reason]),
      [
        ["header", "Rascunho", "página não publicada"],
        ["footer", "Antiga", "página arquivada"],
        ["footer", "Sumiu", "página inexistente"],
      ],
    );
  });

  it("link oculto não gera aviso", () => {
    const result = unavailableCustomPageLinks(
      { header: [{ label: "Oculto", href: "/paginas/antiga-teste", is_visible: false }] },
      pages,
    );
    assert.deepEqual(result, []);
  });
});
