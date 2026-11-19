# Manifesto da população inicial (Etapa 8.5)

Registro do que foi feito com os materiais de referência recebidos em
19/11/2026: o que foi importado, onde está associado e o que continua
pendente. **Importado não significa aprovado**: nenhum item abaixo foi
validado formalmente pela equipe GeoLogar. O que falta fornecer ou aprovar
está em [`content-handover.md`](content-handover.md).

## Materiais recebidos

| Material | Situação |
|---|---|
| Imagem de referência da homepage (`WhatsApp Image 2026-11-19 at 14.15.36.jpeg`, 1024 × 1536) | Analisada. É o mesmo arquivo que `home page geologar.jpg`. Usada como referência visual, não como layout. |
| Pacote `GeoLogar_Imagens_e_Logos_PNG.zip` (41 PNG + `LEIA_ME.txt`) | Inventariado (abaixo). |
| Briefing (`Briefing para criação da homepage GeoLogar`) | Disponível em `.docx` (não em PDF); conteúdo usado como referência editorial. |
| `LogoGeologar.png` | **Não localizado** no computador de desenvolvimento. Mantido o logotipo já versionado em `src/assets/brand/`. |

### Origem e limitações do pacote

Segundo o `LEIA_ME.txt`, os PNG foram recortados da imagem de referência
(1024 × 1536) e ampliados por interpolação Lanczos, o que não recupera
detalhes: a resolução real de cada recorte é de ~150–230 px de largura. Além
disso, a análise visual mostrou que:

- as 6 imagens de linhas e as 3 de projetos têm o **título do mockup gravado
  na imagem**;
- o banner (`Banner_paisagem_geologica.png`) tem o nome, o título, o subtítulo
  e os **dois botões gravados na imagem**;
- o rodapé (`Rodape_paisagem.png`) traz o layout inteiro do rodapé, com
  **contatos fictícios** (telefone com "XXXX");
- os logotipos de instituições estão **cortados** (CBPM, CETEM, CNPq,
  ASSOBEGE, nomes abaixo dos brasões) e vários têm **letras deformadas**
  (CIENAM, MGB, SDE "RANIA"): não são reproduções fiéis das marcas;
- `GeoLogar_cabecalho.png` e `GeoLogar_rodape.png` são um **desenho diferente**
  do logotipo oficial versionado (globo, estratos e folhas redesenhados).

A imagem de referência aparenta ter sido gerada como estudo visual; as
"fotografias" não documentam pesquisas, equipes ou locais reais da rede. Os
direitos de uso de todos os arquivos precisam ser confirmados.

## Preparação dos recortes

Só as fotografias com área útil sem texto foram aproveitadas. O script
[`scripts/prepare-demo-media.mjs`](../scripts/prepare-demo-media.mjs) gera os
recortes de forma reproduzível: **somente corte** (remove a faixa com o
título e 6 px de borda da captura), sem redimensionar, filtrar ou alterar
cores. A saída fica fora do repositório.

```powershell
node scripts/prepare-demo-media.mjs "<pasta Imagens do pacote>" "<pasta de saída>"
```

## Importação na biblioteca de mídia

Os 9 recortes foram enviados em 19/11/2026 pelo fluxo normal de
`/admin/midias` (sessão de administrador, URL assinada, nome
`uploads/<uuid>.png`, metadados com o nome original). Nenhuma chave
`service_role`, migration ou API paralela foi usada.

**Idempotência:** antes de enviar, compara-se o nome original de cada
recorte com os já listados na biblioteca e só os ausentes são enviados. A
segunda execução encontrou os 9 e não enviou nada. Rascunhos de projeto usam
slugs únicos: recriar um projeto com o mesmo título é recusado ("Já existe um
projeto com este slug").

Para repetir em outro ambiente: gerar os recortes, abrir `/admin/midias`,
conferir pela busca se cada nome já existe, enviar só os ausentes e associar
pelos formulários (passo a passo em [`media-library.md`](media-library.md)).

## Correspondência arquivo → conteúdo

Legenda — **Importação**: enviado à biblioteca ou não. **Aprovação**:
nenhuma aprovação formal até aqui.

### Fotografias aproveitadas (9)

| Arquivo original | Recorte (px) | Destino | Registro | Visibilidade | Aprovação |
|---|---|---|---|---|---|
| `Linha_geologia_geodiversidade.png` | 447 × 226 | Imagem da linha | Geologia e Geodiversidade | Pública (linha publicada) | Pendente: direitos e imagem oficial |
| `Linha_recursos_minerais.png` | 453 × 226 | Imagem da linha | Recursos Minerais | Pública | Pendente |
| `Linha_geologia_ambiental.png` | 453 × 226 | Imagem da linha | Geologia Ambiental | Pública | Pendente |
| `Linha_sustentabilidade_economia_circular.png` | 453 × 226 | Imagem da linha | Sustentabilidade e Economia Circular | Pública | Pendente |
| `Linha_patrimonio_geologico.png` | 453 × 226 | Imagem da linha | Patrimônio Geológico | Pública | Pendente |
| `Linha_geotecnologias_geoprocessamento.png` | 441 × 226 | Imagem da linha | Geotecnologias e Geoprocessamento | Pública | Pendente |
| `Projeto_DETEC_BEGE.png` | 507 × 270 | Imagem do projeto | DETEC BEGE – FASE II (rascunho) | Só na prévia protegida | Pendente |
| `Projeto_ACV_fluxo_massas.png` | 504 × 270 | Imagem do projeto | ACV e Fluxo de Massas (rascunho) | Só na prévia protegida | Pendente |
| `Projeto_EXPOGEO_VIRTUAL.png` | 501 × 270 | Imagem do projeto | EXPOGEO Virtual (rascunho) | Só na prévia protegida | Pendente |

A publicação das imagens das linhas foi uma decisão do responsável pelo
desenvolvimento para a versão de demonstração. A correspondência segue o nome
do arquivo e o título gravado em cada recorte — nenhuma associação foi
inferida por semelhança visual. Qualidade: baixa resolução de origem; nos
cards (~380 px) o resultado é aceitável, mas as imagens não suportam
ampliação (página de detalhe, banner).

### Não importados (32)

| Arquivo(s) | Motivo | Necessário |
|---|---|---|
| `Banner_paisagem_geologica.png` | Título, subtítulo e botões gravados; a área sem texto tem ~230 px reais de largura. | Fotografia oficial para o banner (mín. ~2000 px de largura). |
| `Banner_rochas_textura.png`, `Banner_rocha_clara.png`, `Banner_mineracao.png`, `Banner_lamina_petrografica.png`, `Banner_microscopio.png`, `Banner_geotecnologia.png` | Fatias da colagem diagonal (bordas inclinadas, ~140 px reais); o briefing pede evitar a colagem. | — |
| `Rodape_paisagem.png` | Layout completo do rodapé com contatos fictícios gravados. | — |
| 22 logotipos de instituições (`ASSOBEGE`, `Associacao_Astronomos_Bahia`, `Brock_University`, `CAPES`, `CBPM`, `CETEM`, `CIENAM_UFBA`, `CNPq`, `FAPESB`, `IFBA`, `Museu_Geologico_Bahia`, `SDE_Bahia`, `UEFS`, `UESC`, `UFBA`, `UFC`, `UFRB`, `UFRJ`, `UFS`, `UNEB`, `University_of_Toronto`, `Western_University`) | Cortados, com fundo da captura e letras deformadas; a presença no mockup não confirma vínculo. | Arquivos oficiais de cada instituição e confirmação do vínculo. |
| `GeoLogar_cabecalho.png`, `GeoLogar_rodape.png` | Desenho diferente do logotipo oficial versionado. | Confirmação do logotipo oficial (de preferência vetorial). |

## Instituições sugeridas pelo mockup

Nenhuma instituição ou categoria foi cadastrada. A relação abaixo só
registra o que aparece na referência, para conferência da equipe:

| Instituição (como no mockup) | Grupo no mockup | Categoria sugerida (briefing) | Validação |
|---|---|---|---|
| UFBA, CIENAM/UFBA, UFRB, UESC, UFRJ, UNEB, UEFS, IFBA, UFS, UFC | Parceiras (universidades) | Universidades e instituições de pesquisa | Pendente |
| CBPM, CETEM | Colaboradoras (pesquisa) | Universidades e instituições de pesquisa | Pendente |
| SDE Bahia, Museu Geológico da Bahia, Associação dos Astrônomos da Bahia, CAPES, CNPq, FAPESB | Apoio institucional | Apoio institucional e financiamento | Pendente |
| ASSOBEGE | Empresarial | Parceiros empresariais | Pendente |
| University of Toronto, Western University, Brock University | Internacionais | Cooperação internacional | Pendente |

## Conteúdo textual

| Conteúdo | Origem | Situação |
|---|---|---|
| Banner (título, descrição, botões) | Briefing; já estava no banco | Mantido; exibido no site |
| Apresentação da rede e quatro pilares | Briefing; já estava no banco e no código | Mantido; exibido no site |
| Seis linhas de pesquisa (títulos e descrições curtas) | Briefing; já estavam publicadas | Mantidas (sem duplicatas); só ganharam imagem |
| Três projetos | Mockup e briefing (nomes e descrição de uma frase) | Rascunhos com situação "A confirmar"; demais campos vazios |
| Publicações do mockup | Mockup | Não importadas (títulos, autores e DOI precisam ser conferidos) |
| Contatos do mockup (e-mail, telefone com "XXXX", localização) | Mockup | Não usados |
| Links jurídicos do mockup (termos, privacidade, mapa do site, acessibilidade) | Mockup | Não criados: dependem de textos do cliente |

## Rascunhos de projeto criados

| Título | Slug | Descrição curta (do mockup) | Situação | Imagem |
|---|---|---|---|---|
| DETEC BEGE – FASE II | `detec-bege-fase-ii` | Desenvolvimento de tecnologias para os resíduos do mármore Bege Bahia. | A confirmar | Recorte do mockup |
| ACV e Fluxo de Massas | `acv-e-fluxo-de-massas` | Análise de ciclo de vida e fluxo de massas na cadeia de rochas ornamentais da Bahia. | A confirmar | Recorte do mockup |
| EXPOGEO Virtual | `expogeo-virtual` | Divulgação das geociências em ambiente virtual. | A confirmar | Recorte do mockup |

Não publicados, não destacados e sem linha de pesquisa vinculada (a
correspondência não foi inferida). Coordenação, período, financiamento,
resultados e descrição completa ficaram vazios. Aparecem apenas em
`/admin/projetos` e na prévia protegida `/admin/demonstracao`.
