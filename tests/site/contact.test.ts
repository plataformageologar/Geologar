import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { POST } from "../../src/app/api/contact/route";
import {
  parseSiteSettingsValues,
  siteSettingsFields,
  type SiteSettingsFormValues,
} from "../../src/lib/admin/site-settings";
import { isLinkAvailable, SECTION_ANCHORS } from "../../src/lib/site/anchors";
import {
  CONTACT_HREF,
  isHashHref,
  mailtoHref,
  resolveSiteHref,
  telHref,
  validateWhatsapp,
  whatsappHref,
} from "../../src/lib/site/contact";
import { resolveEditorPage } from "../../src/lib/site/editor-pages";
import { DEFAULT_NAVIGATION, isNavLocation, validateNavList } from "../../src/lib/site/navigation";
import { EDITABLE_PAGE_CONTENT_KEYS } from "../../src/lib/site/page-content";

/** Números fictícios (nunca publicados). */
const settingsValues = (patch: Partial<SiteSettingsFormValues>): SiteSettingsFormValues => ({
  ...(Object.fromEntries(siteSettingsFields.map((field) => [field, ""])) as SiteSettingsFormValues),
  site_name: "GeoLogar",
  footer_logo_mode: "official",
  header_style: "solid",
  ...patch,
});
const noFiles = { logoPath: null, faviconPath: null, footerLogoPath: null };

describe("contato institucional no rodapé", () => {
  it("leva menus e botões ao contato do rodapé na página atual", () => {
    assert.equal(CONTACT_HREF, "/#contato");
    assert.equal(resolveSiteHref("/#contato"), "#contato");
    assert.equal(resolveSiteHref(" /contato "), "#contato", "endereço antigo também vai ao rodapé");
    assert.equal(resolveSiteHref("/#pesquisa"), "/#pesquisa", "outras âncoras da homepage continuam iguais");
    assert.equal(resolveSiteHref("/pesquisa"), "/pesquisa");
    assert.equal(resolveSiteHref("https://exemplo.example/contato"), "https://exemplo.example/contato");
    assert.equal(isHashHref("#contato"), true);
    assert.equal(isHashHref("/#contato"), false);
  });

  it("o contato está sempre disponível; a cooperação tem âncora própria", () => {
    assert.equal(isLinkAvailable("/#contato", new Set()), true);
    assert.equal(SECTION_ANCHORS.cooperation, "cooperacao");
    assert.notEqual(SECTION_ANCHORS.cooperation, "contato");
  });

  it("menus padrão apontam para /#contato e não inventam links úteis", () => {
    for (const location of ["header", "footer"] as const) {
      assert.ok(DEFAULT_NAVIGATION[location].some((item) => item.label === "Contato" && item.href === "/#contato"));
      assert.ok(!DEFAULT_NAVIGATION[location].some((item) => item.href === "/contato"));
    }
    assert.deepEqual(DEFAULT_NAVIGATION.useful, []);
    assert.equal(isNavLocation("useful"), true);
    assert.equal(isNavLocation("sidebar"), false);
  });

  it("aceita /#contato nos menus e recusa links sem destino", () => {
    const link = (href: string) => ({ id: null, key: href, label: "Contato", href, open_in_new_tab: false, is_visible: true });
    assert.deepEqual(validateNavList([link("/#contato")]).errors, {});
    assert.ok(validateNavList([link("#")]).errors["#"]?.href);
    assert.ok(validateNavList([link("javascript:alert(1)")]).errors["javascript:alert(1)"]?.href);
  });

  it("gera links de e-mail e telefone a partir do texto cadastrado", () => {
    assert.equal(mailtoHref(" contato@example.org "), "mailto:contato@example.org");
    assert.equal(telHref("+55 (71) 3000-0000"), "tel:+557130000000");
    assert.equal(telHref("(71) 3000-0000"), "tel:7130000000");
    assert.equal(telHref("123"), null);
  });

  it("WhatsApp: formato internacional, link wa.me e nada de XXXX", () => {
    assert.equal(validateWhatsapp(null), null);
    assert.equal(validateWhatsapp("+55 71 90000-0000"), null);
    assert.equal(whatsappHref("+55 (71) 90000-0000"), "https://wa.me/5571900000000");
    assert.ok(validateWhatsapp("71 90000-0000"), "sem + e código do país");
    assert.ok(validateWhatsapp("+55 71 9XXXX-XXXX"), "placeholder do mockup");
    assert.ok(validateWhatsapp("+55 71"), "curto demais");
    assert.ok(validateWhatsapp("+55 71 90000-0000 0000 0000"), "mais de 15 dígitos");
    assert.equal(whatsappHref("71 90000-0000"), null);
  });

  it("Configurações: WhatsApp validado e nunca copiado do telefone", () => {
    const onlyPhone = parseSiteSettingsValues(settingsValues({ contact_phone: "+55 71 3000-0000" }), noFiles);
    assert.deepEqual(onlyPhone.errors, {});
    assert.equal(onlyPhone.data.contact_phone, "+55 71 3000-0000");
    assert.equal(onlyPhone.data.contact_whatsapp, null);

    const valid = parseSiteSettingsValues(
      settingsValues({ contact_whatsapp: " +55 71 90000-0000 ", footer_links_title: "Links úteis" }),
      noFiles,
    );
    assert.deepEqual(valid.errors, {});
    assert.equal(valid.data.contact_whatsapp, "+55 71 90000-0000");
    assert.equal(valid.data.footer_links_title, "Links úteis");

    const invalid = parseSiteSettingsValues(settingsValues({ contact_whatsapp: "71 9XXXX-XXXX" }), noFiles);
    assert.ok(invalid.errors.contact_whatsapp);
    const longTitle = parseSiteSettingsValues(settingsValues({ footer_links_title: "x".repeat(41) }), noFiles);
    assert.ok(longTitle.errors.footer_links_title);
  });

  it("a antiga página de contato sai do editor visual e dos textos das páginas", () => {
    assert.equal(resolveEditorPage("/contato"), null);
    assert.ok(!(EDITABLE_PAGE_CONTENT_KEYS as readonly string[]).includes("contato"));
  });

  it("o endpoint do formulário responde 404 sem processar o envio", async () => {
    const response = POST();
    assert.equal(response.status, 404);
    assert.match(response.headers.get("cache-control") ?? "", /no-store/);
    const body = (await response.json()) as { error: string };
    assert.equal(body.error, "not_found");
  });
});
