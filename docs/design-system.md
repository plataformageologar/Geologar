# Design System — GeoLogar (v1)

Referência prática para as próximas etapas. Os tokens vivem em
[`src/app/globals.css`](../src/app/globals.css) e os componentes em
[`src/components/ui/`](../src/components/ui/).

## Princípios

- **Sóbrio e legível.** Um elemento de destaque por vez; o conteúdo vem antes
  da decoração.
- **Território como apoio.** Curvas de nível (`topo-pattern`) só em fundos
  amplos e com baixa opacidade — nunca atrás de texto pequeno.
- **Sem cores soltas.** Componentes usam apenas tokens (`bg-primary`,
  `text-muted-foreground`…), nunca hexadecimais.
- **Sem conteúdo inventado.** Seções sem conteúdo publicado não são
  renderizadas; ações sem destino real não são exibidas.
- **Movimento mínimo.** Apenas transições curtas de cor/posição em hover;
  tudo é desativado com `prefers-reduced-motion`.
- **Somente tema claro** nesta versão (`color-scheme: light`).

## Cores

| Token                       | Valor     | Uso                                              |
| --------------------------- | --------- | ------------------------------------------------ |
| `background`                | `#f7f5f0` | Fundo da página (off-white quente)               |
| `foreground`                | `#172533` | Texto principal                                  |
| `surface`                   | `#ffffff` | Cards, header, seção de publicações              |
| `surface-muted`             | `#efebe3` | Seções alternadas (areia), hover neutro          |
| `border`                    | `#dcd5c8` | Bordas e divisores                               |
| `muted-foreground`          | `#4d5965` | Texto secundário                                 |
| `primary` / `-hover`        | `#143b5c` / `#0e2c46` | Azul profundo: marca, ações principais |
| `primary-soft`              | `#e2eaf1` | Fundos suaves, hover de botões secundários       |
| `secondary` / `-hover`      | `#2e6a4e` / `#24563f` | Verde: sustentabilidade, ícones, status |
| `secondary-soft`            | `#e3eee6` | Fundo de ícones e badges verdes                  |
| `earth` / `earth-soft`      | `#8c4f24` / `#f3e7da` | Terroso: eyebrows e acentos              |
| `deep` / `deep-foreground`  | `#0f2537` / `#f2efe8` | Hero sem foto, rodapé                   |
| `deep-muted`                | `#b9c3cc` | Texto secundário sobre `deep`                    |
| `ring` / `ring-on-dark`     | `#1f6fb2` / `#f2c46d` | Anel de foco (claro / escuro)           |
| `danger` / `danger-soft`    | `#a12d22` / `#f9e8e5` | Mensagens de erro em formulários (texto / fundo) |

Contraste (WCAG 2.2): todos os pares de texto usados ficam entre **5,3:1** e
**14,3:1** (AA exige 4,5:1); anéis de foco ficam acima de **4,8:1** (mínimo 3:1).

Sobre fundos escuros, envolva a área com a classe `on-dark` para que o foco
use `ring-on-dark`.

## Tipografia

Duas famílias da mesma superfamília (Source), carregadas via `next/font`:

- **Source Serif 4** (600) — títulos (`h1`–`h3`): tom editorial/científico.
- **Source Sans 3** — texto e interface.

| Classe          | Tamanho                                   | Uso                              |
| --------------- | ----------------------------------------- | -------------------------------- |
| `text-display`  | `clamp(2.25rem → 4rem)`                   | Título do hero (único por página)|
| `text-h1`       | `clamp(2rem → 3rem)`                      | Título de páginas internas       |
| `text-h2`       | `clamp(1.75rem → 2.5rem)`                 | Títulos de seção                 |
| `text-h3`       | `clamp(1.25rem → 1.5rem)`                 | Títulos de cards                 |
| `text-h4`       | `1.125rem`                                | Subtítulos, itens de lista       |
| `text-body-lg`  | `clamp(1.125rem → 1.25rem)`               | Introduções                      |
| `text-body`     | `1.0625rem`                               | Texto corrido (padrão do body)   |
| `text-body-sm`  | `0.9375rem`                               | Descrições em cards              |
| `text-label`    | `0.875rem`, 600                           | Botões, navegação, metadados     |
| `text-caption`  | `0.8125rem`                               | Badges, notas, copyright         |

Cada classe já define altura de linha, peso e espaçamento entre letras.
Os tamanhos de título usam `clamp()` e não exigem breakpoints.

Eyebrow de seção: `text-label uppercase tracking-[0.12em] text-earth` com um
traço à esquerda (já embutido em `SectionHeading`).

## Layout e espaçamento

- **Container** (`<Container>`): largura máxima `80rem` (1280px) e gutters
  `clamp(1rem, 4vw, 2.5rem)`.
- **Seções**: utilitário `section-y` — `clamp(4rem → 7.5rem)` vertical.
- **Grid interno**: espaçamentos `gap-6` entre cards, `mt-12` entre título e
  conteúdo da seção.
- **Header**: altura `--header-height` (4.5rem), fixo no topo.
  `scroll-padding-top` evita que âncoras e elementos em foco fiquem sob ele.

### Breakpoints (padrão Tailwind)

| Prefixo | Largura  | Comportamento principal                              |
| ------- | -------- | ---------------------------------------------------- |
| —       | < 640    | Uma coluna; botões do hero empilhados                |
| `sm`    | ≥ 640    | Cards de linhas em 2 colunas; botões lado a lado     |
| `md`    | ≥ 768    | Cards de projeto horizontais (tablet)                |
| `lg`    | ≥ 1024   | Navegação completa; 3 colunas; pilares em 4 colunas  |
| `xl`    | ≥ 1280   | "A Rede" em duas colunas; nome institucional no header |

Verificado em 375, 390, 768, 1024, 1280 e 1440 px.

## Componentes

### `Button` (`ui/button.tsx`)

- Variantes: `primary`, `secondary` (contorno), `ghost`.
- `surface="dark"` adapta as cores para fundos escuros.
- Tamanhos: `md` (44px de altura mínima) e `lg` (48px).
- Com `href`, renderiza link (`next/link` para rotas internas, `<a>` para
  URLs externas); sem `href`, `<button type="button">`.
- Estados: hover (cor), `focus-visible` (anel de 3px), `disabled`
  (opacidade 50%, sem ponteiro).
- `withArrow` adiciona seta decorativa (oculta para leitores de tela).

### `Badge` (`ui/badge.tsx`)

- Tons: `neutral`, `green`, `blue`, `earth`; `withDot` para estado.
- Status de projeto: **Em andamento** (`green`) e **Concluído** (`blue`).

### `SectionHeading` (`ui/section-heading.tsx`)

Eyebrow + `<h2>` (com `id` para `aria-labelledby`) + descrição opcional +
slot de ação ("Ver todos") alinhado à direita em telas médias.

### `CardMedia` (`ui/card-media.tsx`)

Área de imagem dos cards (`next/image`, `object-cover`). Sem foto, mostra um
fundo suave com curvas de nível e ícone — decorativo (`aria-hidden`).

### Cards

- Raio `rounded-2xl`, borda `border-border`, fundo `surface`, sem sombra em
  repouso. Sombra leve apenas no hover de cards navegáveis.
- Card navegável: o link fica no título e se estende ao card inteiro
  (`after:absolute after:inset-0`) — um único item de foco por card.
- Publicações são **lista textual** (sem card): metadados, título, autores,
  links "Ler publicação" e DOI.
- Logos de parceiros: área `aspect-[3/2]` padronizada, `object-contain`,
  fundo branco — nunca deformar.

### Área administrativa (`components/admin/`)

- `AdminShell`: barra lateral `deep` fixa a partir de `lg` (`w-80`) e, em telas
  menores, barra superior com botão "Menu" (mesmo padrão do menu mobile do
  site). Cabeçalho com e-mail, papel (`Badge`) e "Sair".
- Itens de navegação sem página aparecem com o selo "Em breve" e **não** são
  links; o item atual recebe `aria-current="page"`.
- `AuthCard`: cartão centralizado sobre `surface-muted` com curvas de nível,
  usado no login, recuperação, nova senha e acesso negado.
- Formulários (`form-controls.tsx`): `Field` (rótulo, indicação
  "Obrigatório", contador de caracteres, erro com ícone e dica — ligados ao
  campo por `aria-describedby` via `describedBy()`), `TextInput`, `TextArea`,
  `PasswordInput` (botão mostrar/ocultar com `aria-pressed`), `FormSection`
  (bloco com título) e `FormMessage` (`error` com `role="alert"`; `success` e
  `info` com `role="status"`). Campos com 48px de altura mínima; inválidos com
  borda e anel `danger` (`aria-invalid`), nunca só pela cor: o erro tem texto.
- Formulários do CMS terminam com uma barra fixa no rodapé da tela: estado
  ("Alterações não salvas", em `earth`), "Cancelar alterações" e "Salvar
  alterações" (desabilitados sem alterações ou durante o envio).

### Ícones

[`lucide-react`](https://lucide.dev), traço 1.75, sempre `aria-hidden` quando
acompanhados de texto. A biblioteca não inclui ícones de marcas; redes
sociais usam o nome da plataforma como texto.

## Acessibilidade

- Link "Pular para o conteúdo" e landmarks (`header`, `nav`, `main`, `footer`,
  seções nomeadas por `aria-labelledby`).
- Hierarquia: um `h1` (hero) → `h2` por seção → `h3` por item.
- Menu mobile: botão com `aria-expanded`/`aria-controls`, fecha com Esc
  (devolvendo o foco) e ao escolher um link; alvos de toque ≥ 44px.
- Imagens informativas com `alt`; decorativas com `alt=""` ou `aria-hidden`.
- Links repetidos ("Ver projeto", "Ler publicação") recebem complemento
  `sr-only` com o título do item.
