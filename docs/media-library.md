# Biblioteca de mídia — GeoLogar

Imagens do portal (fotos de projetos e linhas de pesquisa, banner da homepage,
logotipos de instituições, logotipo do cabeçalho e favicon) ficam no
**Supabase Storage**, num bucket público próprio. O CMS envia, lista, associa e
exclui esses arquivos sempre com a **sessão do usuário** e as políticas de RLS:
não há `service_role`, chave secreta, R2, Cloudflare Images nem API de arquivos
no Worker.

Rota: **`/admin/midias`** ("Biblioteca de mídia"), no grupo Conteúdo da
navegação. O painel (`/admin`) mostra o total real de arquivos.

## Arquitetura

```
src/app/admin/(protected)/midias/page.tsx        Página da biblioteca (Server Component)
src/components/admin/media/media-browser.tsx      Grade, busca, filtro, detalhes, exclusão
src/components/admin/media/media-uploader.tsx     Seleção/arraste, verificação e envio
src/components/admin/media/media-picker.tsx       Janela de seleção (usada pelos formulários)
src/components/admin/media/media-field.tsx        Campo de imagem dos formulários do CMS
src/lib/admin/media-actions.ts                    Server Actions: listar, preparar envio, uso, excluir
src/lib/queries/admin-media.ts                    Leituras (list_media, media_usage)
src/lib/media/config.ts                           Bucket, limites, tipos, URL pública
src/lib/media/file-check.ts                       Verificação do arquivo no navegador
src/lib/media/references.ts                       Validação da referência enviada pelos formulários
src/lib/queries/shared.ts                         resolveImageSrc()
supabase/migrations/20261119120000_enable_media_library.sql
supabase/tests/database/media_library_rls.test.sql
```

A fonte de verdade é o próprio Storage (`storage.objects`): não existe tabela
duplicada de mídia. Nome original, largura e altura ficam nos metadados do
objeto (`user_metadata`), gravados no envio.

## Storage

| Item | Valor |
|---|---|
| Bucket | `geologar-media` |
| Visibilidade | Público (leitura por URL, sem login) |
| Formatos | JPEG, PNG e WebP (`image/jpeg`, `image/png`, `image/webp`) |
| Tamanho máximo | 5 MB por arquivo (`file_size_limit` do bucket) |
| Maior lado | 8000 px (verificado no navegador e na Server Action) |
| Estrutura | `uploads/<uuid v4>.<jpg\|png\|webp>` |
| Cache | `Cache-Control: max-age=86400` (1 dia) |

SVG, GIF e outros formatos são recusados. O nome do objeto é gerado no
servidor (UUID): o nome original nunca vira caminho, dois arquivos com o mesmo
nome não colidem e nada é sobrescrito. **Tudo o que é enviado fica público**;
não use a biblioteca para documentos pessoais ou imagens restritas.

### Fluxo de envio

1. O navegador verifica cada arquivo: extensão, tamanho, **tipo real pelo
   conteúdo** (assinatura JPEG/PNG/WebP, não o `file.type`), correspondência
   entre extensão e conteúdo e dimensões (`createImageBitmap`).
2. A pessoa revisa a lista (pré-visualização local) e confirma o envio.
3. Para cada arquivo, a Server Action `prepareMediaUpload` confere sessão e
   papel (admin ou editor ativo), revalida tipo/tamanho/dimensões, gera o nome
   e pede ao Storage uma **URL de envio assinada** com a sessão do usuário — a
   policy de INSERT do bucket é avaliada nesse momento.
4. O navegador envia o arquivo direto ao Storage (`uploadToSignedUrl`, sem
   `upsert`). O arquivo não passa pelo Worker. O bucket aplica de novo o
   limite de 5 MB e a lista de tipos.
5. Cada arquivo mostra o resultado real (verificando, enviando, enviado,
   recusado com o motivo). Não há barra de progresso simulada; o botão fica
   desabilitado durante o envio (sem envio duplicado).

A sessão do CMS fica em cookies `httpOnly`; por isso o navegador não fala com o
Storage com a sessão do usuário — a URL assinada é a autorização de um único
envio, para um caminho definido pelo servidor.

### Políticas (`storage.objects`, somente este bucket)

| Operação | Quem | Regra |
|---|---|---|
| SELECT (listar metadados) | admin e editor ativos | `bucket_id = 'geologar-media'` |
| INSERT | admin e editor ativos | nome no formato `uploads/<uuid>.<ext>` |
| UPDATE | ninguém | sem policy: não há sobrescrita nem renomeação |
| DELETE | somente admin ativo | `media_object_deletable(name)`: arquivo sem uso |

O download público pela URL não depende dessas policies (bucket público).
Visitantes sem login não listam, não enviam, não sobrescrevem e não excluem.

## Referências no banco

As colunas guardam **a referência relativa ao bucket**, nunca uma URL:

| Tabela | Coluna | Texto alternativo |
|---|---|---|
| `homepage_content` | `hero_image_path` | `hero_image_alt` |
| `research_lines` | `image_path` | `image_alt` |
| `projects` | `image_path` | `image_alt` |
| `institutions` | `logo_path` | `logo_alt` |
| `site_settings` | `logo_path` | — (usa o nome do site) |
| `site_settings` | `favicon_path` | — |

Valores aceitos (constraint `*_path_format` → `is_valid_image_reference`):

- `null` (sem imagem);
- objeto da biblioteca: `uploads/<uuid>.<jpg|png|webp>`;
- caminho local legado do site, começando com `/` (ex.: `/images/x.webp`),
  sem `..` nem `//`.

URLs (`https://…`), caminhos com `..` e qualquer outro formato são recusados
pelo banco (erro 23514) e pela Server Action. Ao gravar uma referência da
biblioteca, o trigger `*_media_references` confere que o objeto **existe** no
bucket (erro `GL422`, exibido como "A imagem selecionada não está mais na
biblioteca…").

Com imagem, o texto alternativo é obrigatório; sem imagem, é gravado como
`null` na mesma operação (imagem e alt sempre juntos).

### `resolveImageSrc()`

| Entrada | Saída |
|---|---|
| caminho local (`/…`) | o próprio caminho |
| `uploads/<uuid>.<ext>` | `https://<projeto>.supabase.co/storage/v1/object/public/geologar-media/uploads/…` |
| `null` | `null` (o componente usa o fallback) |
| qualquer outro valor | `null` + aviso no log (fallback seguro) |

O host vem sempre de `NEXT_PUBLIC_SUPABASE_URL`, nunca do banco.

## Componentes

- **`MediaBrowser`**: grade com miniatura (sem corte), nome original, tipo,
  tamanho, dimensões, data e selo "Em uso (n)"/"Sem uso"; busca pelo nome,
  filtro "Somente imagens sem uso" e "Carregar mais" (24 por página).
  Detalhes: imagem ampliada, metadados, caminho, URL pública com "Copiar URL",
  lista de conteúdos que usam o arquivo (com link para a edição) e exclusão.
- **`MediaUploader`**: múltiplos arquivos por seleção ou arraste; verificação,
  pré-visualização local e envio sob confirmação.
- **`MediaPicker`**: janela modal com a biblioteca (e envio de novas
  imagens). A escolha só vale ao clicar em "Usar imagem selecionada";
  "Cancelar", Esc ou fechar mantêm o valor anterior. A imagem atual vem
  pré-selecionada.
- **`MediaField`**: pré-visualização, "Selecionar imagem" / "Substituir
  imagem" / "Remover imagem", orientação de formato e o campo de texto
  alternativo. Nada é gravado até o formulário ser salvo; "Cancelar
  alterações" volta à imagem salva. **Remover apenas desfaz a associação**: o
  arquivo continua na biblioteca.

Os componentes não usam `<form>` próprio (ficam dentro dos formulários do
CMS): todos os botões são `type="button"` e Enter na busca não envia o
formulário externo.

Acessibilidade: diálogos nativos (`<dialog>` modal, foco preso, Esc fecha,
título associado), botões com nome acessível, estado de seleção por
`aria-pressed` **e** pelo selo "Selecionada" (não só cor), mensagens em
regiões `aria-live`/`role="alert"`, erro do campo associado por
`aria-describedby` e foco no primeiro erro.

## Integrações

| Onde | Campo | Quem edita | Exibição no site | Sem imagem |
|---|---|---|---|---|
| `/admin/homepage` | Imagem de fundo do banner | admin e editor | `object-cover` com camada escura | fundo padrão com curvas de nível |
| Linhas de pesquisa | Imagem | admin e editor | cards e `/pesquisa/[slug]` | ilustração padrão |
| Projetos | Imagem (via `save_project`, atômico) | admin e editor | cards, `/projetos/[slug]` e destaques da homepage | ilustração padrão |
| Instituições | Logotipo | admin e editor | `/instituicoes` e seção da homepage, `object-contain` sobre fundo branco | nome ou sigla |
| `/admin/configuracoes` | Logotipo do cabeçalho | somente admin | cabeçalho, altura fixa, proporção original | logotipo oficial do código |
| `/admin/configuracoes` | Favicon | somente admin | `<link rel="icon">` | `public/brand/favicon.png` |

Logotipos nunca são cortados, distorcidos ou recoloridos (`object-contain`,
altura fixa e largura proporcional). O rodapé continua com o logotipo circular
oficial do código.

### Favicon e precedência no Next.js 16

Um arquivo `src/app/icon.png` tem prioridade sobre `metadata.icons` e
impediria a troca pelo CMS. Por isso o ícone oficial foi **movido** (sem
alteração) para `public/brand/favicon.png`, e o layout raiz define
`icons` em `generateMetadata`: favicon configurado em `site_settings` ou, sem
ele, o arquivo oficial. Navegadores guardam favicons em cache: a troca pode
levar algum tempo para aparecer.

## Exclusão segura

- Somente **administradores**; nunca em massa (um arquivo por vez, com
  confirmação: miniatura, nome, aviso de irreversibilidade, "Cancelar" e
  "Excluir permanentemente").
- Arquivo em uso em qualquer uma das 6 colunas: o botão fica desabilitado e
  aparece a mensagem "Esta imagem está sendo utilizada por um ou mais
  conteúdos. Remova suas associações antes de excluí-la.", com a lista dos
  conteúdos.
- A Server Action repete a verificação; o banco também recusa (policy de
  DELETE com `media_object_deletable`).
- Substituir ou remover a imagem de um conteúdo **não exclui** o arquivo
  antigo, e excluir um conteúdo não exclui suas imagens. Arquivos sem uso
  nunca são apagados automaticamente: use o filtro "Somente imagens sem uso"
  para revisá-los.

**Concorrência — o que é e o que não é garantido.** A exclusão (policy) e a
associação (trigger) disputam a mesma trava por arquivo
(`pg_advisory_xact_lock`) e, depois de obtê-la, consultam o estado já
confirmado (funções `VOLATILE`, isolamento READ COMMITTED). Assim, uma
associação e uma exclusão simultâneas do mesmo arquivo não terminam as duas:
ou a exclusão é recusada por uso, ou a associação falha com `GL422`. Essa
garantia vale para a linha de `storage.objects`, que a API do Storage remove
com RLS **antes** de apagar o arquivo físico. Não há uma transação única que
inclua o armazenamento físico, nem garantia sobre cópias já em cache: após a
exclusão, navegadores e CDN podem servir o arquivo por até 1 dia
(`max-age=86400`).

## Next.js e Cloudflare

- `next.config.ts` → `images.remotePatterns` com **um único padrão**: o host do
  projeto Supabase (de `NEXT_PUBLIC_SUPABASE_URL`) e o caminho
  `/storage/v1/object/public/geologar-media/uploads/**`. Sem curingas de host.
- No Worker, `/_next/image` usa o binding `IMAGES` (já existente em
  `wrangler.jsonc`) para otimizar as imagens remotas.
- Renderização continua `force-dynamic`; sem `cacheComponents`,
  `partialPrefetching`, ISR, R2 ou KV.

## Testes

- `supabase/tests/database/media_library_rls.test.sql` (pgTAP, 47 asserções):
  configuração do bucket, formato de nomes e referências, matriz anônimo /
  usuário sem vínculo / vínculo inativo / editor / admin para SELECT, INSERT,
  UPDATE e DELETE, sobrescrita e caminho duplicado, associação nas 6 colunas,
  objeto inexistente (`GL422`), URL e `..` recusados, alt obrigatório, editor
  sem acesso ao logotipo do site, `save_project` com imagem e rollback
  atômico, `media_usage`, `list_media` (total, uso, filtro, busca), exclusão
  bloqueada em uso e permitida sem uso, remoção da associação mantendo o
  arquivo e revogação de vínculo.
- As suítes de homepage, linhas/projetos e publicações/instituições/
  configurações foram ajustadas para a nova semântica das colunas de imagem.
- Os testes rodam em transação revertida: não deixam dados no banco remoto.

## Como adicionar uma imagem a um projeto

1. Prepare a foto: JPEG ou WebP, horizontal (16:9), com pelo menos
   1600 × 900 px e no máximo 5 MB.
2. No painel, abra **Projetos** e clique em **Editar** no projeto (ou crie um
   novo).
3. Na seção **Imagem**, clique em **Selecionar imagem**.
4. Na janela que abrir, escolha uma imagem da biblioteca ou clique em
   **Enviar novas imagens**, arraste a foto (ou use **Escolher arquivos**) e
   clique em **Enviar imagem**. A imagem enviada já fica selecionada.
5. Clique em **Usar imagem selecionada**.
6. Preencha o **Texto alternativo da imagem** (o que a foto mostra, para quem
   usa leitor de tela).
7. Clique em **Salvar alterações**. Se o projeto estiver publicado, o site já
   mostra a nova imagem.

Para trocar, use **Substituir imagem**; para tirar a imagem do projeto, use
**Remover imagem** e salve. Em ambos os casos o arquivo antigo continua na
biblioteca e pode ser excluído depois em **Biblioteca de mídia** (se não for
usado em nenhum outro lugar).

## População inicial (Etapa 8.5)

Em 19/11/2026 a biblioteca recebeu 9 recortes provisórios da referência
visual da homepage (6 de linhas de pesquisa e 3 de projetos), gerados por
[`scripts/prepare-demo-media.mjs`](../scripts/prepare-demo-media.mjs) — só
corte, sem redimensionar nem filtrar — e enviados pelo fluxo normal desta
página. Os 32 arquivos restantes do pacote (banner com texto gravado, fatias
da colagem, rodapé com contatos fictícios e logotipos cortados/deformados)
não foram importados. A correspondência arquivo → registro, a qualidade e a
situação de cada item estão em
[`initial-content-manifest.md`](initial-content-manifest.md). Ao receber as
fotografias oficiais, use **Substituir imagem** em cada registro; os recortes
ficam sem uso e podem ser excluídos.

## Limitações

- Sem recorte, rotação, compressão ou conversão no navegador: envie a imagem
  já no tamanho adequado.
- Sem pastas, tags, edição do nome original ou exclusão em massa.
- Busca apenas pelo nome original do arquivo.
- Arquivos sem uso não são limpos automaticamente.
- Imagens são públicas por URL, mesmo as ainda não associadas a conteúdo.
