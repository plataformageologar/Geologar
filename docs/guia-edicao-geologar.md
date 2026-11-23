# Guia de edição do portal GeoLogar

Guia para a equipe que mantém o conteúdo do portal. Detalhes técnicos em
[`visual-editor.md`](visual-editor.md), [`cms.md`](cms.md),
[`editorial-workflow.md`](editorial-workflow.md) e
[`custom-pages.md`](custom-pages.md).

> **Importante:** salvar não publica. Tudo o que você salva vira um
> **rascunho**; o site só muda quando alguém clica em **Publicar
> alterações**.

## Como entrar

1. Acesse `/admin/login` com o e-mail e a senha cadastrados pela
   administração.
2. Com a sessão ativa, ao visitar o site aparece o botão **“Editar esta
   página”** no canto da tela. Ele abre o editor visual na mesma página.

## Dois jeitos de editar

- **Editor visual** (menu *Site → Editor visual*): você vê a página como o
  visitante vê, clica no que quer mudar e edita no painel lateral.
- **CMS** (demais itens do menu): formulários completos. Use para cadastrar
  projetos, linhas de pesquisa, publicações, instituições e imagens.

Os dois alteram o mesmo conteúdo. Em cada tela do CMS há o link **“Editar
visualmente”**; no editor, **“Abrir no CMS”** leva ao formulário
correspondente.

## Usando o editor visual

1. Escolha a página no seletor da barra superior.
2. Passe o mouse sobre a página: cada área editável ganha um contorno azul.
3. Clique na área. O painel mostra os campos daquele elemento.
4. Edite. A tela atualiza na hora, mas **nada vai para o site**.
5. Clique em **Salvar rascunho** (ou `Ctrl+S`). O status muda para “Rascunho
   salvo — não publicado”. O site público continua igual.
6. Quando estiver pronto, clique em **Publicar**, confira o que será
   publicado, escreva uma observação (opcional) e confirme.

Outros comandos:

| Ação | Como |
| --- | --- |
| Desfazer / refazer | Botões da barra, `Ctrl+Z` / `Ctrl+Shift+Z` |
| Ver em celular, tablet ou computador | Ícones de dispositivo na barra |
| Voltar à lista de elementos | `Esc` ou “Estrutura da página” no painel |
| Jogar fora o que ainda não foi salvo | **Descartar não salvas** (pede confirmação) |
| Ver como está o site agora | Ícone de olho (**Ver versão publicada**) |
| Ver versões anteriores | Ícone de relógio (**Histórico de versões**) |
| Jogar fora o rascunho salvo | Ícone de lixeira (**Descartar rascunho salvo**) |

Se você tentar sair com alterações não salvas, o navegador avisa.

### Seções da página inicial e de “A Rede”

Na lista de elementos você pode **subir/descer**, **ocultar** (a seção fica
esmaecida com o selo “Oculta no site”), **duplicar** ou **remover** blocos.
As seções principais (Hero, Pesquisa, Projetos etc.) podem ser ocultadas e
reordenadas, mas não removidas.

Para acrescentar conteúdo use **Adicionar bloco**:

- **Texto** — título e parágrafos.
- **Imagem + texto** — imagem da biblioteca, texto e posição da imagem.
- **Chamada** — título, texto e botão com link.
- **Galeria** — até 12 imagens da biblioteca, em grade.
- **Logotipos** — até 24 instituições cadastradas.

Toda imagem precisa de **texto alternativo** (descrição para leitores de
tela).

### Textos das páginas internas

Clique no topo de Pesquisa, Projetos, Publicações, Instituições, Contato ou
A Rede para editar o rótulo, o título, a introdução e os dados para buscadores
e redes sociais (título, descrição e imagem de compartilhamento). Campos
vazios usam o texto padrão.

### Projetos e linhas de pesquisa

O conteúdo de cada projeto ou linha é editado no CMS. No editor, ao clicar em
um card ou abrir uma página de detalhe, o painel mostra o link **“Editar no
CMS”**.

## Salvar rascunho e publicar

1. **Salvar rascunho** guarda o trabalho no sistema. Você pode fechar o
   navegador e continuar depois, de outro computador. O site não muda.
2. **Visualizar rascunho** (no CMS) abre o editor visual mostrando o
   rascunho como ficará no site.
3. **Publicar alterações** coloca o rascunho no ar. No editor visual dá para
   publicar várias partes juntas (por exemplo, textos da página inicial e
   pilares): ou tudo vai para o site, ou nada muda.
4. Menus, aparência e informações institucionais valem para o site inteiro;
   ao publicá-los aparece um aviso.

### Como saber se está publicado

A barra no topo de cada tela do CMS (e o status no editor visual) mostra:

| Mensagem | O que significa |
| --- | --- |
| Publicado — sem rascunho pendente | O que você vê é o que está no site. |
| Alterações não salvas | Você mudou algo e ainda não salvou. |
| Rascunho salvo, diferente da versão publicada | Há mudanças guardadas que ainda não estão no site. |
| Rascunho salvo, igual à versão publicada — nada a publicar | Há rascunho, mas igual ao site. O botão **Publicar** fica desativado; use **Descartar rascunho** se quiser limpar. |
| Rascunho salvo — ainda não publicado | Página nova que nunca foi publicada. |

### Desfazer, descartar, restaurar, despublicar

| Ação | O que faz | Muda o site? |
| --- | --- | --- |
| **Desfazer** (`Ctrl+Z`) | Volta a última edição na tela, antes de salvar. | Não |
| **Descartar alterações não salvas** | Volta ao último rascunho salvo. | Não |
| **Descartar rascunho** | Joga fora o rascunho salvo e volta à versão publicada. Pede confirmação; o rascunho continua no histórico. | Não |
| **Restaurar como rascunho** | Uma versão antiga vira o novo rascunho. | Só depois de publicar |
| **Despublicar** | Tira uma página personalizada do site (administradores). | Sim: a página some |

## Histórico de versões

- No CMS: botão **Histórico de versões** na barra do topo, ou o item
  **Histórico de versões** no menu lateral (grupo Revisão), que lista todos os
  conteúdos e mostra quais têm rascunho esperando publicação. No editor
  visual: ícone de relógio.
- Cada linha mostra o número da versão, o que aconteceu (rascunho salvo,
  publicação, restauração), quem fez, quando e a observação.
- **Ver e comparar** mostra as diferenças em relação à versão publicada ou à
  versão anterior (textos alterados, blocos incluídos, removidos, ocultos ou
  movidos).
- O histórico não pode ser apagado nem alterado.

### Restaurar uma versão antiga

1. Abra o histórico e escolha a versão.
2. Clique em **Restaurar esta versão como rascunho** e confirme.
3. O conteúdo dela vira o rascunho atual. Revise e clique em **Publicar
   alterações** para colocá-lo no ar.

Se a versão antiga usa algo que não existe mais (por exemplo, uma imagem
removida da biblioteca), o sistema explica e não restaura.

## Páginas novas

1. *Site → Páginas → Nova página*.
2. Preencha o **título**, o **endereço** (use “Gerar do título”) e, se
   quiser, a introdução e os dados para buscadores. O site acrescenta
   “| GeoLogar” ao título da aba sozinho.
3. Clique em **Criar página (rascunho)**. A página ainda não aparece no site.
4. Adicione blocos (Texto, Imagem + texto, Chamada, Galeria, Logotipos) na
   própria tela ou em **Editar visualmente**. Salve o rascunho.
5. **Publicar alterações**. A página passa a abrir em `/paginas/<endereço>`.

O endereço pode ser trocado até a primeira publicação. Depois disso fica fixo
para não quebrar links já divulgados.

### Colocar a página no menu (administradores)

Em *Site → Navegação*, a lista **Páginas personalizadas** mostra o endereço de
cada página. Adicione um link com esse endereço, salve o rascunho e publique
a navegação. Só inclua no menu páginas já publicadas — as outras aparecem com
aviso.

### Arquivar

**Arquivar** tira a página do site e da edição, sem apagar nada (título,
blocos e histórico ficam guardados). **Reativar** traz a página de volta como
não publicada. Páginas já publicadas só podem ser despublicadas, arquivadas
ou reativadas por administradores.

## Quem pode o quê

| | Administrador | Editor |
| --- | --- | --- |
| Textos da página inicial, pilares, seções, blocos, textos das páginas: salvar rascunho e publicar | ✔ | ✔ |
| Páginas personalizadas: criar, editar, publicar, restaurar | ✔ | ✔ |
| Despublicar ou arquivar página já publicada | ✔ | — |
| Projetos, linhas, publicações, instituições, imagens | ✔ | ✔ |
| Cabeçalho, rodapé, contatos, redes sociais | ✔ | — |
| Menus (navegação) | ✔ | apenas consulta |
| Aparência (cores, botões, fontes) | ✔ | — |

## Aparência (administradores)

*Site → Aparência* ou o botão **Aparência** no editor. Permite trocar as cores
principal, secundária e de destaque, o fundo das seções, o formato dos botões,
os cantos, a fonte dos títulos e o estilo dos cards.

- Cores com pouco contraste são recusadas, para manter o texto legível.
- **Restaurar padrão** volta à identidade visual original.
- Mudanças de aparência afetam o site inteiro: salve o rascunho, confira a
  prévia em celular e computador no editor visual e só então publique.

## Logotipos

Trocar o logotipo do cabeçalho ou do rodapé mostra um aviso: use apenas
arquivos oficiais aprovados pela GeoLogar, enviados pela biblioteca de mídia.

## Quando alguém editou ao mesmo tempo

Se outra pessoa salvou ou publicou a mesma parte depois que você abriu a
página, o sistema não sobrescreve: aparece a mensagem de conflito e o que você
digitou continua na tela. Copie o que precisar, recarregue a página e aplique
de novo.

## Boas práticas

- Salve rascunhos com frequência; publique só depois de revisar a prévia nos
  três tamanhos de tela.
- Use a observação da publicação para dizer o que mudou (ex.: “Atualiza
  contato da secretaria”). Ela aparece no histórico.
- Não cole textos com formatação de outros programas; o editor aceita texto
  simples.
- Links internos começam com `/` (ex.: `/contato`); externos com `https://`.
- Dados de contato e redes sociais devem ser os oficiais da GeoLogar.
