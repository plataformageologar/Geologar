# Páginas públicas — GeoLogar

Páginas institucionais do portal (Etapa 5). Todas são Server Components
renderizados sob demanda (`dynamic = "force-dynamic"`), leem o Supabase com a
chave publishable (RLS: apenas conteúdo publicado) e compartilham o layout
raiz (cabeçalho, rodapé e link "Pular para o conteúdo").

## Rotas

| Rota                | Arquivo                               | Conteúdo                                                           |
| ------------------- | ------------------------------------- | ------------------------------------------------------------------ |
| `/`                 | `src/app/page.tsx`                    | Homepage (seções com links para as páginas internas)               |
| `/rede`             | `src/app/rede/page.tsx`               | Apresentação (`homepage_content`), pilares, linhas e CTA de contato |
| `/pesquisa`         | `src/app/pesquisa/page.tsx`           | Todas as linhas publicadas (`sort_order`, título)                  |
| `/pesquisa/[slug]`  | `src/app/pesquisa/[slug]/page.tsx`    | Linha, projetos, publicações (diretas + dos projetos) e outras linhas |
| `/projetos`         | `src/app/projetos/page.tsx`           | Projetos publicados, filtro por situação e paginação (12/página)   |
| `/projetos/[slug]`  | `src/app/projetos/[slug]/page.tsx`    | Projeto, ficha técnica, linhas, publicações e projetos relacionados |
| `/publicacoes`      | `src/app/publicacoes/page.tsx`        | Publicações por ano, busca, filtros por ano e linha (20/página)    |
| `/instituicoes`     | `src/app/instituicoes/page.tsx`       | Instituições agrupadas pelas categorias cadastradas                |
| `/contato`          | `src/app/contato/page.tsx`            | Canais reais de `site_settings` e `social_links` (sem formulário)  |
| 404                 | `src/app/not-found.tsx`               | Página não encontrada, com links de retorno                        |
| erro                | `src/app/error.tsx`                   | Falha temporária de carregamento, com "Tentar novamente"           |

Títulos seguem o modelo `Página | GeoLogar` (template em `src/app/layout.tsx`).
As rotas dinâmicas geram título e descrição a partir do registro
(`generateMetadata`), reaproveitando a mesma leitura da página (`cache` do React).

## Parâmetros de URL

Os filtros usam links e formulários `GET`, portanto funcionam sem JavaScript.

| Rota           | Parâmetro  | Valores                                    | Inválido           |
| -------------- | ---------- | ------------------------------------------ | ------------------ |
| `/projetos`    | `situacao` | `em-andamento`, `concluidos`               | ignorado (todos)   |
| `/projetos`    | `pagina`   | inteiro ≥ 1                                | 404                |
| `/publicacoes` | `ano`      | ano com 4 dígitos (1800–2100)              | ignorado           |
| `/publicacoes` | `linha`    | slug de uma linha publicada                | ignorado / sem resultados |
| `/publicacoes` | `busca`    | texto (até 80 caracteres) em título ou autoria | caracteres especiais removidos |
| `/publicacoes` | `pagina`   | inteiro ≥ 1                                | 404                |

Uma página além da última responde 404. O filtro de situação só aparece
quando há projetos publicados nas duas situações; o formulário de
publicações, só quando há publicações (ou filtros ativos).

## Camada de consultas (`src/lib/queries/`)

| Função                            | Uso                                                           |
| --------------------------------- | ------------------------------------------------------------- |
| `getPublishedResearchLines()`     | `/pesquisa` e "Outras linhas"                                 |
| `getResearchLineBySlug(slug)`     | `/pesquisa/[slug]` (uma consulta com embeds)                  |
| `getPublishedProjects({status, page})` | `/projetos` (com `count: "exact"`)                       |
| `getProjectStatusCounts()`        | Decide se o filtro de situação aparece                        |
| `getProjectBySlug(slug)`          | `/projetos/[slug]` (uma consulta com embeds)                  |
| `getPublishedPublications(filters)` | `/publicacoes`                                              |
| `getPublicationFilterOptions()`   | Anos e linhas que têm publicações                             |
| `getPublishedInstitutionGroups()` | `/instituicoes`                                               |
| `getContactChannels()`            | `/contato`                                                    |

Regras:

- **Sem N+1**: relacionamentos N:N (`project_research_lines`,
  `publication_projects`, `publication_research_lines`) são lidos com embeds
  do PostgREST na mesma consulta.
- **Só conteúdo publicado**: o RLS já oculta registros não publicados (as
  tabelas de relacionamento exigem os dois lados publicados); as consultas
  filtram `is_published` e os relacionados passam por `onlyPublished()`.
- **Sem duplicidade**: publicações ligadas à linha e também a um projeto da
  linha aparecem uma vez (`uniqueBySlug()`).
- **Slugs inválidos** (fora do formato do banco) respondem 404 sem consultar
  o banco.
- **Falhas de infraestrutura** nas páginas internas são registradas no log do
  servidor (`[supabase] Falha ao carregar ...`) e propagadas até `error.tsx` —
  nunca exibidas como "nenhum registro". Na homepage, no rodapé e em `/rede`
  (conteúdo complementar), as funções mantêm fallback ou lista vazia.

## Apresentação

- **Datas** (`formatPeriod` em `src/lib/utils/format.ts`): por extenso em
  pt-BR, no fuso UTC (datas `date` do Postgres). Só a data de início →
  "Início em …"; só a de término → "Término em …"; nenhuma → campo omitido.
- **DOI** (`normalizeDoi`): aceita `10.xxxx/...`, `doi:` ou URL do doi.org e
  gera sempre `https://doi.org/<doi>`, sem duplicar o prefixo.
- **Links externos** (`safeExternalUrl`): apenas `http(s)` absolutos.
- **Logotipos**: área padronizada com `object-contain`, sem recolorir; sem
  logotipo, o card mostra só o texto.
- **Estados vazios** (`EmptyState`): aviso discreto com links para continuar
  a navegação. Não há conteúdo fictício.
- **Navegação**: o item ativo usa `aria-current` (`page` na própria rota,
  `true` nas páginas internas da seção); trilha de navegação (`Breadcrumb`) em
  todas as páginas internas.

## Ordenação

| Lista                  | Ordem                                                         |
| ---------------------- | ------------------------------------------------------------- |
| Linhas de pesquisa     | `sort_order`, título                                          |
| Projetos               | `sort_order`, em andamento antes de concluídos, título        |
| Publicações            | ano (mais recente primeiro, sem ano ao final), `sort_order`, título |
| Instituições           | categoria (`sort_order`, nome); destaque, `sort_order`, nome  |
| Projetos relacionados  | até 3 que compartilham linha de pesquisa, por `sort_order`    |

## Links da homepage

A migration `20261103183909_homepage_links_to_internal_pages.sql` troca os
CTAs que ainda apontavam para âncoras (`/#pesquisa`, `/#a-rede`) pelas rotas
`/pesquisa` e `/rede`, e define `/contato` para "Fale com a GeoLogar". Cada
campo só é alterado se ainda tiver o valor original: links personalizados ou
externos são preservados. Os fallbacks em `src/data/site.ts` usam os mesmos
destinos.
