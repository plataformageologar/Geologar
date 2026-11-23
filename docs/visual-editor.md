# Editor visual — GeoLogar (Etapas 9.5 e 9.6)

O portal tem dois modos de edição sobre **a mesma fonte de verdade** (tabelas
do Supabase):

| Modo | Endereço | Para quê |
| --- | --- | --- |
| CMS tradicional | `/admin/...` | Formulários completos, listas, filtros, registros (projetos, publicações etc.) |
| Editor visual | `/admin/editor?pagina=/` | Clicar no elemento da página e editar com prévia ao vivo |

Os dois gravam **rascunhos** pelo mesmo fluxo editorial e com as mesmas
validações; o site público só muda ao publicar (Etapa 9.6, ver
[`editorial-workflow.md`](editorial-workflow.md)). Guia para a equipe
editorial: [`guia-edicao-geologar.md`](guia-edicao-geologar.md).

## Arquitetura

```
/admin/editor?pagina=/              Server Component (requireAdminAccess)
 └─ getEditorDocument(page, role)   unidades editoriais da página (rascunho + publicado)
                                    e dados de prévia (src/lib/queries/editor.ts)
 └─ <VisualEditor doc>              Client Component: barra, painel, histórico, salvar
     └─ <iframe src="/admin/editor/canvas">
          <EditorCanvas>            renderiza os COMPONENTES PÚBLICOS reais com o rascunho
```

- **Tela (canvas)**: iframe da mesma origem em `/admin/editor/canvas`. Recebe o
  rascunho por `postMessage` e renderiza `Header`, `PageHeader`, as seções
  (`renderSection`) e `Footer` — os mesmos componentes do site público. Assim a
  largura do dispositivo (375 / 768 / 1024 / 1280 px) aciona os breakpoints
  reais do Tailwind.
- **Protocolo** (`src/lib/site/editor-document.ts`): mensagens com
  `source: "geologar-editor"`; os dois lados conferem `event.origin` e
  `event.source`, e `parseCanvasMessage` valida cada campo (alvo, slug do
  registro, tecla). Tipos:
  - tela → editor: `ready` (repetido a cada 400 ms até chegar o estado),
    `select` (alvo clicado), `key` (atalho pressionado dentro da tela);
  - editor → tela: `state` (rascunho, seleção, aparência).
- **Cliques na tela** são capturados no documento (fase de captura) com
  `preventDefault` + `stopPropagation`: links, botões e formulários da prévia
  não navegam nem enviam nada.
- **Alvos selecionáveis**: `header`, `footer`, `page-header`, `appearance`,
  `section:<id>`. Cada um é um `Target` com contorno ao passar o mouse, rótulo
  e selo “Oculta no site”.
- **Painel de propriedades** (`properties-panel.tsx`): estrutura da página
  (lista de elementos, adicionar bloco, aparência) e campos por tipo de
  elemento. Não há campo de HTML livre: só textos, links validados, imagens da
  biblioteca e opções fechadas.
- **Histórico** (`editor-history.ts`): desfazer/refazer com até 100 passos;
  digitação contínua no mesmo grupo de campos em menos de 1 s vira um passo só.
  O histórico recomeça depois de salvar.
- **Unidades** (`doc.units`): a página reúne as unidades editoriais que usa
  (a da própria página primeiro, depois `home`, `pillars` e, para
  administradores, `settings`, `navigation`, `appearance`). Cada fatia do
  rascunho (`homepage`, `settings`, `pillars`, `sections`, `pageContent`,
  `navHeader`, `navFooter`, `appearance`) pertence a uma unidade
  (`SLICE_PARTS`). Editores veem menus, aparência e informações
  institucionais na versão publicada, somente leitura.
- **Salvar rascunho**: as fatias alteradas são agrupadas por unidade e
  enviadas numa **única** chamada `saveEditorialDrafts` (uma transação no
  banco). Se uma unidade falhar, nada é gravado; os erros voltam por parte e
  o primeiro elemento com erro é selecionado.
- **Publicar**: diálogo com as unidades que têm rascunho diferente do
  publicado (rascunho igual não entra; páginas personalizadas são exceção), aviso para as
  globais (menus, aparência, informações institucionais) e observação
  opcional; `publishEditorialDocuments` publica as marcadas numa única
  transação. Só é possível com tudo salvo.
- **Histórico de versões**: escolhe a unidade, lista as revisões (25 por vez,
  “Carregar versões mais antigas”), **Ver na tela** mostra a revisão na tela
  em modo somente leitura e **Restaurar como rascunho** cria um novo
  rascunho. **Ver versão publicada** mostra o que está no site.
- **Descartar rascunho salvo**: por unidade, com confirmação.
- **Conflito**: cada unidade leva a sua `version`. Se outra pessoa salvou ou
  publicou antes, a gravação é recusada (`GL409`) e o editor mantém o que foi
  digitado.

### Páginas editáveis

`resolveEditorPage` (`src/lib/site/editor-pages.ts`) aceita apenas:
`/`, `/rede`, `/pesquisa`, `/projetos`, `/publicacoes`, `/instituicoes`,
`/contato`, detalhes `/projetos/<slug>` e `/pesquisa/<slug>` e páginas
personalizadas `/paginas/<endereço>` (Etapa 9.6), com slug no formato
válido. Páginas personalizadas arquivadas ou inexistentes mostram um aviso
em vez do editor. Qualquer outro valor (URL externa, `//`, `/admin`, `..`,
query string) mostra a lista de páginas sem abrir o endereço.

Nas páginas de **detalhe** a tela mostra a página pública real e o painel
leva ao formulário do registro no CMS (o conteúdo de projetos e linhas é
editado lá, com todos os campos e relacionamentos).

Nas listagens (`/pesquisa`, `/projetos`, `/publicacoes`, `/instituicoes`) a
tela mostra o cabeçalho editável e uma prévia simplificada da lista com os
cards reais; filtros e paginação não são interativos na prévia.

## Botão “Editar esta página” (site público)

- `src/components/layout/edit-page-button.tsx`: componente cliente leve
  (~4 KB). Só faz algo quando existe o cookie não sensível
  `geologar-editor-hint` (gravado pelo proxy para quem tem sessão).
- Com o cookie, consulta `GET /api/editor-access?pagina=<caminho>`
  (`Cache-Control: private, no-store`), que verifica **no servidor** a sessão
  e o vínculo ativo admin/editor e valida a página. Resposta:
  `{ canEdit, href }`. Visitantes recebem sempre `{"canEdit":false}`.
- O botão não aparece dentro do iframe do editor.
- Sem sessão, o link leva ao login com `next=/admin/editor?pagina=...`, e
  `safeAdminPath` só aceita voltar para páginas permitidas.
- Nenhum código do editor entra no bundle público (verificado no build: o
  único texto relacionado é o nome do cookie no chunk do botão).

## Permissões

| Recurso | admin | editor |
| --- | --- | --- |
| Homepage (hero, apresentação, cooperação) | ✔ | ✔ |
| Pilares, seções e blocos, textos das páginas | ✔ | ✔ |
| Projetos, linhas, publicações, instituições | ✔ | ✔ (já existente) |
| Cabeçalho, rodapé, contatos, redes sociais (`site_settings`) | ✔ | — |
| Navegação (menus) | ✔ | somente leitura |
| Aparência | ✔ | — |
| Páginas personalizadas (blocos e cabeçalho) | ✔ | ✔ |
| Publicar unidades globais (menus, aparência, informações) | ✔ | — |

As regras valem em três camadas: o painel esconde o que o papel não pode
editar (`doc.editable`), cada Server Action verifica o papel com
`requireAdminAccess` (e exige `admin` onde necessário), e as políticas RLS + `GRANT` por
coluna recusam a gravação no banco (`has_cms_role`). Ver
[`database-schema.md`](database-schema.md#etapa-95--personalização-do-site).

## Segurança

- `/admin/*` responde com `Cache-Control: private, no-store`,
  `Content-Security-Policy: frame-ancestors 'self'` e
  `X-Frame-Options: SAMEORIGIN` (o canvas só pode ser exibido pelo portal).
- O editor nunca envia nomes de tabela, coluna ou SQL: cada action recebe um
  objeto com campos conhecidos, validado no servidor e de novo no banco
  (`CHECK` + `is_valid_section_settings`).
- Links aceitam caminhos internos e URLs http(s); `javascript:`, `data:` e
  `//host` são recusados. Nos menus, `/admin`, `/api` e `/auth` também.
- Imagens só da biblioteca de mídia (`uploads/<uuid>.<ext>`); referências
  novas precisam existir (`GL422`) e entram em `media_usage`.
- Aparência: cores `#rrggbb` com contraste mínimo verificado (AA) e opções
  fechadas, aplicadas apenas como variáveis CSS conhecidas.
- Nenhuma operação editorial usa `service_role`.

## Interface

- **Desktop (≥ 1280 px)**: barra superior, tela ao centro, painel fixo à
  direita.
- **Tablet (768–1279 px)**: painel sobreposto, recolhível pelo botão
  “Painel”.
- **Celular (< 768 px)**: painel como gaveta inferior; seletor de dispositivo
  oculto (a tela já ocupa a largura disponível).
- **Atalhos**: `Ctrl+Z` desfazer, `Ctrl+Shift+Z`/`Ctrl+Y` refazer, `Ctrl+S`
  salvar rascunho, `Esc` fecha o painel/gaveta ou volta à estrutura (funcionam também
  com o foco dentro da tela).
- Foco volta ao botão do painel ao fechar a gaveta; status em
  `role="status"` (“Publicado, sem alterações”, “Alterações não salvas”,
  “Salvando…”, “Rascunho salvo — não publicado”).
- Celular: “Salvar” e “Publicar” ficam na primeira linha da barra, ao lado
  do seletor de página; histórico, versão publicada e descarte na segunda.
- Aviso ao sair (fechar aba, trocar de página no seletor) com alterações não
  salvas; “Descartar” pede confirmação.
- Avisos ao trocar o logotipo e ao escolher cores com contraste baixo.

## Arquivos

```
src/app/admin/(preview)/editor/page.tsx          Editor (servidor)
src/app/admin/(preview)/editor/canvas/page.tsx   Tela (iframe)
src/app/api/editor-access/route.ts               Verificação do botão público
src/components/admin/editor/                     visual-editor, editor-canvas, properties-panel,
                                                 editor-fields, editor-history, editor-editorial
                                                 (publicar, histórico, descartar rascunho)
src/components/admin/site/                       Campos reutilizados pelo CMS e pelo editor
src/components/site/                             Seções e blocos públicos (page-sections, blocks)
src/lib/site/                                    Validação: sections, navigation, pillars,
                                                 page-content, appearance, editor-pages, anchors,
                                                 editor-document (protocolo e rascunho)
src/lib/queries/editor.ts                        getEditorDocument
src/lib/queries/site-config.ts                   Leituras do CMS e do site público
src/lib/admin/editorial-actions.ts               Server Actions do fluxo editorial (Etapa 9.6)
src/lib/editorial/                               Conteúdo das unidades, comparação, fatias do editor
src/lib/auth/editor-hint.ts                      Cookie do botão “Editar esta página”
supabase/migrations/20261120090000_visual_editor_customization.sql
supabase/tests/database/visual_editor_customization.test.sql
tests/site/                                      Testes unitários (validação, protocolo, histórico)
```

## Testes realizados

- Unitários (`npm test`): validação de aparência, navegação, pilares, seções,
  textos, páginas do editor, `safeAdminPath`, âncoras, protocolo de mensagens,
  atalhos, conversão de rascunho e histórico.
- pgTAP (`visual_editor_customization.test.sql`): RLS por papel, colunas
  permitidas, validação de JSONB, links, imagens e conflito (`GL409`), em
  transação com `rollback`.
- Manuais no navegador com sessão admin: seleção e prévia, desfazer/refazer,
  `Ctrl+S`, adicionar/remover bloco, aparência com descarte, conflito entre CMS
  e editor, gaveta no celular, painel no tablet, e restauração de todos os
  registros de teste.
- Visitante: todas as rotas novas redirecionam ao login (307) e
  `/api/editor-access` responde `{"canEdit":false}`.
- Sem rolagem horizontal em 10 páginas × 6 tamanhos (375×812 a 1440×900).

## Limitações

- O papel **editor** foi validado por pgTAP e pelas verificações no servidor;
  a interface com uma conta editor real não foi testada (não há conta e o
  projeto não cria usuários automaticamente).
- Sem arrastar e soltar: a ordem muda pelos botões subir/descer.
- Listagens aparecem simplificadas na tela do editor.
- Páginas personalizadas são criadas em *Site → Páginas* (o editor visual
  edita páginas já criadas).
