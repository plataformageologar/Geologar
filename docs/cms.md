# CMS — GeoLogar

Gerenciamento de conteúdo dentro da área administrativa (`/admin`). A Etapa 7.1
criou a base do CMS e o primeiro módulo: **edição da homepage**. Os demais
módulos (linhas de pesquisa, projetos, publicações, instituições,
configurações e redes sociais) aparecem no painel como "Em breve".

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
```

Padrão para os próximos módulos: página protegida com `requireAdminAccess()`,
leitura com a sessão do usuário, formulário controlado com `useActionState`,
validação compartilhada e Server Action que repete autorização e validação.

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

- Sem upload de imagens (Storage), rich text, histórico de versões, rascunhos
  ou agendamento.
- Sem confirmação ao sair pela navegação interna com alterações pendentes.
- Testes de ponta a ponta com login real são manuais (ver
  [`admin-auth.md`](admin-auth.md#testes-manuais)).

## Próximos módulos

- **7.2** Linhas de pesquisa e projetos: listagem, cadastro, edição, exclusão
  controlada, publicação, destaques, ordenação, slugs e relacionamentos.
- **7.3** Publicações, instituições, configurações e redes sociais.
- **8** Supabase Storage e biblioteca de mídia.
