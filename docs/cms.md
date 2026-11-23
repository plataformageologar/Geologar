# CMS — GeoLogar

Gerenciamento de conteúdo dentro da área administrativa (`/admin`). A Etapa 7.1
criou a base do CMS e o primeiro módulo: **edição da homepage**. A Etapa 7.2
adicionou **linhas de pesquisa**, **projetos** e o relacionamento entre eles.
A Etapa 7.3 completou o conteúdo institucional: **publicações**,
**instituições** (com **categorias**), **informações institucionais**
(`site_settings`) e **redes sociais**. A Etapa 8 adicionou a **biblioteca de
mídia** (Supabase Storage) e o campo de imagem em homepage, linhas de
pesquisa, projetos, instituições e configurações — ver
[`media-library.md`](media-library.md). A Etapa 9.5 levou para o banco o que
ainda estava no código (pilares, menus, seções, textos das páginas internas,
rodapé e aparência), criou as telas do grupo **Site** e o **editor visual**
(`/admin/editor`) — ver [`visual-editor.md`](visual-editor.md). Todos os
itens da navegação do painel têm página.

Autenticação, papéis e sessão: ver [`admin-auth.md`](admin-auth.md).

## Estrutura

```
src/app/admin/(protected)/homepage/page.tsx   Página "Editar homepage" (Server Component)
src/components/admin/homepage/homepage-form.tsx  Formulário (Client Component)
src/components/admin/form-controls.tsx         Field, TextInput, TextArea, FormSection, FormMessage
src/lib/admin/validation.ts                    Textos, links e botões (navegador + servidor)
src/lib/admin/homepage.ts                      Campos editáveis, limites e parseHomepageValues
src/lib/admin/actions.ts                       Server Action saveHomepage (grava rascunho)
src/lib/queries/editorial.ts                   getEditorialDocument (rascunho ou versão publicada)
supabase/migrations/20261109152838_enable_homepage_cms_updates.sql
supabase/tests/database/homepage_content_rls.test.sql

src/app/admin/(protected)/linhas-de-pesquisa/        Listagem, /novo e /[id]/editar
src/app/admin/(protected)/projetos/                  Listagem (filtros + paginação), /novo e /[id]/editar
src/components/admin/research-lines/research-line-form.tsx
src/components/admin/projects/project-form.tsx       Formulário de projeto
src/components/admin/projects/research-line-picker.tsx  Seleção múltipla de linhas
src/components/admin/record-actions.tsx              Ações da listagem + diálogo de exclusão
src/components/admin/save-bar.tsx                    Barra de salvamento, aviso de saída, FormData
src/components/admin/slug-field.tsx                  Slug com geração a partir do título
src/components/admin/status-badges.tsx               Selos Publicado/Rascunho, Destaque, Situação
src/components/admin/admin-page-heading.tsx          Cabeçalho das páginas de edição
src/lib/admin/research-lines.ts | projects.ts        Campos, limites e parse (navegador + servidor)
src/lib/admin/research-line-actions.ts | project-actions.ts  Server Actions
src/lib/admin/action-results.ts                      Motivos de falha e mensagens
src/lib/queries/admin-content.ts                     Leituras do CMS com a sessão do usuário
supabase/migrations/20261109161944_enable_research_lines_projects_cms.sql
supabase/tests/database/research_lines_projects_rls.test.sql

src/app/admin/(protected)/publicacoes/               Listagem (filtros + paginação), /novo e /[id]/editar
src/app/admin/(protected)/instituicoes/              Listagem, /novo, /[id]/editar e /categorias
src/app/admin/(protected)/configuracoes/             Informações institucionais (site_settings)
src/app/admin/(protected)/redes-sociais/             Listagem + formulário (?editar=<id>)
src/components/admin/publications/publication-form.tsx
src/components/admin/institutions/institution-form.tsx | category-form.tsx
src/components/admin/settings/site-settings-form.tsx | social-link-form.tsx
src/components/admin/record-picker.tsx               Seleção múltipla genérica (projetos, linhas)
src/lib/admin/publications.ts | institutions.ts | site-settings.ts | social-links.ts
src/lib/admin/publication-actions.ts | institution-actions.ts | site-settings-actions.ts | social-link-actions.ts
src/lib/queries/admin-publications.ts | admin-institutional.ts
supabase/migrations/20261109175247_enable_publications_institutions_settings_cms.sql
supabase/tests/database/publications_institutions_settings_rls.test.sql

src/app/admin/(protected)/midias/                    Biblioteca de mídia
src/components/admin/media/                          MediaBrowser, MediaUploader, MediaPicker, MediaField
src/lib/admin/media-actions.ts                       Server Actions da biblioteca
src/lib/media/                                       Configuração, verificação de arquivo e referências
src/lib/queries/admin-media.ts                       list_media e media_usage
supabase/migrations/20261119120000_enable_media_library.sql
supabase/tests/database/media_library_rls.test.sql
```

Padrão dos módulos: página protegida com `requireAdminAccess()`, leitura com a
sessão do usuário, formulário controlado com `useActionState`, validação
compartilhada e Server Action que repete autorização e validação. Nenhuma
escrita usa chave secreta ou `service_role`: tudo passa pela sessão autenticada
e pelas políticas de RLS.

## Módulo Homepage (`/admin/homepage`)

Edita o registro único de `homepage_content`, em três blocos:

| Bloco                     | Campos                                                                                   |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| Banner principal          | `hero_title` (obrigatório), `hero_description`, botão principal e secundário (texto + destino) |
| Apresentação da rede      | `about_title`, `about_description`                                                       |
| Chamada para cooperação   | `cooperation_title`, `cooperation_description`, botão (texto + destino)                  |

- **Imagem do banner**: somente visualização. `hero_image_path` não é editável
  até a etapa do Storage; `hero_image_alt` só aparece (e é obrigatório) quando
  há imagem cadastrada.
- **Rascunho (Etapa 9.6)**: “Salvar rascunho” grava em
  `editorial_documents` (unidade `home`); o site só muda com “Publicar
  alterações”. Ver [`editorial-workflow.md`](editorial-workflow.md).
- Título vazio em "Apresentação da rede" ou "Chamada para cooperação" oculta a
  seção correspondente na homepage; título do banner é obrigatório porque sem
  ele o banner inteiro some.

### Leitura

`getEditorialDocument("home", "home")` lê o rascunho (ou a versão publicada)
com a sessão do editor e **nunca** usa `fallbackHomepageContent`. Falha de leitura mostra um erro; registro ausente
mostra "Configuração pendente" (nada é criado automaticamente). O fallback
continua valendo apenas para o site público.

### Validação

Feita no navegador para retorno imediato e repetida na Server Action:

- textos: espaços nas extremidades removidos, quebras de linha preservadas
  (`\r\n` → `\n`), limites de caracteres (contador visível), sem caracteres de
  controle; campos de uma linha não aceitam quebras; vazio é gravado como `null`;
- destinos: caminho interno (`/contato`, `/projetos?situacao=em-andamento`,
  `/#pesquisa`) ou URL completa `http(s)://` com domínio, sem usuário/senha.
  Bloqueados: `javascript:`, `data:`, `//site`, `/\site`, endereços malformados;
- botões: texto e destino juntos. Os dois vazios removem o botão; só um deles
  preenchido é erro.

### Salvamento

```
Formulário → saveHomepage (Server Action)            [Etapa 9.6]
  1. getAdminAccess(): sessão válida + vínculo ativo admin/editor
  2. lê o token "documento:versão" do campo oculto (nunca o id de tabela)
  3. saveDraftParts: lê a unidade `home`, confere a versão (edição simultânea),
     valida e normaliza a parte `homepage` (parseHomepageValues)
  4. RPC save_editorial_drafts (sessão do usuário, RLS): grava o rascunho e a
     revisão `draft_saved` numa transação
  5. confere que o banco devolveu a unidade enviada
→ resposta estruturada: sucesso (valores + nova versão) ou erro com motivo
```

O site público só muda com “Publicar alterações” (RPC
`publish_editorial_documents`). Detalhes em
[`editorial-workflow.md`](editorial-workflow.md).

Motivos de erro tratados: validação, sessão expirada, sem permissão, conflito
de edição, registro inexistente, falha de conexão e erro inesperado. As
mensagens não expõem SQL, tokens ou detalhes internos; o log do servidor
registra apenas o código do erro, nunca o texto enviado.

- **Concorrência**: se outra pessoa salvou depois que a página foi aberta, o
  envio é recusado ("alterada por outra pessoa") sem sobrescrever nada.
- **Sessão expirada**: o proxy deixa passar requisições de Server Action
  (`POST` com cabeçalho `Next-Action`); a action responde com erro e o
  formulário mantém o texto, com link para entrar em outra aba.
- **Envio duplicado**: botões e campos ficam desabilitados durante o envio.
- **Alterações pendentes**: indicador "Alterações não salvas" e aviso do
  navegador ao recarregar ou fechar a aba. A navegação interna do painel
  (barra lateral) não pede confirmação.
- **Cancelar alterações** restaura os valores carregados; não apaga nada no banco.

### Site público

A homepage pública continua usando `getHomepageData()` com renderização
dinâmica (`force-dynamic`): cada requisição lê o banco, então o conteúdo salvo
aparece na próxima visita, sem build, deploy ou `revalidatePath`. Nenhum cache
(ISR, Cache Components, KV, R2) foi adicionado.

## Segurança e RLS

Migration `20261109152838_enable_homepage_cms_updates.sql`:

- `GRANT UPDATE` em `homepage_content` **somente** nos 13 campos editoriais para
  `authenticated`. `id`, `created_at`, `updated_at` (trigger) e
  `hero_image_path` continuam somente leitura;
- policy `Active admins and editors can update homepage content`
  (`for update to authenticated`), com `USING` e `WITH CHECK` exigindo vínculo
  ativo em `admin_memberships` com papel `admin` ou `editor` (desde a Etapa
  10.5 via `has_cms_role`, que também recusa contas com troca de senha
  pendente);
- sem `INSERT`/`DELETE`, sem `SECURITY DEFINER`, sem `service_role`;
- nenhuma outra tabela recebeu permissão de escrita.

A Server Action verifica o vínculo antes do UPDATE e o banco verifica de novo
na própria gravação: desativar um vínculo bloqueia a próxima tentativa mesmo com
o formulário já aberto.

### Testes de RLS

`supabase/tests/database/homepage_content_rls.test.sql` (pgTAP, 17 asserções):
anon lê e não atualiza; sem vínculo e vínculo inativo atualizam 0 linhas;
editor e administrador ativos atualizam e leem o valor gravado; `id`,
`created_at` e `hero_image_path` são recusados; INSERT e DELETE recusados;
vínculo desativado depois de aberto deixa de atualizar. Tudo roda numa
transação desfeita no final (`ROLLBACK`), com contas temporárias.

```bash
npx supabase test db            # banco local (Docker)
npx supabase test db --remote   # projeto vinculado; nada permanece gravado
```

## Linhas de pesquisa (`/admin/linhas-de-pesquisa`)

Listagem com título e slug, publicação, destaque, ordem, número de projetos
vinculados, última atualização e ações (Editar, Ver no site quando publicada,
Publicar/Despublicar, Excluir). Abaixo de 1280 px a tabela vira cartões.

| Campo               | Regra                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| `title`             | obrigatório, até 160 caracteres, uma linha                            |
| `slug`              | obrigatório, único, até 160 caracteres, `a-z`, `0-9` e hífens         |
| `short_description` | até 300 caracteres; **obrigatória para publicar**                     |
| `description`       | até 6000 caracteres, com quebras de linha                             |
| `sort_order`        | inteiro ≥ 0 (padrão 0); menor aparece primeiro                        |
| `is_featured`       | destaque na homepage (até seis linhas são exibidas)                   |
| `is_published`      | novo registro começa como rascunho                                    |
| `image_path`        | somente visualização (upload na etapa do Storage)                     |
| `image_alt`         | só aparece e é gravado quando há imagem                               |

## Projetos (`/admin/projetos`)

Listagem paginada no servidor (10 por página) com busca por título e filtros
de publicação (Todos/Publicados/Rascunhos) e situação (Todos/Em andamento/
Concluídos/A confirmar). Os filtros usam GET (`?busca=&publicacao=&situacao=&pagina=`) e
funcionam sem JavaScript; página fora do intervalo responde 404.

| Campo                    | Regra                                                          |
| ------------------------ | -------------------------------------------------------------- |
| `title`                  | obrigatório, até 200 caracteres                                |
| `slug`                   | igual às linhas de pesquisa                                    |
| `short_description`      | até 400; obrigatória para publicar                             |
| `description`            | até 10000                                                      |
| `project_status`         | `ongoing` (Em andamento) ou `completed` (Concluído); obrigatório para publicar. Em rascunho pode ficar "A confirmar" (`null`) |
| `start_date`/`end_date`  | opcionais, `AAAA-MM-DD` entre 1900 e 2100; término ≥ início    |
| `coordination`, `funding` | até 1000 cada                                                 |
| `result_or_contribution` | até 4000                                                       |
| `external_url`           | `http(s)://` com domínio, sem usuário/senha                    |
| linhas de pesquisa       | seleção múltipla (até 100), sem duplicatas, só linhas existentes |
| `sort_order`, `is_featured`, `is_published`, imagem | como nas linhas de pesquisa |

A situação "A confirmar" (Etapa 8.5) existe para preparar projetos ainda não
validados sem atribuir uma situação fictícia. O formulário, a Server Action e
o banco (constraint `projects_published_status`) recusam publicar sem
situação; um projeto publicado não volta a ficar sem situação. Na listagem,
o selo mostra "A confirmar".

## Relacionamento projeto ↔ linha de pesquisa

Editado **no formulário do projeto** (grupo de checkboxes nativos, com busca a
partir de 8 linhas). Linhas em rascunho podem ser vinculadas e aparecem com o
selo "Rascunho". No site, um vínculo só aparece quando o projeto **e** a linha
estão publicados (política existente de `project_research_lines`).

O projeto e seus vínculos são gravados pela função `public.save_project(...)`
em **uma única transação** (uma chamada RPC): insere ou atualiza o projeto,
remove os vínculos desmarcados e insere os novos. Qualquer erro (slug
duplicado, linha inexistente, conflito de versão) desfaz tudo — não há projeto
salvo com vínculos pela metade. A função é `SECURITY INVOKER`: roda com a
permissão do usuário logado e passa pelas mesmas políticas de RLS.

## Fluxos comuns a linhas e projetos

- **Slug**: gerado do título (sem acentos, minúsculas, hífens) enquanto não for
  editado à mão; editar o slug interrompe a geração automática, e o botão
  "Gerar do título" a retoma. Slug duplicado mostra erro no campo e o mesmo
  valor não é reenviado até ser alterado.
- **Slug de conteúdo publicado**: aviso de que o endereço antigo deixará de
  funcionar. Não há redirecionamento automático do slug antigo (necessidade
  futura, se links externos começarem a apontar para o portal).
- **Publicação**: pelo checkbox do formulário ou pelo botão da listagem. Antes
  de publicar, a validação completa roda de novo (ex.: descrição curta).
  `published_at` é preenchido pelo trigger existente na primeira publicação.
- **Criação**: após criar, o formulário abre em `/[id]/editar` com a mensagem
  "criado como rascunho" ou "criado e publicado" (conforme o resultado real).
- **Edição simultânea**: o `updated_at` carregado é enviado junto; se outra
  pessoa salvou antes, nada é sobrescrito e a mensagem oferece recarregar.
  Edições pela listagem (publicar/despublicar) também mudam a versão.
- **Confirmação**: depois de gravar, a action relê o registro (e os vínculos)
  e confere que o banco devolveu exatamente o que foi enviado.
- **Envio a partir do estado**: os formulários não usam `<form action>`; o
  `onSubmit` monta o `FormData` a partir do estado React e chama a action em
  `startTransition`. Motivo: no React 19, `<form action>` redefine o formulário
  após o envio, e checkboxes controlados voltavam ao estado inicial na tela
  (diferente do que foi salvo).
- **Alterações pendentes**: indicador "Alterações não salvas", aviso do
  navegador ao sair e botão para descartar.

## Publicações (`/admin/publicacoes`)

- Listagem: título, autores, ano, veículo, situação, destaque, vínculos e data
  de atualização. Filtros por situação e ano, busca por título ou autores e
  paginação no servidor (10 por página). Ordem: ano (mais recentes),
  `sort_order` e título.
- Ações: editar, publicar/despublicar, excluir (admin, rascunho sem vínculos) e
  "Abrir recurso externo" (URL externa ou `https://doi.org/<doi>`). Publicações
  ainda não têm página individual: o slug é reservado e o link público do
  registro é a lista `/publicacoes`.
- Formulário em cinco seções: Identificação (título, slug, autores, ano), Dados
  bibliográficos (veículo, DOI, URL, citação), Conteúdo (resumo),
  Relacionamentos (projetos e linhas, ambos opcionais) e Publicação.
- **DOI**: aceita `10.xxxx/...`, `doi:10.xxxx/...` ou
  `https://doi.org/10.xxxx/...`; é gravado sem prefixo. DOI duplicado é
  recusado com mensagem no campo.
- **Ano**: quatro dígitos entre 1800 e 2100, opcional.
- Gravação atômica pela função `public.save_publication(...)` (`SECURITY
  INVOKER`): publicação e vínculos numa só transação, com verificação de versão
  (`updated_at`).

## Instituições (`/admin/instituicoes`)

- Listagem: nome, sigla, categoria, local, situação, destaque e data de
  atualização. Filtros por situação e categoria, busca por nome ou sigla,
  paginação. Ação "Abrir website" quando há site.
- Formulário: Identificação (nome, sigla, categoria obrigatória, descrição),
  Localização, Website, Publicação e Identidade visual. O logotipo aparece só
  para consulta (sem alteração, recorte ou recoloração); o texto alternativo só
  é editável quando há logotipo. Envio de logotipos: Etapa 8.
- Exclusão: admin, somente rascunhos.

### Categorias (`/admin/instituicoes/categorias`)

- Lista com slug, ordem e número de instituições; formulário de criação ou
  edição na mesma página (`?editar=<id>`).
- Criar, editar e excluir: somente admin. Editores consultam.
- Sem rascunho: alterações valem no site imediatamente.
- Exclusão somente de categorias vazias (FK `ON DELETE RESTRICT`); nome e slug
  duplicados são recusados com mensagem própria.

## Informações institucionais (`/admin/configuracoes`)

- Registro único de `site_settings`, editável somente por admin (editores veem
  o formulário desabilitado).
- Seções: Identificação (nome do site obrigatório, nome institucional, slogan,
  descrição curta), Contato (e-mail validado; telefone gravado como digitado),
  Localização e Identidade visual (logotipo do cabeçalho e favicon, pela
  biblioteca de mídia; vazios, o site usa os arquivos oficiais do código).
- Atualiza o registro existente (nunca cria nem usa upsert), com verificação
  de versão. Se o registro não existir, a página mostra um aviso e não oferece
  formulário: a recuperação é feita pela equipe técnica, como na homepage.
- Uso público: `site_name` e `short_description` nos metadados;
  `institutional_name`, e-mail, telefone e endereço no rodapé e em `/contato`.
  O slogan (`tagline`) ainda não é exibido pelo layout.
- Campos vazios ficam vazios: nenhum dado de contato é inventado.

## Redes sociais (`/admin/redes-sociais`)

- Lista na ordem do rodapé com plataforma, rótulo, endereço, ordem e situação;
  formulário de cadastro ou edição na mesma página (`?editar=<id>`).
- Plataformas sugeridas (Instagram, LinkedIn, YouTube, Facebook, X,
  ResearchGate, Lattes) ou "Outra plataforma" com identificador livre
  (minúsculas, números e hífens).
- Ativar/Desativar pela lista; somente links ativos aparecem no rodapé.
- URL duplicada é recusada com mensagem clara. Tudo restrito a admin.

## Exclusão

- Somente **administradores** veem e usam "Excluir"; editores não excluem.
- Somente **rascunhos** podem ser excluídos: despublique antes.
- Registros com vínculos (projetos ↔ linhas, publicações ↔ linhas/projetos) não
  são excluídos; a mensagem lista os vínculos, para que sejam desfeitos antes.
- Categorias só são excluídas vazias. Redes sociais (sem rascunho) podem ser
  excluídas por admin a qualquer momento; "Desativar" é a opção reversível.
- Diálogo nativo (`<dialog>`) com foco inicial em "Cancelar" e botão
  "Excluir permanentemente".
- Regras garantidas **no banco**, não só na interface: a política de DELETE
  exige papel `admin` e `is_published = false`, e as FKs das relações usam
  `ON DELETE RESTRICT` do lado da linha/projeto (a verificação de FK ignora
  RLS, então um vínculo invisível também bloqueia a exclusão).

## Imagens (Etapa 8)

Homepage (imagem de fundo do banner), linhas de pesquisa, projetos,
instituições (logotipo) e configurações (logotipo do cabeçalho e favicon) usam
o campo `MediaField`: selecionar, substituir ou remover uma imagem da
biblioteca só altera o formulário; o banco muda ao salvar, com imagem e texto
alternativo na mesma gravação (projetos: dentro de `save_project`). Remover a
imagem nunca exclui o arquivo. Uma imagem excluída da biblioteca entre a
seleção e o salvamento é recusada pelo banco (`GL422`) e o campo mostra o
erro. Detalhes, permissões, exclusão segura e o passo a passo "Como adicionar
uma imagem a um projeto" em [`media-library.md`](media-library.md).

## Permissões e RLS (Etapa 7.2)

Migration `20261109161944_enable_research_lines_projects_cms.sql`:

- função `public.has_cms_role(text[])` (`SECURITY INVOKER`, `search_path` vazio)
  usada nas políticas: vínculo ativo em `admin_memberships` com um dos papéis;
- leitura de rascunhos por admin/editor em `research_lines`, `projects` e nas
  três tabelas N:N; as políticas públicas continuam iguais;
- `INSERT`/`UPDATE` por admin/editor com GRANT apenas nas colunas editoriais
  (`id`, `created_at`, `updated_at`, `published_at` e `image_path` ficam fora;
  `image_alt` só no UPDATE);
- `DELETE` por admin apenas em rascunhos; vínculos projeto ↔ linha podem ser
  criados e removidos por admin/editor;
- constraints novas: título não vazio, slug ≤ 160, `sort_order ≥ 0`;
- nenhuma escrita para `anon`; nenhuma função `SECURITY DEFINER` nova;
  publicações continuam sem escrita.

### Testes de RLS

`supabase/tests/database/research_lines_projects_rls.test.sql` (pgTAP, 47
asserções): anon, conta sem vínculo e vínculo inativo não leem rascunhos nem
escrevem; editor lê rascunhos, cria, edita e publica, mas não exclui e não
altera `id`, `image_path` ou `published_at`; slug duplicado e ordem negativa são
recusados; `save_project` cria e atualiza vínculos, recusa versão antiga, linha
inexistente (sem gravação parcial), duplicatas e datas invertidas; admin não
exclui publicado nem registro com vínculos e exclui rascunho sem vínculos;
vínculo desativado bloqueia a escrita. Tudo em transação desfeita.

## Permissões e RLS (Etapa 7.3)

Migration `20261109175247_enable_publications_institutions_settings_cms.sql`:

- leitura de rascunhos/inativos por admin/editor em `publications`,
  `institutions` e `social_links`;
- `publications` e `institutions`: INSERT/UPDATE por admin/editor, DELETE por
  admin só em rascunhos; vínculos publicação ↔ projeto/linha por admin/editor;
- `institution_categories`, `social_links` e `site_settings` (somente UPDATE):
  escrita apenas por admin;
- GRANTs só nas colunas editoriais (`logo_path`, `favicon_path`, `id`, datas de
  controle e `published_at` ficam fora; `logo_alt` só no UPDATE);
- FKs `publication_projects.publication_id` e
  `publication_research_lines.publication_id` passam a `RESTRICT`;
- constraints novas: textos obrigatórios não vazios, slug ≤ 160, plataforma
  ≤ 40, `sort_order ≥ 0`;
- função `public.save_publication(...)` (`SECURITY INVOKER`, só
  `authenticated`); nenhuma função `SECURITY DEFINER` nova.

### Testes de RLS

`supabase/tests/database/publications_institutions_settings_rls.test.sql`
(pgTAP, 71 asserções): matriz de permissões de anon, conta sem vínculo, vínculo
inativo, editor e admin nas cinco tabelas; DOI, ano, slug e autores;
atomicidade de `save_publication` (versão antiga, projeto inexistente,
duplicatas); FKs com RESTRICT; proteção do registro único de `site_settings`;
revogação ao desativar o vínculo. Tudo em transação desfeita.

## Recuperar o registro da homepage

Se `homepage_content` ficar vazia ("Configuração pendente" no CMS), recrie o
registro pelo SQL Editor (operação privilegiada; o CMS não insere registros):

```sql
insert into public.homepage_content (hero_title)
values ('Geociências conectando território, ciência e sociedade');
```

O índice `homepage_content_singleton` impede um segundo registro. Depois,
preencha os demais campos pelo CMS.

## Prévia de demonstração (`/admin/demonstracao`)

Página para revisar a homepage com a equipe GeoLogar antes da publicação
definitiva (menu "Prévia de demonstração"). Reaproveita os componentes do
site público e acrescenta só aqui:

- os **rascunhos de projeto** (até 6, por ordem), sem link para detalhe;
- **notas por seção** — "No site público", "Rascunho (não público)" ou
  "Pendente" — com o que falta;
- **espaços reservados** para publicações e instituições enquanto não houver
  registros publicados.

Segurança: o proxy redireciona visitantes sem sessão para o login e marca a
resposta como `private, no-store`; a página chama `requireAdminAccess()`; os
rascunhos são lidos com a sessão do usuário (RLS libera apenas admin/editor
ativos); o layout `/admin` aplica `noindex, nofollow`. A prévia não grava
nada. Pendências do cliente em [`content-handover.md`](content-handover.md).

## Personalização do site (Etapas 9.5 e 9.6)

Grupo **Site** no menu do painel. Cada tela tem o link “Editar visualmente”
para o editor visual. Desde a Etapa 9.6 todas estas telas gravam
**rascunhos**: a barra editorial no topo mostra o estado e oferece
“Publicar alterações”, “Visualizar rascunho”, “Histórico de versões” e
“Descartar rascunho” (ver [`editorial-workflow.md`](editorial-workflow.md)).

| Tela | Papel | Conteúdo | Unidade editorial |
| --- | --- | --- | --- |
| `/admin/editor?pagina=/` | admin, editor | Editor visual (ver [`visual-editor.md`](visual-editor.md)) | todas abaixo |
| `/admin/homepage` | admin, editor | Textos da página inicial | `home` |
| `/admin/secoes?pagina=home\|rede` | admin, editor | Ordem, visibilidade e opções das seções; blocos texto, imagem + texto, chamada, galeria e logotipos | `home` / `rede` |
| `/admin/pilares` | admin, editor | Pilares da rede (título, descrição, ícone da lista fixa) | `pillars` |
| `/admin/textos-das-paginas?pagina=` | admin, editor | Rótulo, título, introdução e SEO de rede, pesquisa, projetos, publicações, instituições e contato | `rede` / `page` |
| `/admin/paginas` | admin, editor | Páginas personalizadas (ver [`custom-pages.md`](custom-pages.md)) | `custom` |
| `/admin/historico` | admin, editor | Lista dos conteúdos com a situação de cada um (Etapa 10) | — |
| `/admin/historico?documento=` | admin, editor | Histórico de versões, comparação e restauração | — |
| `/admin/navegacao?menu=header\|footer` | admin (editor vê a versão publicada) | Links do cabeçalho e do rodapé; lista de páginas personalizadas; aviso de links para páginas fora do ar | `navigation` |
| `/admin/aparencia` | admin | Cores, fundo, botões, cantos, fonte dos títulos, cards | `appearance` |
| `/admin/configuracoes` | admin (editor vê a versão publicada) | Informações institucionais + “Cabeçalho e rodapé” | `settings` |

Arquivos: `src/app/admin/(protected)/{homepage,secoes,pilares,textos-das-paginas,paginas,historico,navegacao,aparencia,configuracoes}/`,
`src/components/admin/site/` (campos e editores compartilhados com o editor
visual), `src/components/admin/editorial/` (barra editorial, histórico,
páginas), `src/lib/site/` (validação), `src/lib/admin/editorial.ts` e
`src/lib/admin/editorial-actions.ts` (Server Actions do fluxo),
`src/lib/queries/editorial.ts`.

Regras:

- Cada tela salva só a sua parte da unidade (ex.: `sections` da `home`) por
  `saveEditorialDrafts`, que valida com as mesmas regras da Etapa 9.5 e
  grava pela RPC `save_editorial_drafts`. A edição simultânea é detectada
  pela versão da unidade (`GL409`). As funções de gravação direta da Etapa
  9.5 (`save_site_pillars`, `save_site_navigation`, `save_page_sections`) e
  as actions antigas (`site-config-actions.ts`) foram aposentadas: o banco
  recusa gravação fora do fluxo editorial (`GL403`).
- Seções nativas (hero, apresentação, pilares, pesquisa, projetos,
  publicações, instituições, cooperação) podem ser ocultadas e reordenadas,
  não removidas nem duplicadas. Blocos podem ser adicionados, duplicados e
  removidos (até 40 seções por página).
- As configurações de cada seção são JSONB com chaves permitidas por tipo,
  validadas no servidor (`validateSectionSettings`) e no banco
  (`is_valid_section_settings`). Sem HTML, CSS ou componentes livres.
- Links: caminhos internos ou URLs http(s) (recomenda-se `https://`); nos
  menus, `/admin`, `/api` e `/auth` também são recusados. CTAs que apontam para âncoras de seções
  ocultas são omitidos no site.
- O acesso à área restrita não faz parte dos menus editáveis (fica no
  código), para que nenhuma edição bloqueie o painel.
- Campos vazios em “Textos das páginas” usam o texto padrão
  (`resolvePageHeader`).
- Aparência: só cores `#rrggbb` com contraste mínimo de 4,5:1 e opções
  fechadas, aplicadas como variáveis CSS (ver
  [`design-system.md`](design-system.md#personalização-etapa-95)).

## Limitações atuais

- Sem rich text nem agendamento de publicação.
- Sem redirecionamento de slugs antigos. O endereço de páginas
  personalizadas fica fixo depois da primeira publicação.
- Projetos, linhas, publicações, instituições e redes sociais mantêm o fluxo
  por registro (sem histórico de versões).
- Ordenação por número (`sort_order`) ou botões subir/descer, sem arrastar e
  soltar.
- Imagens sem recorte ou compressão no navegador (ver
  [`media-library.md`](media-library.md#limitações)).
- Publicações não têm página individual; o slug fica reservado.
- Sem confirmação ao sair pela navegação interna com alterações pendentes.
- Testes de ponta a ponta com login real são manuais (ver
  [`admin-auth.md`](admin-auth.md#testes-manuais)).

## Próximos módulos

- Etapa 8 concluída: Supabase Storage e biblioteca de mídia
  ([`media-library.md`](media-library.md)).
- Etapa 8.5 concluída: população inicial de demonstração e prévia protegida
  ([`initial-content-manifest.md`](initial-content-manifest.md)).
- Etapa 9 concluída: formulário de contato (desativado até a configuração
  pela GeoLogar), sem gravação no banco ([`contact-form.md`](contact-form.md)).
- Etapa 9.5 concluída: editor visual e personalização do site
  ([`visual-editor.md`](visual-editor.md),
  [`guia-edicao-geologar.md`](guia-edicao-geologar.md)).
- Etapa 9.6 concluída: rascunhos, publicação controlada, histórico de
  versões e páginas personalizadas
  ([`editorial-workflow.md`](editorial-workflow.md),
  [`custom-pages.md`](custom-pages.md)).
