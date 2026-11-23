# Fluxo editorial — rascunhos, publicação e histórico (Etapa 9.6)

Desde a Etapa 9.6, **salvar não publica**. Tudo o que a equipe muda no
conteúdo do site (pelo CMS ou pelo editor visual) vira primeiro um
**rascunho** guardado no Supabase. O site público só muda quando alguém clica
em **Publicar alterações**. Cada rascunho salvo, restauração e publicação fica
registrado num **histórico de versões** que não pode ser alterado.

Guia para quem edita: [`guia-edicao-geologar.md`](guia-edicao-geologar.md).
Páginas novas: [`custom-pages.md`](custom-pages.md).

## Unidades editoriais

O conteúdo é dividido em unidades de publicação. Cada unidade tem um rascunho
(ou nenhum), uma versão publicada e uma lista de revisões.

| Unidade (`doc_type`) | `doc_key` | Partes do conteúdo | Tabelas publicadas | Quem publica |
| --- | --- | --- | --- | --- |
| `home` | `home` | `homepage`, `sections` | `homepage_content`, `page_sections` (home) | admin, editor |
| `rede` | `rede` | `page`, `sections` | `page_content` (rede), `page_sections` (rede) | admin, editor |
| `page` | `pesquisa`, `projetos`, `publicacoes`, `instituicoes`, `contato` | `page` | `page_content` | admin, editor |
| `pillars` | `pillars` | `items` | `site_pillars` | admin, editor |
| `custom` | id da página | `page`, `sections` | `custom_pages`, `page_sections` (custom) | admin, editor |
| `navigation` | `navigation` | `header`, `footer` | `site_navigation` | somente admin |
| `appearance` | `appearance` | `appearance` | `site_appearance` | somente admin |
| `settings` | `settings` | `settings` | `site_settings` | somente admin |

Projetos, linhas de pesquisa, publicações, instituições e redes sociais
continuam com o fluxo próprio (status *rascunho/publicado* por registro), que
já existia antes desta etapa.

## Estados mostrados ao usuário

| Estado | Significado |
| --- | --- |
| Sem alterações / Publicado, sem rascunho | Nada pendente. O CMS mostra a versão publicada. |
| Alterações não salvas | Existe edição só no navegador. Fechar a aba avisa. |
| Rascunho salvo, diferente da versão publicada | Há rascunho no banco; o site ainda mostra a versão anterior. |
| Rascunho salvo, igual à versão publicada — nada a publicar | Há rascunho, mas o conteúdo coincide com o publicado. **Publicar** fica desativado (desde a Etapa 10); use “Descartar rascunho” para limpar. Em páginas personalizadas o rascunho igual pode ser publicado (é assim que uma página despublicada volta ao ar). |
| Rascunho salvo — ainda não publicado | Unidade nova (página personalizada) que nunca foi publicada. |
| Conflito | Outra pessoa salvou a mesma unidade depois que você abriu a tela. Nada é sobrescrito. |
| Falha ao salvar/publicar | Erro de rede, sessão ou validação. A mensagem diz o que fazer; o que foi digitado continua na tela. |

## Ações

| Ação | Efeito | Site público |
| --- | --- | --- |
| **Salvar rascunho** | Grava o rascunho e cria a revisão `draft_saved`. | Não muda |
| **Descartar alterações não salvas** | Volta ao último rascunho salvo (ou ao publicado). Só no navegador. | Não muda |
| **Descartar rascunho** | Apaga o rascunho da unidade (com confirmação). As revisões ficam no histórico. | Não muda |
| **Publicar alterações** | Aplica o rascunho às tabelas publicadas e cria a revisão `published`. | Muda |
| **Restaurar como rascunho** | Copia o conteúdo de uma revisão antiga para um NOVO rascunho (revisão `restored`). | Não muda até publicar |
| **Desfazer** (editor visual) | Desfaz a última edição na tela, antes de salvar. | Não muda |
| **Despublicar** (páginas personalizadas, admin) | Tira a página do site; blocos e histórico ficam. | Página passa a 404 |

Unidades globais (navegação, aparência, configurações) mostram um aviso no
diálogo de publicação, porque mudam todas as páginas do site.

## Arquitetura

```
CMS / editor visual (navegador)
   │  Server Actions (src/lib/admin/editorial-actions.ts, actions.ts,
   │  site-settings-actions.ts) — validam com as mesmas regras de antes
   ▼
RPC SECURITY INVOKER (sessão do usuário, RLS valendo)
   save_editorial_drafts · publish_editorial_documents · discard_editorial_draft
   restore_editorial_revision · create_custom_page · update_custom_page_slug
   set_custom_page_status
   ▼
editorial_documents (rascunho + versão)   editorial_revisions (somente inclusão)
   │ publicar = mesma transação
   ▼
tabelas publicadas (homepage_content, page_sections, site_pillars, page_content,
site_navigation, site_appearance, site_settings, custom_pages)
   ▲
site público — lê somente as tabelas publicadas (cliente anônimo)
```

- **Rascunhos nunca chegam ao site público.** O site lê só as tabelas
  publicadas; `editorial_documents` e `editorial_revisions` só são legíveis por
  contas ativas do CMS (RLS) e só pelo cliente com sessão do servidor.
- **Transação única.** Salvar várias unidades de uma vez (editor visual) e
  publicar várias unidades são uma única chamada RPC = uma única transação.
  Se uma unidade falhar (permissão, conflito, imagem ausente, validação), nada
  é gravado e a tela mostra o erro, nunca sucesso parcial.
- **Conflito.** Cada unidade tem `version` (inteiro). O formulário envia
  `documento:versão`; a RPC trava a linha (`for update`) e recusa com `GL409`
  se a versão mudou.
- **Guarda contra o caminho antigo.** O trigger `editorial_guard`
  (migration `20261123120500_editorial_write_guard.sql`) recusa com `GL403`
  qualquer INSERT/UPDATE/DELETE de `anon`/`authenticated` nas tabelas
  editoriais fora das RPCs do fluxo, que ligam `geologar.editorial_write`
  apenas na própria transação (`set_config(..., true)`). As funções de
  gravação da Etapa 9.5 (`save_site_pillars`, `save_site_navigation`,
  `save_page_sections`) e o UPDATE direto pelo Data API ficam bloqueados.
  Migrations e manutenção (`postgres`) não são afetadas.
- **Sem privilégio extra.** Todas as funções são `SECURITY INVOKER` com
  `search_path` vazio; RLS e GRANTs das tabelas continuam decidindo quem pode
  o quê. Não há `SECURITY DEFINER`, `service_role` nem policy `USING (true)`
  para escrita.

### Códigos de erro

| Código | Situação | Mensagem na tela |
| --- | --- | --- |
| `GL409` | Versão desatualizada (edição simultânea) | Conflito: recarregue e reaplique |
| `GL404` | Publicar sem rascunho | Nada para publicar |
| `GL422` | Imagem do rascunho não existe na biblioteca | Imagem removida |
| `GL423` | Estado não permite (página arquivada, endereço fixo) | Explica o estado |
| `GL403` | Gravação fora do fluxo editorial | Erro interno (não deve ocorrer pela interface) |
| `42501` | Sem permissão (papel ou conta inativa) | Sem permissão |
| `22023` | Conteúdo inválido | Validação |
| `23505` | Endereço de página já usado | Endereço em uso |

## Histórico de versões

- Tela `/admin/historico` (item **Histórico de versões** no menu do painel,
  grupo Revisão): lista todos os conteúdos que o papel pode ver, com a
  situação (rascunho pendente, revisão publicada) e os links **Ver
  histórico** e **Editar**.
- Tela `/admin/historico?documento=<id>`: lista paginada (25 por página) com
  número, operação, autor, data e observação. Cada revisão pode ser comparada
  com a versão publicada ou com a revisão anterior; a comparação é
  estruturada (campo alterado, bloco incluído/removido/oculto/movido, link do
  menu alterado).
- No editor visual: botão **Histórico de versões** → escolher a unidade →
  **Ver na tela** (pré-visualização somente leitura) ou **Restaurar como
  rascunho**.
- Revisões são imutáveis: não há policy de UPDATE/DELETE e o guard recusa
  alterações. As chaves estrangeiras são `on delete restrict`.
- Restaurar revalida o conteúdo pelas regras atuais. Se a revisão tiver dados
  que não valem mais (por exemplo, imagem removida), a restauração é recusada
  com a explicação.

## Imagens

`media_usage` (usada pela biblioteca de mídia) também procura referências em
rascunhos e em todas as revisões. Uma imagem citada por qualquer versão
guardada não pode ser excluída da biblioteca, para que restaurar continue
possível.

## Permissões

| | Admin | Editor | Conta inativa / visitante |
| --- | --- | --- | --- |
| Rascunho de home, A Rede, páginas internas, pilares, páginas personalizadas | ✔ | ✔ | — |
| Publicar essas unidades, restaurar, descartar | ✔ | ✔ | — |
| Criar página personalizada; alterar endereço antes da 1ª publicação | ✔ | ✔ | — |
| Rascunho/publicação de navegação, aparência, configurações | ✔ | — (vê a versão publicada) | — |
| Despublicar; arquivar ou reativar página já publicada | ✔ | — | — |
| Arquivar página nunca publicada | ✔ | ✔ | — |
| Ler rascunhos e histórico | ✔ | ✔ (exceto unidades só de admin) | — |

O papel vem sempre do banco (`has_cms_role`), nunca do navegador.

## Testes

- `supabase/tests/database/editorial_workflow.test.sql` (pgTAP, 61
  verificações): visitante, conta sem vínculo, guarda, rascunho, conflito,
  publicação atômica, restauração, histórico imutável, referências de
  imagem, unidades de admin, conta inativa, páginas personalizadas. Tudo numa
  transação desfeita (contas `example.test`).
- `tests/site/editorial.test.ts` (unitários): token de versão, leitura
  tolerante do JSONB, comparação estruturada, rotas do editor, fatias do
  editor visual.

## Migração dos dados existentes

A migration `20261123120000_editorial_drafts_revisions_custom_pages.sql` cria
um documento por unidade e a revisão 1 (“Versão publicada inicial”) com o
conteúdo que já estava no ar. Nenhum registro foi excluído e nenhum seed foi
reexecutado.
