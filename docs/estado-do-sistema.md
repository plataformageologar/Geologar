# Estado atual do sistema — Portal GeoLogar

Retrato do portal em **24/11/2026**, depois da Etapa 10.7 (refinamento
visual e instituições da referência, ver [`visual-refinement.md`](visual-refinement.md)),
da Etapa 10.6 (experiências digitais na página inicial) e da Etapa 10.5 (gerenciamento de Editores pelo
painel), que se seguiram à Etapa 10 (auditoria, QA, segurança, SEO
e preparação para homologação). Resultados completos em
[`qa-report.md`](qa-report.md); roteiro para a equipe em
[`homologation-checklist.md`](homologation-checklist.md). Detalhes de cada parte nos documentos citados.

## Resumo

| | |
|---|---|
| Etapas concluídas | 1 a 10.7 (aparência, homepage, 22 instituições, 3 projetos e 3 publicações provisórias publicados) |
| Último commit | `feat: add reference institutions and demo preview composition` |
| Site em produção | <https://geologar.plataformageologar.workers.dev> (sem domínio próprio) |
| Deploy | Automático a cada push em `main` (Cloudflare Workers Builds, Worker `geologar`) |
| Banco e autenticação | Supabase (PostgreSQL + RLS, Auth, Storage, Edge Function `admin-editor-management`) |
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

Configuração do Worker (`wrangler.jsonc`): bindings `ASSETS`, `IMAGES` e
`WORKER_SELF_REFERENCE`. Sem ISR, R2, KV, Durable Objects ou limitador de
envios (removido com o formulário de contato). Ver [`deployment.md`](deployment.md).

Variáveis de ambiente (nomes, sem valores): `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`,
`NEXT_PUBLIC_SITE_URL` (opcional, para domínio próprio). As do formulário de
contato não são mais lidas (formulário desativado; ver
[`contact-form.md`](contact-form.md)).

## Site público

| Página | Rota | Situação |
|---|---|---|
| Início | `/` | No ar; seções e blocos configuráveis; seção “Experiências digitais” publicada em 24/11/2026 (Etapa 10.6, ver [`digital-experiences.md`](digital-experiences.md)) |
| A Rede | `/rede` | No ar; pilares e seções configuráveis |
| Pesquisa | `/pesquisa`, `/pesquisa/[slug]` | No ar |
| Projetos | `/projetos`, `/projetos/[slug]` | No ar (filtros e paginação) |
| Publicações | `/publicacoes` | No ar; sem página individual |
| Instituições | `/instituicoes` | No ar |
| Contato | coluna do rodapé (`/#contato`) | Em todas as páginas; `/contato` redireciona (`307`) para `/#contato`. Formulário **desativado por decisão de escopo** (25/11/2026); Resend e Turnstile não são usados |
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
| Seções (início + rede) | 11 (inclui “Experiências digitais”, com 2 cards) |
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

Editores são criados pelo Administrador em `/admin/usuarios` (e-mail e senha
inicial, sem convite por e-mail) e trocam a senha no primeiro acesso; até lá o
painel e o banco recusam qualquer edição. Ver
[`user-management.md`](user-management.md).

| Módulo | Rota | Quem edita |
|---|---|---|
| Painel | `/admin` | — |
| Editor visual | `/admin/editor?pagina=/` | admin, editor |
| Homepage | `/admin/homepage` | admin, editor |
| Seções e blocos | `/admin/secoes` | admin, editor |
| Experiências digitais | `/admin/experiencias` | admin, editor |
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
| Usuários e permissões | `/admin/usuarios` | admin (cria, desativa, reativa Editores e define senha inicial) |
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

14 migrations aplicadas, de `20261103141529_initial_geologar_content_schema`
a `20261124120000_digital_experiences_section`. Tabelas principais:

- conteúdo: `homepage_content`, `research_lines`, `projects`, `publications`,
  `institutions`, `institution_categories`, `social_links`, `site_settings`;
- personalização: `site_pillars`, `site_navigation`, `page_sections`,
  `page_content`, `site_appearance`;
- fluxo editorial: `editorial_documents` (rascunhos), `editorial_revisions`
  (histórico imutável), `custom_pages`;
- acesso: `admin_memberships` (com troca obrigatória da senha inicial) e
  `admin_user_events` (histórico das operações sobre Editores);
- Storage: bucket público `geologar-media`.

Ver [`database-schema.md`](database-schema.md).

## Segurança

- RLS em todas as tabelas, com `has_cms_role`; permissões de escrita por
  coluna; sem `SECURITY DEFINER` e sem `USING (true)` para escrita.
- Trigger `editorial_guard`: o conteúdo editorial só muda pelas funções do
  fluxo de rascunho e publicação; gravação direta é recusada (`GL403`).
- Rascunhos e histórico só são lidos com a sessão do CMS; o site público lê
  apenas as tabelas publicadas.
- Operações editoriais usam a sessão do usuário, nunca `service_role`. A
  chave secreta só existe na Edge Function `admin-editor-management`, que
  valida JWT e vínculo de administrador antes de usar a API administrativa
  do Auth (lista fechada de operações; administradores nunca são alterados).
- Conta com senha inicial (`must_change_password`) não edita nada:
  `has_cms_role` e as Server Actions recusam até a troca.
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
| Testes unitários (`npm test`) | 152/152 (refinamento visual: 10) |
| Testes de banco pgTAP (12 arquivos, no banco remoto, transação desfeita) | 465/465 (refinamento visual: 31; instituições da referência: 9) |
| Playwright no preview local (Etapa 10.7) | 40 aprovados, 6 ignorados de propósito (inclui cabeçalho, busca e `/busca`) |
| Responsivo com o preset (Etapa 10.7: 7 tamanhos × 8 páginas) | Sem rolagem horizontal |
| Etapa 10.7 em produção | Aparência (revisão 3) e homepage (revisão 8) publicadas pela interface; Playwright contra produção: 40 aprovados, 6 ignorados |
| Testes ponta a ponta do visitante (`npm run test:e2e`, Playwright) | 34/34 no preview local (8 ignorados: 6 de propósito e 2 da seção de experiências, ainda não publicada naquele momento); testes das experiências contra produção depois da publicação: 4/4 |
| Edge Function publicada, sem sessão / chave publicável / JWT forjado | 401 |
| Build OpenNext e `opennextjs-cloudflare preview` | OK |
| `npm audit --omit=dev` | 0 vulnerabilidades |
| Fluxo editorial no navegador (sessão admin) | Rascunho, descarte, restauração, criar/publicar/despublicar/arquivar página, conflito entre abas, editor visual |
| Interface com conta editor (produção, sem gravar) | Permissões e avisos corretos; editor visual edita e descarta sem salvar |
| Gerenciamento de Editores em produção (conta de teste) | Criar, primeiro acesso com troca obrigatória, desativar, reativar e nova senha inicial OK; histórico sem senhas; conta de teste desativada ([detalhes](user-management.md#validação-em-produção-23112026)) |
| Responsivo (6 tamanhos × 16 páginas públicas e do CMS) | Sem rolagem horizontal |
| Seção de experiências digitais (6 tamanhos, 2 e 3 colunas) | Sem rolagem horizontal; 1 coluna no celular, 2 no tablet, 3 em telas largas quando configurado |
| Experiências digitais em produção | Publicada pela interface (revisão 5); links seguros em nova aba, sem iframe ([detalhes](digital-experiences.md#validação-em-produção-24112026)) |
| Verificação automática de acessibilidade (14 páginas) | Sem problemas (não é auditoria WCAG) |

## Pendências

### Técnicas

- Salvar e publicar pela interface com a conta **editor** ainda não
  exercitados (telas, avisos de somente consulta e editor visual verificados
  em 23/11/2026; permissões de gravação cobertas por pgTAP).
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
- Exclusão de contas e gestão de Administradores pelo painel (de propósito:
  usa-se a desativação; Administradores seguem pelo procedimento técnico).

### Da GeoLogar

- **Etapa 10.7:** tudo publicado em 24/11/2026 com autorização; falta
  substituir as 3 publicações provisórias pelas oficiais, confirmar os dados
  dos 3 projetos e os vínculos das 22 instituições;
  logotipos oficiais e autorização de uso das marcas (12 provisórios, 10
  ausentes). Ver [`visual-refinement.md`](visual-refinement.md#pendências).

- **Experiências digitais:** preencher a segunda experiência (hoje “Em
  breve”) ou ocultá-la quando houver uma experiência real; trocar o endereço
  do Bege Bahia no CMS se o endereço oficial mudar. Ver
  [`guia-edicao-geologar.md`](guia-edicao-geologar.md#como-adicionar-ou-modificar-uma-experiência-digital).

- Textos finais, fotografias reais e logotipos oficiais (incluindo os das
  instituições parceiras), com direitos de uso confirmados. As fotos atuais
  das linhas de pesquisa têm ~450 × 226 px e aparecem borradas em telas
  grandes (ver [`qa-report.md`](qa-report.md#8-imagens-a-substituir-geologar)).
- Projetos, publicações, instituições e redes sociais reais.
- Dados de contato oficiais (e-mail, telefone, WhatsApp, endereço, redes
  sociais), a cadastrar pelo CMS. O formulário de contato não é pendência.
- Links úteis do rodapé (privacidade, termos, acessibilidade) quando as
  páginas existirem.
- Decisão sobre domínio próprio.
- Contas da equipe: Editores criados pelo Administrador em
  *Usuários e permissões*; Administradores adicionais, pela equipe técnica.
