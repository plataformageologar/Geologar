# Páginas personalizadas (Etapa 9.6)

A equipe pode criar páginas institucionais novas (por exemplo “Quem somos”
ou “Eventos”) sem programação. Elas ficam em `/paginas/<endereço>`, usam os
mesmos blocos das seções da página inicial e seguem o
[fluxo editorial](editorial-workflow.md): rascunho → publicar → histórico.

## Onde

| Tela | Função |
| --- | --- |
| `/admin/paginas` | Lista de páginas com título, endereço e situação |
| `/admin/paginas/nova` | Criar: título, endereço, introdução e dados para buscadores |
| `/admin/paginas/<id>` | Endereço e situação, cabeçalho/SEO, blocos, publicação, histórico |
| `/admin/editor?pagina=/paginas/<endereço>` | Editar a página no editor visual |
| `/paginas/<endereço>` | Página pública (somente quando publicada) |

## Ciclo de vida

```
criar ──► rascunho (Não publicada) ──publicar──► Publicada
                ▲                                    │
                │                              despublicar (admin)
                └──────── Não publicada ◄────────────┘
qualquer estado ──arquivar──► Arquivada ──reativar──► Não publicada
```

- **Criar** grava a página como *Não publicada* e cria o rascunho (revisão 1,
  “Página criada”). Nada aparece no site.
- **Publicar** aplica título, introdução, SEO e blocos e marca a página como
  publicada, numa única transação.
- **Despublicar** (só administradores) tira a página do site; o endereço passa
  a responder “página não encontrada”. Conteúdo e histórico ficam.
- **Arquivar** tira a página do site e da edição. Nada é excluído: título,
  blocos e histórico continuam guardados. Páginas já publicadas só podem ser
  arquivadas/reativadas por administradores.
- **Reativar** devolve a página arquivada para *Não publicada*.
- **Voltar a publicar** depois de despublicar: se houver rascunho, basta
  **Publicar alterações**. Sem rascunho, use **Preparar para publicar de
  novo**, que cria um rascunho a partir da última versão publicada para
  revisão, e então publique.
- Não existe exclusão física de páginas.

## Endereço (slug)

- Letras minúsculas sem acento, números e hífens; 3 a 100 caracteres
  (`^[a-z0-9]+(-[a-z0-9]+)*$`). Único entre todas as páginas.
- “Gerar do título” sugere o endereço a partir do título.
- **Pode ser alterado enquanto a página nunca tiver sido publicada.** Depois
  da primeira publicação (`first_published_at`) fica fixo, para não quebrar
  links já divulgados. A regra é aplicada no banco (`GL423`) e na tela.

## Conteúdo

- Cabeçalho: rótulo opcional, título (obrigatório), introdução.
- Buscadores e compartilhamento: título (o site acrescenta “| GeoLogar”),
  descrição e imagem de compartilhamento da biblioteca. Vazios usam o título e
  a introdução.
- Blocos: Texto, Imagem + texto, Chamada, Galeria e Logotipos — os mesmos da
  página inicial. Seções fixas do site (Hero, Pesquisa, Projetos…) não podem
  ser usadas em páginas personalizadas (restrição no banco e na validação).

## Site público

- A rota `src/app/(public)/paginas/[slug]/page.tsx` valida o endereço e lê com
  o cliente anônimo apenas páginas com `status = 'published'`. Rascunhos,
  páginas arquivadas e endereços desconhecidos respondem 404 e não são
  indexados.
- Os blocos de páginas personalizadas só são públicos quando a página está
  publicada (policy de `page_sections`).
- Metadados: título/descrição de SEO, URL canônica e imagem de
  compartilhamento.

## Menu

A página não entra no menu sozinha. Em *Site → Navegação* (administradores),
a lista **Páginas personalizadas** mostra título, endereço e situação de cada
página; para incluí-la, adicione um link com o endereço indicado e publique a
navegação. Páginas não publicadas aparecem com o aviso de que o link levaria
a “página não encontrada”.

Desde a Etapa 10, se algum link **visível** do menu (rascunho atual ou versão
publicada, cabeçalho ou rodapé) apontar para `/paginas/<endereço>` de uma
página em rascunho, arquivada ou inexistente, a tela *Navegação* mostra um
aviso no topo listando cada link e o motivo. O link **não** é removido
automaticamente: publique a página ou retire o link.

O endereço segue o formato `^[a-z0-9]+(-[a-z0-9]+)*$` (3 a 100 caracteres) e
fica sempre sob `/paginas/`, então não há colisão com rotas do sistema
(`/admin`, `/api`…) e nenhum endereço precisa ser reservado; endereços com
`/`, `..` ou maiúsculas são recusados no formulário e no banco.

## Permissões

| | Admin | Editor |
| --- | --- | --- |
| Criar página, editar rascunho, publicar, restaurar | ✔ | ✔ |
| Alterar endereço antes da 1ª publicação | ✔ | ✔ |
| Despublicar | ✔ | — |
| Arquivar/reativar página já publicada | ✔ | — |
| Arquivar/reativar página nunca publicada | ✔ | ✔ |
| Incluir a página no menu | ✔ | — |

## Implementação

- Banco: tabela `custom_pages`; coluna `page_sections.custom_page_id`;
  documento editorial `custom` por página; RPCs `create_custom_page`,
  `update_custom_page_slug`, `set_custom_page_status` (todas `SECURITY
  INVOKER`).
- Servidor: `src/lib/admin/editorial-actions.ts` (`createCustomPage`,
  `updateCustomPageSlug`, `setCustomPageStatus`),
  `src/lib/queries/editorial.ts` (`getCustomPagesForAdmin`,
  `getCustomPageForAdmin`, `getPublishedCustomPage`).
- Telas: `src/app/admin/(protected)/paginas/`,
  `src/components/admin/editorial/` (formulário, painéis de endereço e
  situação).
- Editor visual: `resolveEditorPage` aceita `/paginas/<endereço>`
  (`src/lib/site/editor-pages.ts`).
