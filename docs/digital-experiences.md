# Experiências digitais — GeoLogar (Etapa 10.6)

Seção da página inicial, logo abaixo do banner, que apresenta as experiências
digitais e interativas da GeoLogar (tours em 360°, aplicações 3D, mapas
interativos…) em cards grandes com link para a aplicação externa.

O portal **não incorpora** as experiências: cada card mostra capa, textos e um
link. A aplicação externa (Three.js, panoramas, áudio, WebXR) só é carregada
quando o visitante clica — por padrão em outra aba. Não há iframe, vídeo
automático, script de terceiros nem requisição do servidor ao endereço da
experiência.

## Conteúdo inicial

A migration `20261124120000_digital_experiences_section.sql` cria a seção no
**rascunho** da página inicial (não publica). Um administrador ou Editor
revisa e publica pelo fluxo editorial normal.

**Publicação em produção (24/11/2026):** a página inicial foi publicada por
um administrador em `/admin/experiencias` (revisão 5, observação “Etapa
10.6: publica a seção Experiências digitais (Bege Bahia e segunda
experiência em breve).”), com a aprovação da equipe para o endereço e os
textos. Ver [Validação em produção](#validação-em-produção-24112026).

| Campo | Texto inicial |
| --- | --- |
| Sobretítulo | Divulgação científica |
| Título | Explore as geociências de perto |
| Descrição | Conheça nossas experiências digitais e descubra o patrimônio geológico, os recursos naturais e as geociências de maneira interativa e imersiva. |
| Colunas | 2 |
| Fundo | Suave (`muted`) |

| Card | Bege Bahia | Nova experiência GeoLogar |
| --- | --- | --- |
| Identificação | Experiência imersiva 360° | Experiência interativa |
| Descrição | Explore a cadeia produtiva do mármore Bege Bahia por meio de uma experiência virtual em 360°, acompanhando as etapas de extração e beneficiamento da rocha ornamental. | Mais uma maneira de explorar o conhecimento geocientífico por meio de recursos digitais. |
| Endereço | `https://bernardo-aeonvr.github.io/Geologar-2/` | — |
| Disponibilidade | Disponível | Em breve |
| Botão | Iniciar experiência | — (mostra “Em breve”) |
| Capa | `public/images/experiencias/bege-bahia-pedreira.webp` | Capa neutra da GeoLogar (sem imagem) |

**Capa do Bege Bahia:** enquadramento retangular (1600×900, WebP, ~115 KB)
gerado a partir de um panorama real da própria experiência
(`public/media/panoramas/e1-p2.orig.jpg`, cena “Parte de cima da pedreira”,
repositório público `bernardo-aeonvr/Geologar-2`). Não é imagem gerada por
IA nem foto de terceiros; os arquivos originais da experiência não foram
alterados. Texto alternativo: “Pedreira de mármore Bege Bahia em Ourolândia
(BA): bancadas de rocha clara cortadas em degraus e blocos extraídos sob céu
nublado.” A capa pode ser trocada pela biblioteca de mídia a qualquer
momento.

**Endereço:** verificado manualmente (HTTP 200; a tela inicial e a primeira
cena do tour carregaram). O README do repositório `Geologar-2` o descreve
como a versão usada para testes no GitHub Pages; a equipe aprovou a
publicação com este endereço em 24/11/2026. Se o endereço oficial mudar,
basta trocá-lo no CMS e publicar.

O segundo card é um espaço reservado: fica “Em breve”, sem link. Ver
“Como preencher a segunda experiência” no
[guia de edição](guia-edicao-geologar.md#como-adicionar-ou-modificar-uma-experiência-digital).

## Modelo de dados

A seção é uma linha de `page_sections` com `section_type = 'experiences'`
(somente `page_key = 'home'`, no máximo uma por página). Os cards ficam em
`settings.experiences` (JSONB), sem tabela nova:

```json
{
  "eyebrow": "Divulgação científica",
  "title": "Explore as geociências de perto",
  "description": "…",
  "background": "muted",
  "columns": 2,
  "experiences": [
    {
      "id": "UUID estável (gerado ao criar o card)",
      "title": "Bege Bahia",
      "label": "Experiência imersiva 360°",
      "description": "…",
      "image_path": "uploads/<uuid>.webp | /images/experiencias/bege-bahia-pedreira.webp",
      "image_alt": "…",
      "external_url": "https://…",
      "button_label": "Iniciar experiência",
      "unavailable_label": "Em breve",
      "availability": "available | coming_soon | unavailable",
      "is_visible": true,
      "open_in_new_tab": true
    }
  ]
}
```

| Regra | Onde |
| --- | --- |
| Até 12 experiências; `id` UUID único; chaves conhecidas apenas | `is_valid_experience_list` + `validateExperiences` |
| Título obrigatório (até 120); identificação 60; descrição 400; texto alternativo 200; botão 40; texto indisponível 40 | idem |
| Disponibilidade: `available`, `coming_soon`, `unavailable`; visibilidade é independente | idem |
| “Disponível” exige endereço | idem |
| Endereço: somente `https://`, domínio com ponto, até 300 caracteres, sem espaços, barras invertidas, caracteres de controle ou usuário/senha. Recusa `javascript:`, `data:`, `file:`, `http:`, `#` e endereços relativos | `is_valid_experience_url` + `isValidExperienceUrl` |
| Imagem: objeto da biblioteca (`uploads/<uuid>.(jpg\|png\|webp)`) ou a capa inicial do site; nunca Base64 | `is_valid_image_reference` + `SEED_LOCAL_IMAGES` |
| Colunas: 2 ou 3 | `is_valid_section_settings` |
| Só na página inicial; no máximo uma | constraint `page_sections_experiences_home`, índice único `page_sections_experiences_unique`, `is_valid_editorial_content`, `validateSectionList` |

O banco é a validação definitiva; o TypeScript repete as regras para dar
retorno imediato nos formulários. A leitura pública é tolerante: um card
“disponível” com endereço inválido é exibido como “Em breve”, sem link.

## Fluxo editorial

Nada novo: a seção faz parte da parte `sections` da unidade `home`
(`editorial_documents`). Salvar grava rascunho; **Publicar** publica a página
inicial inteira (banner, seções e experiências) e registra uma revisão.

- **Histórico:** a comparação de versões lista cada card
  (“Experiência “Bege Bahia”” incluída, removida, ocultada, movida ou com
  campos alterados — título, endereço, disponibilidade etc.).
- **Restaurar** uma versão anterior à Etapa 10.6 continua funcionando: a
  versão restaurada não tem a seção e, ao publicar, ela sai do site.
- **Imagens:** as capas entram em `media_usage` (rascunho, publicado e
  histórico); uma imagem em uso não pode ser excluída da biblioteca.
- `editorial_guard` impede gravar `page_sections` fora do fluxo (GL403).

## Telas

| Onde | O que faz |
| --- | --- |
| `/admin/experiencias` | Resumo (experiência, disponibilidade, visibilidade, se já está no site) e edição só da seção de experiências. Se a seção não existir, botão para adicioná-la abaixo do banner. |
| `/admin/secoes?pagina=home` | A seção aparece na lista como “Experiências digitais”: mover, ocultar, excluir (com confirmação) e editar. “Adicionar bloco” oferece “Experiências digitais” enquanto a página não tiver a seção. |
| `/admin/editor?pagina=/` | A seção é renderizada com o mesmo componente do site. Clicar em um card seleciona a seção e abre aquele card no painel (mensagem `select` com `record: { kind: "experience", id }`, id validado como UUID). Cards ocultos aparecem esmaecidos com “Oculta no site”. |

Em cada card: título, identificação, descrição, capa (biblioteca de mídia) e
texto alternativo, disponibilidade, abrir em nova aba, endereço (com o link
“Testar o endereço”, que abre em nova aba no navegador de quem edita), texto
do botão e texto quando não disponível. Ações: subir/descer, ocultar/exibir,
remover (“Remover a experiência? A imagem continua na biblioteca.”) e
“Adicionar experiência”.

## Componente público

`src/components/site/experiences-section.tsx` (`ExperiencesSection`), usado
pelo site e pela tela do editor visual:

- `<section id="experiencias">` com `aria-labelledby`; título `h2`, cards
  `h3`, lista `<ul>`.
- Grade: 1 coluna no celular, 2 a partir de 768 px, 3 a partir de 1024 px
  quando configurado; sem carrossel.
- Capa 16:9 com `next/image` (`sizes` por coluna); sem imagem, capa neutra
  com as cores e curvas de nível da GeoLogar.
- Link: `rel="noopener noreferrer"`; `target="_blank"` quando “abrir em nova
  aba”; nome acessível “Iniciar experiência: Bege Bahia (abre em nova aba)”
  e ícone de link externo; altura mínima de 48 px.
- Sem link quando “Em breve” ou “Temporariamente indisponível”: aparece o
  texto do estado.
- Âncora `/#experiencias` disponível para botões do banner e menus.
- Animação de hover discreta, desligada com `prefers-reduced-motion`.

## Permissões

Administradores e Editores ativos editam e publicam (mesmas regras de
`page_sections`). Editores com troca de senha inicial pendente, contas
inativas e usuários sem vínculo não gravam (42501). Visitantes leem apenas o
publicado.

## Arquivos

| Arquivo | Papel |
| --- | --- |
| `supabase/migrations/20261124120000_digital_experiences_section.sql` | Validação SQL, tipo `experiences`, restrições, políticas e rascunho inicial |
| `src/lib/site/experiences.ts` | Tipos, regras, validação e leitura tolerante |
| `src/lib/site/sections.ts` | Tipo `experiences` (seção adicionável só na home) |
| `src/components/site/experiences-section.tsx` | Componente público |
| `src/components/admin/site/experiences-fields.tsx` | Formulário dos cards (CMS e editor visual) |
| `src/app/admin/(protected)/experiencias/page.tsx` | Tela do CMS |
| `src/lib/editorial/content.ts` | Comparação de versões por card |
| `public/images/experiencias/bege-bahia-pedreira.webp` | Capa inicial |

## Testes

- Unitários: `tests/site/experiences.test.ts` (endereços, lista, seção,
  histórico, mensagem do editor).
- pgTAP: `supabase/tests/database/digital_experiences.test.sql` (48
  verificações: validação de endereço e lista, rascunho inicial, publicação
  por Editor, GL403 fora do fluxo, leitura anônima, uma seção por página, só
  na home, biblioteca de mídia e `media_usage`, restauração anterior à seção,
  bloqueio de Editor com senha pendente, inativo e sem vínculo).
- E2E: `/admin/experiencias` exige login; na home publicada, links `https://`
  com `noopener noreferrer`, aviso de nova aba e nenhum iframe.
- Responsivo: 375×812, 390×844, 768×1024, 1024×768, 1280×720 e 1440×900 sem
  rolagem horizontal.

## Validação em produção (24/11/2026)

| Verificação | Resultado |
| --- | --- |
| Migration aplicada | Rascunho da `home` com a seção logo após o banner; publicado inalterado até a publicação |
| pgTAP no banco de produção (transação desfeita) | 424/424 (10 arquivos) |
| Deploy (Workers Builds) do commit `0b26643` | Sucesso |
| Publicação pela interface (sessão admin) | Revisão 5; resumo passa a “Publicada” para os dois cards |
| Site público | Seção `#experiencias` entre o banner e “A Rede”; 2 cards; link do Bege Bahia `https://…/Geologar-2/` com `target="_blank"`, `rel="noopener noreferrer"` e nome “Iniciar experiência: Bege Bahia (abre em nova aba)”; segundo card “Em breve” sem link; capa carregada; nenhum iframe; sem rolagem horizontal |
| E2E das experiências contra produção (`E2E_BASE_URL`) | 4/4 (computador e celular) |
