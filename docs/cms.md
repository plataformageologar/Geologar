# CMS — GeoLogar

Gerenciamento de conteúdo dentro da área administrativa (`/admin`). A Etapa 7.1
criou a base do CMS e o primeiro módulo: **edição da homepage**. A Etapa 7.2
adicionou **linhas de pesquisa**, **projetos** e o relacionamento entre eles.
Os demais módulos (publicações, instituições, configurações e redes sociais)
aparecem no painel como "Em breve".

Autenticação, papéis e sessão: ver [`admin-auth.md`](admin-auth.md).

## Estrutura

```
src/app/admin/(protected)/homepage/page.tsx   Página "Editar homepage" (Server Component)
src/components/admin/homepage/homepage-form.tsx  Formulário (Client Component)
src/components/admin/form-controls.tsx         Field, TextInput, TextArea, FormSection, FormMessage
src/lib/admin/validation.ts                    Textos, links e botões (navegador + servidor)
src/lib/admin/homepage.ts                      Campos editáveis, limites e parseHomepageValues
src/lib/admin/actions.ts                       Server Action saveHomepage
src/lib/queries/admin.ts                       getHomepageForEdit (leitura para o CMS)
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
- **Sem rascunho**: salvar atualiza o site público imediatamente. Por isso não
  existe botão "Publicar".
- Título vazio em "Apresentação da rede" ou "Chamada para cooperação" oculta a
  seção correspondente na homepage; título do banner é obrigatório porque sem
  ele o banner inteiro some.

### Leitura

`getHomepageForEdit()` lê o registro com a sessão do editor e **nunca** usa
`fallbackHomepageContent`. Falha de leitura mostra um erro; registro ausente
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
Formulário → saveHomepage (Server Action)
  1. getAdminAccess(): sessão válida + vínculo ativo admin/editor
  2. lê id, updated_at e hero_image_path do registro (o id nunca vem do navegador)
  3. valida e normaliza os campos (parseHomepageValues)
  4. compara o updated_at enviado com o atual (edição simultânea)
  5. UPDATE ... WHERE id = ? AND updated_at = ? RETURNING (sessão do usuário, RLS)
  6. confere que o banco devolveu exatamente os valores enviados
→ resposta estruturada: sucesso (novos valores + versão) ou erro com motivo
```

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
  ativo em `admin_memberships` com papel `admin` ou `editor`;
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
Concluídos). Os filtros usam GET (`?busca=&publicacao=&situacao=&pagina=`) e
funcionam sem JavaScript; página fora do intervalo responde 404.

| Campo                    | Regra                                                          |
| ------------------------ | -------------------------------------------------------------- |
| `title`                  | obrigatório, até 200 caracteres                                |
| `slug`                   | igual às linhas de pesquisa                                    |
| `short_description`      | até 400; obrigatória para publicar                             |
| `description`            | até 10000                                                      |
| `project_status`         | obrigatório: `ongoing` (Em andamento) ou `completed` (Concluído) |
| `start_date`/`end_date`  | opcionais, `AAAA-MM-DD` entre 1900 e 2100; término ≥ início    |
| `coordination`, `funding` | até 1000 cada                                                 |
| `result_or_contribution` | até 4000                                                       |
| `external_url`           | `http(s)://` com domínio, sem usuário/senha                    |
| linhas de pesquisa       | seleção múltipla (até 100), sem duplicatas, só linhas existentes |
| `sort_order`, `is_featured`, `is_published`, imagem | como nas linhas de pesquisa |

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

## Exclusão

- Somente **administradores** veem e usam "Excluir"; editores não excluem.
- Somente **rascunhos** podem ser excluídos: despublique antes.
- Registros com vínculos (projetos ↔ linhas, publicações ↔ linhas/projetos) não
  são excluídos; a mensagem lista os projetos vinculados ou o número de
  publicações, para que os vínculos sejam desfeitos antes.
- Diálogo nativo (`<dialog>`) com foco inicial em "Cancelar" e botão
  "Excluir permanentemente".
- Regras garantidas **no banco**, não só na interface: a política de DELETE
  exige papel `admin` e `is_published = false`, e as FKs das relações usam
  `ON DELETE RESTRICT` do lado da linha/projeto (a verificação de FK ignora
  RLS, então um vínculo invisível também bloqueia a exclusão).

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

## Recuperar o registro da homepage

Se `homepage_content` ficar vazia ("Configuração pendente" no CMS), recrie o
registro pelo SQL Editor (operação privilegiada; o CMS não insere registros):

```sql
insert into public.homepage_content (hero_title)
values ('Geociências conectando território, ciência e sociedade');
```

O índice `homepage_content_singleton` impede um segundo registro. Depois,
preencha os demais campos pelo CMS.

## Limitações atuais

- Sem upload de imagens (Storage), rich text, histórico de versões ou
  agendamento. A homepage não tem rascunho.
- Sem redirecionamento de slugs antigos.
- Ordenação por número (`sort_order`), sem arrastar e soltar.
- Vínculos com publicações só serão editáveis na Etapa 7.3.
- Sem confirmação ao sair pela navegação interna com alterações pendentes.
- Testes de ponta a ponta com login real são manuais (ver
  [`admin-auth.md`](admin-auth.md#testes-manuais)).

## Próximos módulos

- **7.3** Publicações, instituições, configurações e redes sociais.
- **8** Supabase Storage e biblioteca de mídia.
