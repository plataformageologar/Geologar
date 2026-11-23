# Estado atual do sistema — Portal GeoLogar

Retrato do portal em **23/11/2026**, depois da Etapa 10 (auditoria, QA,
segurança, SEO e preparação para homologação). Resultados completos em
[`qa-report.md`](qa-report.md); roteiro para a equipe em
[`homologation-checklist.md`](homologation-checklist.md). Detalhes de cada parte nos documentos citados.

## Resumo

| | |
|---|---|
| Etapas concluídas | 1 a 10 |
| Último commit | `fix: complete GeoLogar QA security and production readiness` |
| Site em produção | <https://geologar.plataformageologar.workers.dev> (sem domínio próprio) |
| Deploy | Automático a cada push em `main` (Cloudflare Workers Builds, Worker `geologar`) |
| Banco e autenticação | Supabase (PostgreSQL + RLS, Auth, Storage) |
| Próxima etapa | 11 — **não iniciada**, aguardando briefing |
| Indexação | Site público **indexável**; `robots.txt` bloqueia `/admin`, `/api/` e `/auth/`; `sitemap.xml` só com conteúdo publicado |

## Tecnologia

| Item | Versão |
|---|---|
| Next.js (App Router, Server Actions) | 16.4.6 |
| React / React DOM | 19.3.0 |
| Tailwind CSS | 4 |
| TypeScript | 5 |
| OpenNext para Cloudflare | 1.20.15 |
| Wrangler | 4.157.0 |
| Supabase JS / SSR | 2.118 / 0.12.7 |
| Ícones | lucide-react |

Configuração do Worker (`wrangler.jsonc`): bindings `ASSETS`, `IMAGES`,
`WORKER_SELF_REFERENCE` e o limitador `CONTACT_RATE_LIMITER` (formulário de
contato). Sem ISR, R2, KV ou Durable Objects. Ver [`deployment.md`](deployment.md).

Variáveis de ambiente (nomes, sem valores): `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`,
`NEXT_PUBLIC_SITE_URL` (opcional, para domínio próprio) e as do
formulário de contato (ver [`contact-form.md`](contact-form.md)).

## Site público

| Página | Rota | Situação |
|---|---|---|
| Início | `/` | No ar; seções e blocos configuráveis |
| A Rede | `/rede` | No ar; pilares e seções configuráveis |
| Pesquisa | `/pesquisa`, `/pesquisa/[slug]` | No ar |
| Projetos | `/projetos`, `/projetos/[slug]` | No ar (filtros e paginação) |
| Publicações | `/publicacoes` | No ar; sem página individual |
| Instituições | `/instituicoes` | No ar |
| Contato | `/contato` | No ar; formulário **oculto** até configurar Resend + Turnstile |
| Páginas personalizadas | `/paginas/[slug]` | Só as publicadas; demais respondem 404 (nenhuma publicada hoje) |

Para quem está logado (admin/editor) aparece o botão **“Editar esta página”**,
com a permissão verificada no servidor. Ver [`public-pages.md`](public-pages.md).

### Conteúdo publicado hoje

Números vistos por um visitante (registros publicados ou visíveis):

| Conteúdo | Publicado |
|---|---|
| Linhas de pesquisa | 6 |
| Projetos | 0 (os de demonstração estão em rascunho) |
| Publicações | 0 |
| Instituições / categorias | 0 / 0 |
| Redes sociais | 0 |
| Pilares da rede | 4 |
| Links de menu (cabeçalho + rodapé) | 13 |
| Seções (início + rede) | 10 |
| Textos de páginas internas | 6 |
| Páginas personalizadas | 0 (uma página de teste “Teste Etapa 9.6” ficou arquivada) |

O conteúdo atual é de **demonstração**, montado a partir dos materiais de
referência; nada foi aprovado formalmente pela GeoLogar. Ver
[`initial-content-manifest.md`](initial-content-manifest.md) e
[`content-handover.md`](content-handover.md).

## Área administrativa (`/admin`)

Login por e-mail e senha (Supabase Auth), sem cadastro público.

**Salvar não publica** (Etapa 9.6): homepage, seções, pilares, textos das
páginas, páginas personalizadas, menus, aparência e informações
institucionais são editados como rascunho e só vão ao ar com “Publicar
alterações”. Cada rascunho, publicação e restauração fica no histórico de
versões. Ver [`editorial-workflow.md`](editorial-workflow.md).

Papéis em `admin_memberships`:

- **admin**: controle total (tudo o que o editor faz + configurações, menus,
  aparência, redes sociais, categorias, mídia e exclusões);
- **editor**: conteúdo editorial, incluindo publicar rascunhos e criar
  páginas personalizadas (não publica menus, aparência nem informações
  institucionais; não despublica nem arquiva páginas já publicadas).

| Módulo | Rota | Quem edita |
|---|---|---|
| Painel | `/admin` | — |
| Editor visual | `/admin/editor?pagina=/` | admin, editor |
| Homepage | `/admin/homepage` | admin, editor |
| Seções e blocos | `/admin/secoes` | admin, editor |
| Pilares | `/admin/pilares` | admin, editor |
| Textos das páginas | `/admin/textos-das-paginas` | admin, editor |
| Páginas personalizadas | `/admin/paginas` | admin, editor (despublicar/arquivar publicadas: admin) |
| Histórico de versões | `/admin/historico` (lista de conteúdos) | admin, editor |
| Linhas de pesquisa | `/admin/linhas-de-pesquisa` | admin, editor (excluir: admin) |
| Projetos | `/admin/projetos` | admin, editor (excluir: admin) |
| Publicações | `/admin/publicacoes` | admin, editor (excluir: admin) |
| Instituições | `/admin/instituicoes` | admin, editor; categorias só admin |
| Biblioteca de mídia | `/admin/midias` | admin, editor envia; admin exclui |
| Navegação (menus) | `/admin/navegacao` | admin (editor consulta) |
| Aparência | `/admin/aparencia` | admin |
| Informações institucionais, cabeçalho e rodapé | `/admin/configuracoes` | admin |
| Redes sociais | `/admin/redes-sociais` | admin |
| Prévia de demonstração | `/admin/demonstracao` | leitura |
| Perfil | `/admin/perfil` | próprio usuário |

Ver [`cms.md`](cms.md), [`admin-auth.md`](admin-auth.md),
[`media-library.md`](media-library.md), [`visual-editor.md`](visual-editor.md),
[`editorial-workflow.md`](editorial-workflow.md),
[`custom-pages.md`](custom-pages.md) e o guia para a equipe [`guia-edicao-geologar.md`](guia-edicao-geologar.md).

## Banco de dados

12 migrations aplicadas, de `20261103141529_initial_geologar_content_schema`
a `20261123120500_editorial_write_guard`. Tabelas principais:

- conteúdo: `homepage_content`, `research_lines`, `projects`, `publications`,
  `institutions`, `institution_categories`, `social_links`, `site_settings`;
- personalização: `site_pillars`, `site_navigation`, `page_sections`,
  `page_content`, `site_appearance`;
- fluxo editorial: `editorial_documents` (rascunhos), `editorial_revisions`
  (histórico imutável), `custom_pages`;
- acesso: `admin_memberships`;
- Storage: bucket público `geologar-media`.

Ver [`database-schema.md`](database-schema.md).

## Segurança

- RLS em todas as tabelas, com `has_cms_role`; permissões de escrita por
  coluna; sem `SECURITY DEFINER` e sem `USING (true)` para escrita.
- Trigger `editorial_guard`: o conteúdo editorial só muda pelas funções do
  fluxo de rascunho e publicação; gravação direta é recusada (`GL403`).
- Rascunhos e histórico só são lidos com a sessão do CMS; o site público lê
  apenas as tabelas publicadas.
- Operações editoriais usam a sessão do usuário, nunca `service_role`.
- `/admin` com `Cache-Control: private, no-store`, `noindex` e proteção contra
  exibição em iframe de outros sites.
- Todas as respostas com `X-Content-Type-Options`, `Referrer-Policy`,
  `X-Frame-Options: SAMEORIGIN` e `Permissions-Policy` (Etapa 10).
- Cadastro público desativado no Supabase Auth (somente Email).
- Links e conteúdo validados no navegador, no servidor e no banco; sem HTML
  livre.
- Next.js 16.4.6 corrige os avisos de segurança da 16.4.4.
  `npm audit --omit=dev`: **0 vulnerabilidades**.

## Qualidade e testes

| Verificação | Resultado |
|---|---|
| Lint e TypeScript | Sem erros |
| Testes unitários (`npm test`) | 97/97 |
| Testes de banco pgTAP (8 arquivos, no banco remoto, transação desfeita) | 346/346 (segurança do fluxo editorial: 23/23) |
| Testes ponta a ponta do visitante (`npm run test:e2e`, Playwright) | 30/30 (6 ignorados de propósito) |
| Build OpenNext e `opennextjs-cloudflare preview` | OK |
| `npm audit --omit=dev` | 0 vulnerabilidades |
| Fluxo editorial no navegador (sessão admin) | Rascunho, descarte, restauração, criar/publicar/despublicar/arquivar página, conflito entre abas, editor visual |
| Responsivo (6 tamanhos × 16 páginas públicas e do CMS) | Sem rolagem horizontal |
| Verificação automática de acessibilidade (14 páginas) | Sem problemas (não é auditoria WCAG) |

## Pendências

### Técnicas

- Interface com uma conta de papel **editor** real ainda não testada (regras
  cobertas por pgTAP e pelo servidor); depende de a pessoa entrar com a
  própria senha.
- Melhoria opcional: revogar `EXECUTE` das funções antigas de gravação
  (hoje barradas pela guarda `GL403`).
- `npm audit` acusa itens só em ferramentas de build e lint (cadeia `glob`
  do OpenNext e `typescript-eslint`), sem efeito no site publicado. Resolver
  quando houver versões novas dessas ferramentas.
- O OpenNext avisa que o suporte a middleware Node.js na Cloudflare é
  experimental (funciona hoje; acompanhar).

### Não implementado

- Arrastar e soltar no editor (a ordem muda pelos botões subir/descer).
- Página individual de publicação; agendamento de publicação.
- Histórico de versões para projetos, linhas, publicações e instituições
  (continuam com rascunho/publicado por registro).
- Gestão de usuários pelo painel.

### Da GeoLogar

- Textos finais, fotografias reais e logotipos oficiais (incluindo os das
  instituições parceiras), com direitos de uso confirmados. As fotos atuais
  das linhas de pesquisa têm ~450 × 226 px e aparecem borradas em telas
  grandes (ver [`qa-report.md`](qa-report.md#8-imagens-a-substituir-geologar)).
- Projetos, publicações, instituições e redes sociais reais.
- Dados de contato oficiais e credenciais do formulário (Resend, Turnstile).
- Decisão sobre domínio próprio.
- Contas da equipe (admin/editor), criadas no painel do Supabase.
