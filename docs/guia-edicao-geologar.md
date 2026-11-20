# Guia de edição do portal GeoLogar

Guia para a equipe que mantém o conteúdo do portal. Detalhes técnicos em
[`visual-editor.md`](visual-editor.md) e [`cms.md`](cms.md).

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
4. Edite. A página atualiza na hora, mas **nada vai para o site até você
   salvar**.
5. Clique em **Salvar** (ou `Ctrl+S`). O status muda para “Salvo com sucesso”.

Outros comandos:

| Ação | Como |
| --- | --- |
| Desfazer / refazer | Botões da barra, `Ctrl+Z` / `Ctrl+Shift+Z` |
| Ver em celular, tablet ou computador | Ícones de dispositivo na barra |
| Voltar à lista de elementos | `Esc` ou “Estrutura da página” no painel |
| Jogar fora as alterações | **Descartar** (pede confirmação) |

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

## Quem pode o quê

| | Administrador | Editor |
| --- | --- | --- |
| Textos da página inicial, pilares, seções, blocos, textos das páginas | ✔ | ✔ |
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
- Mudanças de aparência afetam o site inteiro: confira a prévia em celular e
  computador antes de salvar.

## Logotipos

Trocar o logotipo do cabeçalho ou do rodapé mostra um aviso: use apenas
arquivos oficiais aprovados pela GeoLogar, enviados pela biblioteca de mídia.

## Quando alguém editou ao mesmo tempo

Se outra pessoa salvou a mesma parte depois que você abriu a página, o
sistema não sobrescreve: aparece a mensagem de conflito e o seu rascunho fica
na tela. Copie o que precisar, recarregue a página e aplique de novo.

## Boas práticas

- Revise a prévia nos três tamanhos de tela antes de salvar.
- Não cole textos com formatação de outros programas; o editor aceita texto
  simples.
- Links internos começam com `/` (ex.: `/contato`); externos com `https://`.
- Dados de contato e redes sociais devem ser os oficiais da GeoLogar.
