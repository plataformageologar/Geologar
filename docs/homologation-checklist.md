# Roteiro de homologação — Portal GeoLogar

Roteiro para a equipe GeoLogar conferir o portal antes de considerá-lo pronto.
Não é preciso conhecimento técnico. Marque cada item e anote o que estiver
diferente do esperado (página, o que fez, o que apareceu; uma captura de tela
ajuda).

Endereço do site: <https://geologar.plataformageologar.workers.dev>
Área de edição: <https://geologar.plataformageologar.workers.dev/admin>

Use, se possível, um computador e um celular.

## 1. Site público (sem entrar na área de edição)

- [ ] A página inicial abre e mostra banner, apresentação, linhas de
      pesquisa e a chamada para cooperação.
- [ ] O menu leva a: A Rede, Pesquisa, Projetos e Publicações. O rodapé leva
      também a Instituições.
- [ ] Em qualquer página, **Contato** (menu, menu do celular e botão “Fale
      com a GeoLogar”) rola até a coluna Contato do rodapé, sem trocar de
      página. O endereço antigo `/contato` também leva até ela.
- [ ] O rodapé tem 4 colunas no computador (identidade, Navegação, Links
      úteis, Contato), 2 no tablet e 1 no celular, com fundo marrom escuro.
      Só aparecem contatos e redes sociais cadastrados; nenhum link sem
      destino.
- [ ] Em Pesquisa, cada linha abre a própria página com projetos e
      publicações relacionados.
- [ ] Em Projetos, os filtros e a mudança de página funcionam.
- [ ] Um endereço inexistente (por exemplo, `/pesquisa/teste-qualquer`) mostra
      “página não encontrada” com link para o início.
- [ ] No celular: o botão **Menu** abre e fecha a lista; nada fica cortado e
      não é preciso arrastar a tela para os lados.
- [ ] Textos, nomes de instituições, dados de contato e créditos estão
      corretos.

## 2. Conteúdo que depende da GeoLogar

- [ ] Fotografias das linhas de pesquisa: as atuais são de baixa resolução e
      aparecem borradas em telas grandes. Enviar fotos reais (de preferência
      com 1600 px de largura ou mais) com autorização de uso.
- [ ] Logotipos oficiais das instituições parceiras (12 provisórios e 10
      ausentes; ver `docs/visual-refinement.md`) e autorização de uso das
      marcas.
- [ ] Projetos, publicações, instituições e redes sociais reais.
- [ ] Dados oficiais de contato para o rodapé: o e-mail e a localização
      atuais são provisórios do conceito (`geologar@ufba.br`, Salvador — BA —
      Brasil); faltam telefone completo, WhatsApp (se houver), endereço e
      redes sociais.
- [ ] Links úteis do rodapé (privacidade, termos, acessibilidade), quando as
      páginas existirem.
- [ ] Decisão sobre domínio próprio (endereço definitivo do site).

### Identidade visual (Etapa 10.7)

- [ ] O cabeçalho mostra o logotipo, o campo **Buscar no site** e o botão
      verde **Login / Área restrita**; no celular, ambos ficam no menu.
- [ ] Uma busca (por exemplo, “geologia”) mostra só conteúdo publicado.
- [ ] A página inicial mostra a aparência “Referência GeoLogar” (publicada
      em 24/11/2026): banner com o nome em destaque, linhas com fotos,
      títulos em caixa alta com marcador e rodapé marrom.
- [ ] As 22 instituições publicadas, suas categorias e os logotipos
      provisórios foram conferidos.
- [ ] As 3 publicações provisórias (“a confirmar”) foram substituídas pelas
      referências oficiais, e os 3 projetos tiveram situação e dados
      confirmados.

## 3. Entrar na área de edição

- [ ] Cada pessoa da equipe recebeu a própria conta (não compartilhar
      senhas).
- [ ] No primeiro acesso de um Editor criado pelo painel, aparece “Defina sua
      senha pessoal”; nada pode ser editado antes de trocar a senha, e a
      senha inicial não é aceita como nova senha.
- [ ] Entrar com e-mail e senha leva ao painel.
- [ ] “Esqueci minha senha” envia o e-mail de redefinição e a nova senha
      funciona.
- [ ] “Sair” encerra a sessão.

## 4. Editar sem afetar o site

Faça estes testes em um texto que possa ser desfeito.

- [ ] Alterar um texto e clicar em **Salvar rascunho**: o site público
      **não** muda.
- [ ] **Visualizar rascunho** mostra a alteração.
- [ ] **Descartar rascunho**: os campos voltam ao texto que está no site.
- [ ] Com o rascunho igual ao site, o botão **Publicar** fica desativado.
- [ ] Salvar de novo e **Publicar alterações**: o site passa a mostrar o novo
      texto.
- [ ] **Histórico de versões** (menu lateral): o conteúdo aparece com a
      versão publicada; **Ver e comparar** mostra o que mudou.
- [ ] **Restaurar como rascunho** a versão anterior e publicar: o texto
      original volta ao site.

## 5. Editor visual

- [ ] Abrir **Editor visual**, clicar num bloco da página e editar o texto no
      painel lateral: a mudança aparece na tela na hora.
- [ ] **Descartar** o que não foi salvo volta ao texto original.
- [ ] As visualizações de computador, tablet e celular funcionam.

### Experiências digitais (Etapa 10.6)

- [ ] Em **Experiências digitais** (menu *Site*), conferir os dois cards do
      rascunho e testar o endereço do Bege Bahia pelo link **Testar o
      endereço**.
- [ ] No editor visual da página inicial, clicar no card do Bege Bahia: o
      painel abre aquele card.
- [ ] Ocultar um card e mudar outro para *Em breve*: na tela, o oculto fica
      esmaecido e o *Em breve* perde o botão. **Descartar** as alterações.
- [ ] Tentar salvar um endereço `http://`, `javascript:` ou sem `https://`:
      o sistema recusa e explica.
- [ ] Publicar a página inicial: a seção aparece logo abaixo do banner; o
      botão **Iniciar experiência** abre a experiência em nova aba; no
      celular os cards ficam um abaixo do outro.

## 6. Páginas e menu

- [ ] Criar uma página nova (fica como rascunho, fora do site).
- [ ] Tentar um endereço com espaço, letra maiúscula ou já usado: o sistema
      recusa e explica.
- [ ] Publicar a página: ela abre no endereço indicado.
- [ ] Em **Navegação** (administradores), adicionar um link para uma página
      que ainda não foi publicada: aparece um aviso de que o visitante veria
      “página não encontrada”. Descartar o rascunho do menu depois do teste.
- [ ] Arquivar a página de teste ao final.

## 7. Usuários e permissões (administradores)

Use um e-mail de teste da própria equipe e apague as anotações de senha ao
final.

- [ ] Em **Configurações → Usuários e permissões**, **Adicionar Editor** com
      e-mail e senha inicial: aparece “Editor criado com sucesso” e a conta
      aparece na lista como “Ativo” e “Pendente de troca”.
- [ ] Tentar criar de novo com o mesmo e-mail: o sistema avisa que o e-mail
      já pertence a um Editor ativo.
- [ ] Entrar com a nova conta (outro navegador ou janela anônima): o painel
      pede a troca de senha; depois da troca, o painel abre normalmente e a
      lista mostra “Já alterada”.
- [ ] Uma conta de **editor** consegue editar textos, seções, pilares e
      páginas, mas não consegue publicar menus, aparência nem informações
      institucionais, e não vê “Usuários e permissões” (abrir o endereço
      direto mostra acesso negado).
- [ ] **Desativar acesso**: a conta desativada não consegue mais usar a área
      de edição; os conteúdos feitos por ela continuam no site.
- [ ] **Reativar acesso**: a conta volta a entrar.
- [ ] **Redefinir senha**: a senha antiga deixa de funcionar e a nova senha
      inicial pede troca no próximo acesso.
- [ ] O **Histórico de operações** mostra cada ação, sem nenhuma senha.
- [ ] Ao final, desativar a conta de teste.

## 8. Aprovação

| Item | Responsável | Data | Aprovado? | Observações |
|---|---|---|---|---|
| Site público | | | | |
| Conteúdo e imagens | | | | |
| Área de edição | | | | |
| Usuários e permissões | | | | |
| Identidade visual e instituições (Etapa 10.7) | | | | |
| Decisões pendentes (dados de contato, domínio) | | | | |
