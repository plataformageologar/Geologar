# Conteúdos a fornecer e validar — equipe GeoLogar

Lista do que a equipe GeoLogar precisa fornecer ou aprovar para a publicação
definitiva do portal. São dependências de conteúdo e de aprovação, não
pendências de desenvolvimento: tudo abaixo pode ser preenchido pelo painel
(`/admin`) sem novo deploy, salvo onde indicado.

A prévia protegida **`/admin/demonstracao`** (menu "Prévia de demonstração",
somente com login) mostra a homepage com os rascunhos e sinaliza, seção por
seção, o que está publicado, em rascunho ou pendente. O detalhamento dos
materiais recebidos está em
[`initial-content-manifest.md`](initial-content-manifest.md).

## Identidade visual

- [ ] **Confirmar o logotipo oficial**, de preferência em arquivo vetorial
      (SVG/PDF) ou PNG em alta resolução com fundo transparente. O site usa o
      logotipo já versionado no código; as versões do mockup são um desenho
      diferente e não foram adotadas. Se a versão oficial for outra, ela pode
      ser enviada em Configurações → Identidade visual.
- [ ] **Fotografias oficiais e direitos de uso**: para o banner principal (de
      preferência ≥ 2000 px de largura, de pesquisas, equipes ou territórios
      da rede) e para as seis linhas de pesquisa. As imagens atuais das linhas
      são recortes de baixa resolução do mockup, publicados como demonstração
      e a substituir.
- [ ] Confirmar se o favicon atual (recorte do logotipo) é o desejado.

## Institucional

- [ ] Aprovar o texto do banner (título, descrição e botões).
- [ ] Aprovar a apresentação da rede ("Uma rede para produzir e compartilhar
      conhecimento") e os quatro pilares.
- [ ] Aprovar a chamada para cooperação ("Vamos conectar conhecimento e novas
      possibilidades").
- [ ] Aprovar as seis linhas de pesquisa (títulos e descrições curtas) e, se
      desejado, escrever a descrição completa de cada uma.

## Projetos

Três rascunhos foram preparados a partir da referência visual (somente nome,
uma frase de descrição e imagem provisória): **DETEC BEGE – FASE II**,
**ACV e Fluxo de Massas** e **EXPOGEO Virtual**. Para cada um:

- [ ] Confirmar se o projeto existe com esse nome e se deve aparecer no site.
- [ ] Descrição curta e descrição completa.
- [ ] Situação (em andamento ou concluído) — hoje "A confirmar"; é
      obrigatória para publicar.
- [ ] Coordenação.
- [ ] Período de execução.
- [ ] Instituições participantes e financiamento, quando aplicável.
- [ ] Resultado ou contribuição (com documentação; nenhum número de impacto
      foi criado).
- [ ] Linhas de pesquisa relacionadas.
- [ ] Imagem oficial.
- [ ] Indicar quais projetos ficam em destaque na homepage.

## Publicações

> **Etapa 10.7:** três **referências provisórias** do conceito visual estão
> publicadas (“Autores a confirmar”, periódico “(a confirmar)”, sem DOI).
> Substituir pelos dados oficiais ou despublicar. Ver
> [`visual-refinement.md`](visual-refinement.md#publicações-provisórias).

O cadastro é responsabilidade da equipe GeoLogar (Publicações → Nova
publicação). As três referências do mockup não foram importadas.

- [ ] Título completo (no idioma original).
- [ ] Autores.
- [ ] Ano.
- [ ] Periódico ou veículo.
- [ ] DOI e/ou link.
- [ ] Projetos e linhas de pesquisa relacionados.

## Instituições

As 22 instituições da referência estão **publicadas** (autorização de
24/11/2026) em 5 categorias (Parceiras (Universidades), Colaboradoras
(Pesquisa), Apoio institucional, Empresarial, Internacionais), só com nome e
sigla. Lista e logotipos em
[`visual-refinement.md`](visual-refinement.md#instituições-cadastradas).

- [ ] Confirmar os vínculos (a presença de um logotipo no mockup não confirma
      parceria) e os nomes oficiais.
- [ ] Confirmar as categorias e a ordem.
- [ ] Site oficial de cada instituição.
- [ ] Logotipos oficiais (de preferência vetoriais) e autorização de uso das
      marcas: substituir os 12 provisórios (recortes de baixa resolução) e
      enviar os 10 que faltam (CIENAM UFBA, CBPM, CETEM, SDE Bahia, Museu
      Geológico da Bahia, Associação dos Astrônomos da Bahia, CAPES, CNPq,
      FAPESB, ASSOBEGE).

## Identidade visual (Etapa 10.7)

- [x] Aparência “Referência GeoLogar” e homepage revisadas e publicadas
      (24/11/2026).
- [ ] Fotografia autorizada para o banner (por exemplo, do Bege Bahia); hoje
      o banner usa o fundo padrão.

## Contato

- [ ] E-mail oficial.
- [ ] Telefone, se houver atendimento oficial (o do mockup é incompleto).
- [ ] Localização institucional validada.
- [ ] Redes sociais ativas (endereços completos).

### Formulário de contato

O formulário está pronto, mas **desativado** até que os itens abaixo sejam
definidos (detalhes em [`contact-form.md`](contact-form.md#checklist-de-ativação)):

- [ ] Endereço que receberá as mensagens do formulário (não precisa ser o
      e-mail público exibido no site).
- [ ] Pessoa ou equipe responsável por ler e responder as mensagens.
- [ ] Domínio de envio (o remetente precisa estar em um domínio verificado no
      provedor de e-mail, o que exige registros no DNS desse domínio).
- [ ] Endereço remetente (ex.: `nao-responda@` no domínio de envio).
- [ ] Conta no provedor de envio (Resend) e no Cloudflare Turnstile, ou
      autorização para criá-las em nome da GeoLogar.
- [ ] Aprovação do texto de privacidade exibido abaixo do formulário: "Os
      dados informados serão utilizados para responder à sua mensagem enviada
      à GeoLogar."

## Experiências digitais (Etapa 10.6)

A página inicial tem a seção publicada (24/11/2026) com duas experiências.
Ver [`digital-experiences.md`](digital-experiences.md).

- [x] Endereço da experiência **Bege Bahia**
      (`https://bernardo-aeonvr.github.io/Geologar-2/`) aprovado para
      publicação. Informar se o endereço oficial mudar.
- [x] Textos da seção e do card Bege Bahia aprovados para publicação.
- [ ] Aprovar a capa do Bege Bahia (enquadramento de um panorama da própria
      experiência) ou enviar uma captura oficial em 16:9 com autorização de
      uso.
- [ ] Segunda experiência: nome oficial, tipo, descrição, endereço `https://`
      e capa (captura real). Enquanto não houver, o card fica “Em breve” ou
      é ocultado.
- [ ] Instituição ou equipe responsável por cada experiência, se deve ser
      citada no card.

## Jurídico

- [ ] Política de privacidade.
- [ ] Termos de uso, quando aplicáveis.
- [ ] Orientações sobre tratamento de dados do formulário de contato (as
      mensagens não são gravadas no site; ficam na caixa de e-mail que as
      recebe e no provedor de envio).

Nenhum texto jurídico foi redigido: os links do mockup (termos, privacidade,
mapa do site, acessibilidade) só serão criados com textos fornecidos ou
validados pela equipe. Criar essas páginas exige uma etapa de
desenvolvimento.

## Administrativo

- [ ] Responsáveis pela edição do conteúdo.
- [ ] Contas autorizadas e papel de cada uma (administrador ou editor).
- [ ] Responsável pela homologação.
- [ ] Homologação de acessibilidade (o projeto aplica boas práticas, mas a
      validação formal de conformidade é responsabilidade da GeoLogar).
