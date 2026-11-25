import { expect, test, type Page } from "@playwright/test";

/**
 * Fluxos do visitante. Nada aqui faz login, envia formulário ou grava dados;
 * os textos conferidos são estruturais (não dependem do conteúdo da GeoLogar).
 */

const PUBLIC_PAGES = ["/", "/rede", "/pesquisa", "/projetos", "/publicacoes", "/instituicoes"];

/** Erros de console da própria página (ignora recursos de terceiros). */
function collectConsoleErrors(page: Page, origin: string) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const url = message.location().url;
    if (!url || url.startsWith(origin)) errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

async function hasHorizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
}

for (const path of PUBLIC_PAGES) {
  test(`página pública ${path} carrega sem erros`, async ({ page, baseURL }) => {
    const errors = collectConsoleErrors(page, new URL(baseURL ?? "http://localhost").origin);
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("main")).toBeVisible();
    expect(await page.locator("html").getAttribute("lang")).toBe("pt-BR");
    expect(await hasHorizontalOverflow(page)).toBe(false);
    // Imagens sempre com texto alternativo (pode ser vazio quando decorativas).
    expect(await page.locator("img:not([alt])").count()).toBe(0);
    // Contato no rodapé de todas as páginas; nenhum formulário nem Turnstile.
    await expect(page.locator("footer #contato")).toHaveCount(1);
    await expect(page.locator('textarea, input[type="email"], iframe[src*="challenges.cloudflare.com"]')).toHaveCount(0);
    await expect(page.locator('script[src*="challenges.cloudflare.com"]')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test("link de pular para o conteúdo é o primeiro foco", async ({ page, isMobile }) => {
  test.skip(isMobile, "teclado: verificado no desktop");
  await page.goto("/");
  await page.keyboard.press("Tab");
  const focused = page.locator(":focus");
  await expect(focused).toHaveAttribute("href", "#conteudo");
  await expect(focused).toBeVisible();
});

test("metadados: canonical e Open Graph nas páginas fixas", async ({ page }) => {
  await page.goto("/pesquisa");
  const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
  expect(canonical).toMatch(/^https:\/\/[^/]+\/pesquisa$/);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", canonical ?? "");
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute("content", "pt_BR");
});

test("linha de pesquisa abre a partir da listagem", async ({ page }) => {
  await page.goto("/pesquisa");
  const link = page.locator('main a[href^="/pesquisa/"]').first();
  test.skip((await link.count()) === 0, "nenhuma linha publicada");
  const href = await link.getAttribute("href");
  await link.click();
  await expect(page).toHaveURL(new RegExp(`${href}$`));
  await expect(page.locator("h1")).toHaveCount(1);
});

test("endereços inexistentes respondem 404 com página amigável", async ({ page }) => {
  for (const path of ["/paginas/nao-existe-e2e", "/pesquisa/nao-existe-e2e", "/projetos/nao-existe-e2e"]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator('a[href="/"]').first()).toBeVisible();
  }
});

test("área administrativa exige login (sem credenciais)", async ({ page }) => {
  await page.goto("/admin/homepage");
  await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fhomepage$/);
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
});

test("usuários e troca de senha inicial exigem login (Etapa 10.5)", async ({ page }) => {
  await page.goto("/admin/usuarios");
  await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fusuarios$/);
  await page.goto("/admin/trocar-senha-inicial");
  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(page.locator('input[type="email"]')).toBeVisible();
});

test("experiências digitais: tela do CMS exige login (Etapa 10.6)", async ({ page }) => {
  await page.goto("/admin/experiencias");
  await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fexperiencias$/);
});

test("experiências digitais: links externos seguros e nada embutido (Etapa 10.6)", async ({ page }) => {
  await page.goto("/");
  // Nenhuma aplicação externa é carregada na página inicial.
  await expect(page.locator("iframe:not([src*='challenges.cloudflare.com'])")).toHaveCount(0);
  const section = page.locator("section#experiencias");
  test.skip((await section.count()) === 0, "Seção de experiências ainda não publicada.");
  await expect(section.locator("h2")).toBeVisible();
  const links = section.locator("a[href]");
  for (const link of await links.all()) {
    await expect(link).toHaveAttribute("href", /^https:\/\//);
    await expect(link).toHaveAttribute("rel", /noopener/);
    await expect(link).toHaveAttribute("rel", /noreferrer/);
    if ((await link.getAttribute("target")) === "_blank") await expect(link).toContainText("abre em nova aba");
  }
  expect(await hasHorizontalOverflow(page)).toBe(false);
});

test("cabeçalho: busca e acesso à área restrita (Etapa 10.7)", async ({ page, isMobile }) => {
  await page.goto("/");
  if (isMobile) await page.getByRole("button", { name: "Menu" }).click();
  const search = page.getByRole("search", { name: "Buscar no site" }).locator("visible=true").first();
  await expect(search).toBeVisible();
  await expect(search).toHaveAttribute("action", "/busca");
  await expect(page.locator('a[href="/admin/login"]').locator("visible=true").first()).toBeVisible();
});

test("busca: página sem índice, termo curto e sem resultados (Etapa 10.7)", async ({ page }) => {
  const response = await page.goto("/busca?q=a");
  expect(response?.status()).toBe(200);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.getByText(/pelo menos 2 caracteres/)).toBeVisible();
  await page.goto("/busca?q=termo-inexistente-e2e-zz");
  await expect(page.getByText(/Nenhum resultado/)).toBeVisible();
  expect(await hasHorizontalOverflow(page)).toBe(false);
});

test("menu móvel abre e fecha pelo teclado", async ({ page, isMobile }) => {
  test.skip(!isMobile, "menu móvel");
  await page.goto("/");
  const button = page.getByRole("button", { name: "Menu" });
  await button.click();
  await expect(button).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("navigation", { name: "Principal" }).last()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(button).toHaveAttribute("aria-expanded", "false");
});

test("antiga página /contato leva ao contato do rodapé", async ({ page, request }) => {
  const response = await request.get("/contato", { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers().location).toMatch(/\/#contato$/);

  await page.goto("/contato");
  await expect(page).toHaveURL(/\/#contato$/);
  await expect(page.locator("footer #contato")).toBeInViewport();
});

test("item Contato do menu rola até o rodapé na página atual", async ({ page, isMobile }) => {
  await page.goto("/pesquisa");
  if (isMobile) await page.getByRole("button", { name: "Menu" }).click();
  const menu = page.getByRole("navigation", { name: "Principal" }).filter({ visible: true });
  const link = menu.getByRole("link", { name: "Contato", exact: true });
  await expect(link).toHaveAttribute("href", "#contato");
  await link.click();
  await expect(page).toHaveURL(/\/pesquisa#contato$/);
  await expect(page.locator("footer #contato")).toBeInViewport();
  if (isMobile) await expect(page.getByRole("button", { name: "Menu" })).toHaveAttribute("aria-expanded", "false");
});

test("rodapé: colunas de identidade, navegação, links úteis e contato", async ({ page }) => {
  await page.goto("/");
  const footer = page.locator("footer");
  await expect(footer.getByRole("navigation", { name: /navegação/i })).toBeVisible();
  await expect(footer.getByRole("link", { name: "Área restrita" })).toHaveAttribute("href", "/admin/login");
  await expect(footer.locator("#contato h2")).toBeVisible();
  // Nada de destino vazio, placeholder "XXXX" ou link de rede sem endereço.
  await expect(footer.locator('a[href="#"], a[href=""], a:not([href])')).toHaveCount(0);
  await expect(footer).not.toContainText("XXXX");
  for (const href of await footer.locator('a[href^="tel:"], a[href^="https://wa.me/"]').evaluateAll((links) =>
    links.map((link) => link.getAttribute("href") ?? ""),
  )) {
    expect(href).toMatch(/^(tel:\+?\d{8,}|https:\/\/wa\.me\/\d{10,15})$/);
  }
});

test.describe("rotas técnicas", () => {
  test.skip(({ isMobile }) => isMobile, "independem do dispositivo");

  test("robots.txt bloqueia só a área administrativa e aponta o sitemap", async ({ request }) => {
    const response = await request.get("/robots.txt");
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain("Disallow: /admin");
    expect(body).toContain("Disallow: /api/");
    expect(body).not.toMatch(/Disallow: \/\s*$/m);
    expect(body).toMatch(/Sitemap: https:\/\/[^\s]+\/sitemap\.xml/);
  });

  test("sitemap.xml lista as páginas públicas e nenhuma rota administrativa", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);
    const body = await response.text();
    for (const path of ["/rede", "/pesquisa", "/projetos", "/publicacoes", "/instituicoes"]) {
      expect(body).toContain(`${path}</loc>`);
    }
    expect(body).not.toContain("/contato</loc>");
    expect(body).not.toContain("/admin");
  });

  test("cabeçalhos de segurança nas páginas públicas", async ({ request }) => {
    const response = await request.get("/");
    const headers = response.headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["x-frame-options"]).toBe("SAMEORIGIN");
  });

  test("API de contato está desativada e não processa envios", async ({ request, baseURL }) => {
    const response = await request.post("/api/contact", {
      headers: { origin: new URL(baseURL ?? "http://localhost").origin, "content-type": "application/json" },
      data: {},
    });
    expect(response.status()).toBe(404);
    expect(response.headers()["cache-control"]).toContain("no-store");
  });
});
