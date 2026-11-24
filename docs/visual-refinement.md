# Etapa 10.7 — Refinamento visual e conteúdo institucional

Aproxima o site público da referência visual do cliente (mockup e pacote
`GeoLogar_Imagens_e_Logos_PNG`) **sem reconstruir o CMS**: tudo o que mudou é
configurável pelo painel e passa por rascunho, publicação e histórico.

Situação em **24/11/2026**:

| Item | Situação |
|---|---|
| Código (cabeçalho, busca, layouts, preset, opções de seção) | Em produção (commits `1fce9ca` e `6728be6`) |
| Aparência “Referência GeoLogar” | **Publicada** pela interface em 24/11/2026, 12:02 (revisão 3 da aparência), com autorização da GeoLogar |
| Homepage (textos do banner, ordem e opções das seções) | **Publicada** pela interface em 24/11/2026, 12:02 (revisão 8 da página inicial), com autorização da GeoLogar |
| Títulos das seções como no conceito (“O GeoLogar”, “Linhas de pesquisa”, “Projetos em destaque”, “Publicações recentes”, “Instituições”) | **Publicados** em 24/11/2026, 12:12 (revisão 11 da página inicial) |
| 5 categorias e 22 instituições da referência | **Publicadas** em 24/11/2026 (12 com logotipo provisório, 10 só com o nome) |
| 3 projetos da referência | **Publicados e em destaque** em 24/11/2026; situação “Em andamento” provisória |
| 3 publicações do conceito | **Publicadas como referências provisórias** (ver abaixo) |

Aparência e homepage foram salvas como rascunho, revisadas no editor visual
e publicadas depois da autorização. Em seguida a GeoLogar autorizou publicar
todo o conteúdo da referência para aproximar o site do conceito, com
alterações posteriores pelo CMS, e pediu marcadores provisórios onde faltam
artigos. As versões anteriores da aparência e da homepage ficam no histórico.

## Antes e depois

| | 390 px | 1024 px | 1440 px | 1920 px |
|---|---|---|---|---|
| Antes (produção, antes da etapa) | [antes-390](visual-refinement/antes-390.jpg) | [antes-1024](visual-refinement/antes-1024.jpg) | [antes-1440](visual-refinement/antes-1440.jpg) | [antes-1920](visual-refinement/antes-1920.jpg) |
| Depois (produção, após a publicação) | [depois-390](visual-refinement/depois-390.jpg) | [depois-1024](visual-refinement/depois-1024.jpg) | [depois-1440](visual-refinement/depois-1440.jpg) | [depois-1920](visual-refinement/depois-1920.jpg) |
| Intermediário — preset sobre a homepage anterior (preview local) | [depois-preset-390](visual-refinement/depois-preset-390.jpg) | [depois-preset-1024](visual-refinement/depois-preset-1024.jpg) | [depois-preset-1440](visual-refinement/depois-preset-1440.jpg) | [depois-preset-1920](visual-refinement/depois-preset-1920.jpg) |

As capturas “depois” são do site em produção depois da publicação de todo
o conteúdo (aparência, homepage, projetos, publicações provisórias e
instituições). As capturas “depois-preset” foram feitas antes da
publicação, no preview local com o CSS do preset injetado.

## Identidade visual

Preset **“Referência GeoLogar”** (`REFERENCE_PRESET` em
[`src/lib/site/appearance.ts`](../src/lib/site/appearance.ts)), aplicado pelo
botão em `/admin/aparencia`. O botão só preenche o formulário; cada cor e
opção continua editável e nada muda no site antes de salvar e publicar.

| Papel | Cor | Contraste |
|---|---|---|
| Principal (ações, marcadores, item ativo do menu) | `#805022` marrom | 6,14:1 sobre creme; 6,80:1 sobre branco |
| Secundária (Login / Área restrita, selos) | `#244C3E` verde | ≥ 4,5:1 sobre creme e branco |
| Tom escuro (rodapé, faixa de cooperação, banner sem foto) | `#443020` marrom escuro | texto claro 10,82:1; texto secundário 7,27:1 |
| Marca (nome “Geo” no cabeçalho) | `#0B3550` azul | fixo, não configurável |
| Fundo | Creme: página `#F7F3EA`, cards `#FFFCF6`, seções alternadas `#ECE3D2` | — |

Demais opções do preset: títulos em **Source Sans**, botões com cantos
suaves (6 px), cantos de cards discretos, cards com borda e seções
**compactas com títulos institucionais** (caixa alta, marcador marrom à
esquerda, menos espaço vertical). A validação recusa tom escuro com
contraste insuficiente (mínimo 7:1 para o texto claro).

A paleta sugerida no briefing foi seguida com dois ajustes de
acessibilidade: o azul de marca `#092F42` virou `#0B3550` (mesmo tom, usado
só no nome) e o texto `#24211D` segue o token `foreground` existente.

## Layout

| Área | O que mudou | Onde configurar |
|---|---|---|
| Cabeçalho | Duas faixas: marca + busca + “Login / Área restrita” (verde) em cima; menu na faixa de baixo, com o item ativo sublinhado. No celular, busca e acesso ficam no menu. Fica fixo ao rolar (só a faixa do menu em telas largas). | Menu: *Páginas e menu*; logotipo: *Configurações* |
| Logotipo | Símbolo oficial (`src/assets/brand/geologar-symbol.png`, recorte do arquivo oficial, sem redesenho) + nome “GeoLogar” em texto real, sem duplicar o texto do logotipo. Um logotipo enviado pelo CMS substitui o conjunto. | *Configurações* |
| Busca | `/busca?q=` procura em linhas de pesquisa, projetos, publicações, páginas e instituições **publicadas** (2 a 80 caracteres, até 8 por grupo). Sem busca externa nem IA; página `noindex`. | — |
| Banner | Layout “Nome da GeoLogar em destaque”: sobretítulo grande (“GeoLogar”), título, linha de pilares e dois botões. Sem imagem com texto gravado. | *Seções e blocos* › Banner |
| Apresentação | Texto e pilares lado a lado em linha, com ícones terrosos e separadores. | *Homepage*, *Pilares* |
| Linhas de pesquisa | Opção “Apresentação: fotos” (cards com fotografia). Os 6 registros e slugs foram mantidos. | *Seções e blocos* › Linhas |
| Projetos + publicações | Opção “Exibir ao lado das publicações recentes” (≈ 55/45 em telas largas). Cards de projeto compactos com “Saiba mais”; publicações em lista compacta, com botão DOI só quando o DOI é válido. | *Seções e blocos* › Projetos |
| Instituições | Primeira categoria em fileira larga; demais lado a lado, com largura proporcional e separadores. Áreas de logotipo 4:3 com pouco respiro. | *Instituições* |
| Rodapé | Fundo no tom escuro com textura de curvas de nível discreta. Sem a imagem `Rodape_paisagem.png` (tem contatos fictícios gravados). | *Configurações*, *Redes sociais* |

Ordem publicada da homepage: Banner, Apresentação da rede,
Experiências digitais, Linhas de pesquisa, Projetos + Publicações,
Instituições, Chamada para cooperação, Rodapé.

## Conteúdo

### Banner

| Campo | Valor |
|---|---|
| Sobretítulo (layout “brand”) | GeoLogar |
| Título | Geociências conectando território, ciência e sociedade |
| Descrição | Pesquisa \| Ensino \| Inovação \| Sustentabilidade |
| Botão principal | “Conheça o GeoLogar” → `/rede` |
| Botão secundário | “Nossas pesquisas” → `/pesquisa` |
| Imagem de fundo | Nenhuma: fundo padrão com curvas de nível. Fotografias do Bege Bahia só com autorização de uso. |

### Instituições cadastradas

Migration [`20261124160000_institutions_reference_drafts.sql`](../supabase/migrations/20261124160000_institutions_reference_drafts.sql)
(idempotente: não duplica nem altera registros existentes; testada em
[`institutions_reference_drafts.test.sql`](../supabase/tests/database/institutions_reference_drafts.test.sql)).
Somente nome e, quando o nome da referência trazia, a sigla. **Nenhum site,
descrição ou cidade foi preenchido** — nada foi inventado. Todas com
`is_published = false`.

| Categoria (ordem) | Instituições |
|---|---|
| Parceiras (Universidades) — 10 | UFBA, CIENAM UFBA, UFRB, UESC, UFRJ, UNEB, UEFS, IFBA, UFS, UFC |
| Colaboradoras (Pesquisa) — 20 | CBPM, CETEM |
| Apoio institucional — 30 | SDE Bahia, Museu Geológico da Bahia, Associação dos Astrônomos da Bahia, CAPES, CNPq, FAPESB |
| Empresarial — 40 | ASSOBEGE |
| Internacionais — 50 | University of Toronto, Western University, Brock University |

Instituições publicadas: **22** (autorização da GeoLogar em 24/11/2026). Em
rascunho: **0**. As 10 sem logotipo aparecem com o nome até receberem o
arquivo oficial.

### Projetos

DETEC BEGE – FASE II, ACV e Fluxo de Massas e EXPOGEO Virtual foram
publicados e destacados na homepage, com a descrição curta e a imagem da
referência. A situação “Em andamento” foi escolhida só porque a publicação
exige uma situação; coordenação, período, financiamento, resultados e linhas
de pesquisa continuam vazios e precisam ser confirmados.

### Publicações provisórias

As três referências do conceito foram procuradas em 24/11/2026 e **não
foram encontradas** com esses títulos (há apenas estudos próximos sobre
rochas ornamentais e resíduos do mármore Bege Bahia). A pedido da GeoLogar,
entraram como **marcadores provisórios**, a substituir pelas referências
oficiais:

| Título (do conceito) | Ano | Periódico | Slug |
|---|---|---|---|
| Integrated Material Flow Analysis and Life Cycle Evaluation in the Ornamental Stone Industry: A Multiscale Assessment from Global Trends to Bahia (Brazil) | 2026 | Circular Economy and Sustainability (a confirmar) | `referencia-provisoria-material-flow-ornamental-stone` |
| Characterization and Reuse Potential of Bege Bahia Marble Waste: A Chemical and Technological Approach | 2026 | Journal of Cleaner Production (a confirmar) | `referencia-provisoria-bege-bahia-marble-waste` |
| Life Cycle Assessment of Dimension Stone Processing: Environmental Hotspots and Circular Economy Opportunities | 2025 | Resources, Conservation & Recycling (a confirmar) | `referencia-provisoria-lca-dimension-stone` |

Autores: “Autores a confirmar”. **Sem DOI e sem link** (o botão DOI só
aparece com um DOI válido). O resumo informa que é uma referência
provisória. Para substituir: *Publicações* › editar › preencher os dados
oficiais (ou despublicar/excluir o marcador).

### Inventário e classificação dos logotipos

Origem: pasta `Logos/` do pacote recebido (recortes do mockup, 300–530 px,
fundo creme da captura). Nenhum logotipo foi redesenhado, ampliado,
recolorido ou gerado por IA. Os aproveitáveis só tiveram a legenda cortada
removida e as margens aparadas.

Classificação:

- **Oficial confirmado:** nenhum (a referência não confirma origem nem
  autorização de uso das marcas).
- **Aproveitável provisoriamente (12):** símbolo íntegro depois de remover a
  legenda cortada; resolução baixa (115–335 px). Importados como
  `Logo_<SIGLA>_provisorio.png` e associados aos rascunhos, com texto
  alternativo.
- **Necessita substituição (10):** não importados; a instituição aparece
  só com o nome até receber o arquivo oficial.

| Instituição | Classificação | Tamanho final | Observação |
|---|---|---|---|
| UFBA | Provisório | 248 × 312 | Brasão; legenda cortada removida |
| UFRB | Provisório | 335 × 164 | Marca nominal; legenda removida |
| UESC | Provisório | 227 × 329 | Brasão |
| UFRJ | Provisório | 248 × 308 | Brasão |
| UNEB | Provisório | 250 × 295 | Brasão |
| UEFS | Provisório | 195 × 295 | Brasão |
| IFBA | Provisório | 196 × 267 | Símbolo; sigla cortada removida |
| UFS | Provisório | 193 × 307 | Brasão |
| UFC | Provisório | 242 × 297 | Brasão |
| University of Toronto | Provisório | 115 × 243 | Só o brasão (sem o nome) |
| Western University | Provisório | 209 × 222 | Só o escudo (sem o nome) |
| Brock University | Provisório | 328 × 204 | Marca nominal |
| CIENAM UFBA | Substituir | — | Texto pequeno ilegível/deformado |
| CBPM | Substituir | — | Cortado à direita; subtítulo cortado |
| CETEM | Substituir | — | Cortado à direita; subtítulo ilegível |
| SDE Bahia | Substituir | — | Letras deformadas e cortadas |
| Museu Geológico da Bahia | Substituir | — | Subtítulo ilegível |
| Associação dos Astrônomos da Bahia | Substituir | — | Símbolo cortado; legenda ilegível |
| CAPES | Substituir | — | Só o símbolo, sem a marca nominal |
| CNPq | Substituir | — | Letra final cortada |
| FAPESB | Substituir | — | Só o símbolo, sem a marca nominal |
| ASSOBEGE | Substituir | — | Nome cortado na parte de baixo |

Os outros arquivos do pacote seguem a decisão registrada no
[manifesto inicial](initial-content-manifest.md#não-importados-32)
(banners com texto gravado, colagem diagonal, rodapé com contatos fictícios,
versões redesenhadas do logotipo GeoLogar). O ZIP não foi adicionado ao
repositório.

## Personalização

Tudo o que a etapa introduziu é editável pelo painel, com rascunho,
publicação, histórico e restauração:

- **Aparência:** campo novo *Tom escuro* e *Seções das páginas públicas*
  (espaçosas ou compactas); fundo *Creme*; botão do preset.
- **Seções:** layout de banner “brand”; linhas de pesquisa em cards ou
  fotos; projetos ao lado das publicações.
- **Prévia de demonstração** (`/admin/demonstracao`): mostra também as
  instituições em rascunho, com seus logotipos, sinalizadas como “Rascunho
  (não público)”.

Banco: migration `20261124150000_visual_refinement.sql` (colunas
`dark_color` e `section_style` e validação das opções novas nas funções do
fluxo editorial, sem desativar o `editorial_guard`) e suíte pgTAP
`visual_refinement.test.sql`.

## Decisões

- Nada publicado sem autorização: aparência, homepage, instituições,
  projetos e publicações provisórias foram publicados depois da
  autorização expressa da GeoLogar (24/11/2026).
- Publicações não verificadas entram como marcadores explícitos (“a
  confirmar”), sem DOI, sem link e sem autores inventados.
- Instituições sem logotipo aceitável aparecem pelo nome, em vez de usar um
  recorte deformado.
- Sem telefone com “XXXX”, e-mail ilustrativo, links sem destino ou textos
  jurídicos inventados. A coluna “Links úteis” do mockup não foi criada (não
  há destino definido); os links jurídicos dependem de textos do cliente.
- Sem fotografias científicas geradas; o banner usa o fundo padrão até haver
  fotografia autorizada.

## Testes

| Verificação | Resultado |
|---|---|
| Lint e TypeScript | Sem erros |
| Testes unitários | 152/152 |
| pgTAP (12 suítes, banco remoto, transação desfeita) | 465/465 |
| Playwright (preview local) | 40 aprovados, 6 ignorados de propósito |
| Build OpenNext | OK |
| `npm audit --omit=dev` | 0 vulnerabilidades |
| Rolagem horizontal (8 páginas × 375, 390, 768, 1024, 1280, 1440, 1920 px, com o preset) | Nenhuma |
| Produção após a publicação | Paleta, banner e ordem das seções conferidos; projetos, publicações e instituições na homepage; Playwright contra produção: 40 aprovados, 6 ignorados de propósito |

## Pendências

| Tipo | Pendência |
|---|---|
| Conteúdo | Confirmar vínculos, nomes, sites e categorias das 22 instituições publicadas. |
| Marca | Logotipos oficiais (de preferência vetoriais) e autorização de uso das 22 marcas; substituir os 12 provisórios e enviar os 10 ausentes. |
| Imagem | Fotografia autorizada para o banner (Bege Bahia ou outra) e fotos das linhas em resolução maior. |
| Conteúdo | Substituir as 3 publicações provisórias pelas referências oficiais (autores, periódico, ano, DOI). |
| Conteúdo | Confirmar situação, coordenação, período, financiamento e linhas dos 3 projetos. |
| Rodapé | Contatos oficiais, redes sociais e textos jurídicos. |
