# Relatório de QA e auditoria — Etapa 10

Auditoria técnica, segurança, testes funcionais, acessibilidade, SEO e
desempenho do portal GeoLogar, feita em **23/11/2026** sobre o commit
`fa4f7bc` (Etapa 9.6) e as correções desta etapa. Este relatório registra o
que foi verificado, como, e o que **não** foi verificado. Não declara
conformidade com WCAG.

Ambientes usados:

- **Local**: `npm run dev` (porta 3000) e `npm run preview` (Worker local via
  `opennextjs-cloudflare preview`, porta 8787), ambos ligados ao banco
  Supabase de produção (somente leitura, exceto onde indicado).
- **Banco**: testes pgTAP no banco remoto, cada arquivo numa transação
  **desfeita** no final (nada persiste).
- **Produção**: <https://geologar.plataformageologar.workers.dev>, apenas
  leitura (medições de desempenho e conferências).

## 1. Classificação dos problemas encontrados

| # | Gravidade | Problema | Situação |
|---|---|---|---|
| 1 | Médio | “Descartar rascunho” deixava nos campos do CMS o conteúdo descartado (o banco ficava certo, mas salvar de novo gravaria o conteúdo descartado). | **Corrigido**: os formulários são remontados quando os dados do servidor refletem o descarte (`editorial-scope.tsx`). Verificado no navegador. |
| 2 | Médio | “Publicar” ficava ativo com rascunho igual à versão publicada (gerava publicação vazia/erro `GL404`). | **Corrigido**: `hasPublishableDraft` no CMS, no editor visual e no diálogo de publicação; páginas personalizadas mantêm a exceção (republicar). Teste unitário. |
| 3 | Médio | `/admin/historico` sem parâmetro respondia 404; não havia como chegar ao histórico de um conteúdo sem abrir a tela dele. | **Corrigido**: índice com todos os conteúdos, situação e links; item “Histórico de versões” no menu do painel. |
| 4 | Médio | Links do menu para páginas personalizadas fora do ar (rascunho/arquivada/inexistente) não eram sinalizados. | **Corrigido**: aviso na tela Navegação, por link e motivo, sem remover nada. Teste unitário e verificação no navegador. |
| 5 | Médio | SEO: sem `metadataBase` (URLs relativas), sem canonical/Open Graph nas páginas fixas e nos detalhes, sem `sitemap.xml` e sem `robots.txt` da aplicação; título da página inicial só “GeoLogar”. | **Corrigido**: ver seção 6. |
| 6 | Baixo | Cabeçalhos de segurança ausentes no site público (`nosniff`, `Referrer-Policy`, proteção contra iframe). | **Corrigido** em `next.config.ts` (todas as rotas). O proxy deixou de repetir `X-Frame-Options`. |
| 7 | Baixo | Origem de produção fixa no código (`PRODUCTION_ORIGIN`), dificultando um domínio próprio. | **Corrigido**: `src/lib/site/url.ts` com `NEXT_PUBLIC_SITE_URL` opcional (sem domínio presumido); `workers.dev` continua aceito. |
| 8 | Baixo | `npm audit` (somente dependências de desenvolvimento): cadeia `glob`/`minimatch` do OpenNext (alto) e `typescript-eslint` (moderado). | **Não corrigido, justificado**: a “correção” do OpenNext é rebaixá-lo para 0.3.0 (incompatível); a de `typescript-eslint` alteraria dezenas de pacotes no lockfile por um DoS em padrões de glob do próprio lint. Nenhum dos dois vai para o Worker. `npm audit --omit=dev`: **0**. |
| 9 | Baixo | Restaurar uma revisão grava o conteúdo enviado pelo navegador (lido da revisão pela aplicação), não o lido de novo no banco. Quem pode restaurar já pode salvar qualquer rascunho válido, então não há ganho de permissão; o efeito possível é um registro “restaurada da revisão N” com conteúdo diferente. | **Registrado** (integridade do histórico). Sugestão futura: a função ler o conteúdo da própria revisão. |
| 10 | Baixo | Verificação do tipo real do arquivo de imagem é feita no navegador; o servidor confere tipo declarado, tamanho e dimensões e o bucket repete tipo e limite de 5 MB. Um arquivo forjado poderia ter conteúdo diferente do tipo declarado. | **Registrado**: o bucket só aceita `image/jpeg`, `image/png` e `image/webp` (nunca SVG/HTML) e serve com esse tipo; risco baixo. |
| 11 | Conteúdo | Fotos das linhas de pesquisa com ~450 × 226 px, exibidas com até ~700 px em celulares e maiores nas páginas de detalhe. | **Para a GeoLogar**: substituir por fotos reais com pelo menos 1600 px de largura (não foram ampliadas artificialmente). Ver seção 8. |
| 12 | Melhoria opcional | Revogar `EXECUTE` das funções antigas `save_site_pillars`, `save_site_navigation` e `save_page_sections` (hoje barradas pela guarda `GL403`). | Não feito (defesa em profundidade; exigiria migration nova e ajuste dos testes). |

Nenhum problema crítico ou alto foi encontrado no código da aplicação.

## 2. Diagnóstico (ferramentas)

| Verificação | Resultado |
|---|---|
| `npm run lint` | Sem erros |
| `npm run typecheck` | Sem erros |
| `npm test` (node --test, sem rede) | **97/97** |
| `npm run build` (OpenNext) | OK |
| `npm run preview` + `npm run test:e2e` (Playwright, visitante) | **30 passaram**, 6 ignorados de propósito (teclado só no desktop; rotas técnicas só uma vez) |
| Testes de banco pgTAP (8 arquivos, remoto, transação desfeita) | **346/346** |
| `npm audit --omit=dev` | 0 vulnerabilidades |
| `npm audit` | 11 (7 moderadas, 4 altas), todas em ferramentas de build/lint — item 8 |

pgTAP por arquivo: editorial_security 23, editorial_workflow 61,
homepage_content_rls 17, media_library_rls 47, project_drafts 9,
publications_institutions_settings_rls 71, research_lines_projects_rls 47,
visual_editor_customization 71. Depois da execução, conferido no banco: nenhuma
conta `@example.test`, nenhuma página ou rascunho novo.

## 3. Segurança

**Autenticação**: cadastro público desativado (`disable_signup: true`),
somente provedor Email; destinos de redirecionamento restritos a caminhos de
`/admin` e ao editor com página permitida; mensagens neutras na recuperação de
senha; logs só com códigos de erro.

**Papéis** (cobertos por pgTAP e pelas Server Actions, que conferem sessão e
papel a cada chamada):

| Cenário | Verificação |
|---|---|
| Visitante | Não lê rascunhos/histórico, não executa funções do fluxo, não vê páginas em rascunho/arquivadas (pgTAP); `/admin/*` redireciona para o login (E2E e curl). |
| Conta sem vínculo | Não vê documentos, não cria páginas, não restaura revisões (pgTAP). |
| Conta inativa | Não vê documentos nem cria páginas (pgTAP). |
| Editor | Salva/publica conteúdo editorial; **não** salva, publica, descarta nem restaura navegação, aparência ou informações institucionais; não arquiva página já publicada (pgTAP, arquivo `editorial_security`). |
| Administrador | Fluxo completo; links `javascript:`, `data:` e `//host` recusados no menu (pgTAP). |

**Interface com a conta editor**: **não testada nesta etapa** — exige login
da própria pessoa no navegador (ver seção 9). As regras do papel estão
cobertas pelo banco e pelo servidor.

**Fluxo editorial**: gravação direta nas tabelas publicadas, em
`editorial_documents`, em `custom_pages` (status) e chamadas diretas às
funções internas (`editorial_record_draft`, `editorial_publish_one`) ou às
funções antigas são recusadas (`GL403`); versão desatualizada → `GL409`;
página arquivada não publica (`GL423`); revisões não podem ser alteradas nem
excluídas. Observação: a chave da guarda vale até o fim da transação; na API
cada chamada é uma transação, por isso o teste desliga a chave antes de cada
verificação direta.

**RLS**: todas as tabelas públicas com RLS; sem policies genéricas de escrita;
sem `SECURITY DEFINER`; todas as funções com `search_path` fixo.

**Editor visual (postMessage)**: as duas janelas conferem a origem exata e a
janela de origem; o editor valida cada mensagem da tela
(`parseCanvasMessage`) antes de usar.

**Mídia**: Server Actions conferem papel, tipo, tamanho e dimensões e geram o
nome do arquivo (`uploads/<uuid>.<ext>`, nunca sobrescreve); o envio usa URL
assinada com a sessão do usuário; exclusão só por admin e só sem uso. O bucket
é **público** (não é armazenamento privado). Nenhum arquivo foi enviado nos
testes.

**Formulário de contato** (preview local com configuração de teste, sem envio
real): sem `Origin` → 403; origem externa → 403; `Sec-Fetch-Site: cross-site`
→ 403; `text/plain` → 415; JSON inválido → 400; corpo de 70 KB → 413; campos
inválidos → 400; honeypot → 400; `GET` → 405. No `npm run dev` sem
configuração: 503 (fecha por padrão). Nenhuma requisição válida foi enviada,
então Turnstile e Resend não foram acionados.

**Cabeçalhos**: site público com `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`,
`X-Frame-Options: SAMEORIGIN`, `Permissions-Policy`; área administrativa
também com `Cache-Control: private, no-store` e
`Content-Security-Policy: frame-ancestors 'self'`.

## 4. Testes funcionais (sessão de administrador, navegador)

- Índice do histórico: lista os 12 conteúdos com situação correta; links “Ver
  histórico” e “Editar”.
- Navegação: link de teste para a página arquivada “Teste Etapa 9.6” salvo
  **como rascunho** → aviso exibido com o motivo (“página arquivada”) →
  rascunho descartado → campos voltaram aos 6 links publicados; o menu
  público nunca mudou (conferido no banco e no HTML).
- Editor visual: tela carrega com os novos cabeçalhos; selecionar o banner,
  editar o título (prévia ao vivo, “Alterações não salvas”, Publicar
  desativado) e descartar sem salvar.
- Páginas personalizadas: endereço inválido (`../admin`) e endereço repetido
  recusados com mensagem clara; nada criado. Endereços inexistentes,
  página arquivada e slugs inválidos respondem 404.
- O conteúdo oficial não foi alterado; nada foi publicado.

## 5. Responsividade e acessibilidade

- **Sem rolagem horizontal** em 16 páginas (8 públicas, 404 e 7 telas do CMS)
  nos 6 tamanhos: 375×812, 390×844, 768×1024, 1024×768, 1280×720, 1440×900
  (96 verificações automáticas).
- Verificação automática básica em 14 páginas: imagens com `alt`, links e
  botões com nome, campos com rótulo, ids únicos, um `h1`, sem saltos de
  nível de título, `lang="pt-BR"`, `<main>` e link de pular — **sem
  problemas**.
- Teclado: “Pular para o conteúdo” é o primeiro foco, com contorno visível de
  3 px; menu móvel abre e fecha com Escape (E2E).
- Não foram feitas: auditoria completa de contraste, teste com leitor de tela
  e revisão manual completa por teclado do editor visual.

## 6. SEO e indexação

Decisão: **site indexável**.

- `metadataBase` = origem pública (`src/lib/site/url.ts`).
- Canonical e Open Graph (`og:url`, `og:locale` `pt_BR`, `og:type`) na página
  inicial, páginas fixas, linhas de pesquisa, projetos e páginas
  personalizadas, reaproveitando os campos de SEO existentes no CMS.
- Página inicial: título “nome do site | nome institucional” (dados do CMS).
- `robots.txt`: permite tudo exceto `/admin`, `/api/` e `/auth/`; aponta o
  sitemap. Não é mecanismo de segurança.
- `sitemap.xml`: páginas fixas + linhas, projetos e páginas personalizadas
  **publicados** (lidos com o cliente anônimo; rascunhos nunca entram).
- Antes: sem sitemap (404) e `robots.txt` gerenciado pelo Cloudflare só com
  comentários. Se o *Managed robots.txt* da zona estiver ativo, conferir qual
  é servido após o deploy.

## 7. Desempenho

**Ferramenta e condições**: Lighthouse não foi usado. As métricas vêm do
Chromium headless (Playwright 1.65.0) com a API de Performance do navegador
(TTFB, FCP, LCP, CLS, `load`) e bytes transferidos pelo protocolo de
depuração. Cada execução usa cache vazio; valor = **mediana de 3**.
Desktop: 1280×720, sem limitação. Celular: 375×812, rede limitada (150 ms de
latência, 1,6 Mbps de download, 750 kbps de upload) e CPU 4× mais lenta.
Medido a partir de Windows 11 no Brasil, em 23/11/2026.

**Antes** (produção, commit `fa4f7bc`):

| Condição | Página | TTFB | FCP | LCP | CLS | Load | KB |
|---|---|---|---|---|---|---|---|
| Desktop | `/` | 1711 | 1844 | 1844 | 0 | 1934 | 325 |
| Desktop | `/pesquisa` | 1158 | 1408 | 2544 | 0 | 1403 | 319 |
| Desktop | `/pesquisa/geologia-e-geodiversidade` | 595 | 716 | 840 | 0 | 999 | 269 |
| Desktop | `/projetos` | 651 | 752 | 752 | 0 | 795 | 253 |
| Desktop | `/contato` | 495 | 588 | 588 | 0 | 683 | 261 |
| Celular | `/` | 684 | 1720 | 1720 | 0 | 2452 | 247 |
| Celular | `/pesquisa` | 640 | 1708 | 2312 | 0 | 2473 | 297 |
| Celular | `/pesquisa/geologia-e-geodiversidade` | 488 | 1492 | 1828 | 0 | 2281 | 263 |
| Celular | `/projetos` | 364 | 1344 | 1344 | 0 | 2074 | 246 |
| Celular | `/contato` | 496 | 1492 | 1492 | 0 | 2249 | 257 |

Tempos em milissegundos. O TTFB varia bastante entre execuções (renderização
sob demanda no Worker + leituras no Supabase a cada requisição; a primeira
requisição de uma sequência tende a ser mais lenta). Sem deslocamento de
layout (CLS 0) em todas as páginas.

**Depois**: ver seção 10 (medição em produção após o deploy desta etapa).
As mudanças desta etapa não alteram a renderização nem as consultas das
páginas (acrescentam metadados e cabeçalhos), então não se espera diferença
além da variação normal.

Possíveis ganhos futuros (não aplicados — exigiriam cache, desativado por
decisão do projeto): cache das leituras públicas ou ISR. A maior parte do
tempo está no TTFB (servidor + banco), não no tamanho da página.

## 8. Imagens a substituir (GeoLogar)

| Imagem (texto alternativo) | Tamanho real | Uso |
|---|---|---|
| Afloramento rochoso com camadas estratificadas | 447 × 226 | Linha “Geologia e geodiversidade” |
| Mina a céu aberto com bancadas escalonadas | 453 × 226 | Linha de pesquisa (página inicial e `/pesquisa`) |
| Rio de corredeiras em vale coberto por mata | ~450 × 226 | Linha de pesquisa |
| Símbolo de reciclagem com material granulado | ~450 × 226 | Linha de pesquisa |
| Morro de topo plano com paredões rochosos | ~450 × 226 | Linha de pesquisa |
| Imagem de satélite de região costeira | 441 × 226 | Linha de pesquisa |

Recomendação: fotos reais, com direitos de uso, de pelo menos 1600 × 900 px.
Logotipos do site: arquivos de origem adequados (544 × 473 e 400 × 400) e o
serviço de imagens entrega o tamanho certo para telas de alta densidade.

## 9. Não verificado nesta etapa

- Interface com uma conta **editor** (exige que a pessoa entre com a própria
  senha no navegador).
- Cenário “conta inativa” pela interface (coberto por pgTAP).
- Envio real do formulário de contato (produção continua com o formulário
  oculto; ativação depende da GeoLogar).
- Upload real de imagens (para não enviar arquivos ao bucket público).
- Lighthouse, leitor de tela e contraste completo.

## 10. Validação em produção

Preenchida após o push desta etapa (ver o commit seguinte ou o relatório
final da etapa).

## Como repetir

```bash
npm run lint && npm run typecheck && npm test
npm run preview            # em outro terminal: build + Worker local (8787)
npx playwright install chromium   # uma vez
npm run test:e2e
npm audit --omit=dev
npx supabase test db --remote     # pgTAP (transação desfeita)
```
