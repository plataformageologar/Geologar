# Deploy — GeoLogar

O portal é publicado no **Netlify**, que oferece suporte nativo ao Next.js
(App Router, Server Components, cache e revalidação). Não há `netlify.toml`
nem `output: "export"`: o Netlify detecta o framework e configura o build
sozinho.

## Visão geral

| Item               | Valor                                              |
| ------------------ | -------------------------------------------------- |
| Repositório        | `plataformageologar/Geologar` (GitHub)             |
| Branch de produção | `main` (cada push publica uma nova versão)         |
| Comando de build   | `npm run build` (detectado automaticamente)        |
| Diretório publicado| `.next` (detectado automaticamente)                |
| Node.js            | versão do `.nvmrc` (22)                            |
| Domínio            | subdomínio `*.netlify.app` — domínio oficial ainda **não** configurado |

## Variáveis de ambiente

Cadastre em *Project configuration → Environment variables* (escopo: Builds e
Functions). Os valores estão no painel do Supabase, em *Project Settings → API
Keys*; **nunca** os escreva no repositório nem em documentação.

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

- Ambas são públicas por natureza (vão para o navegador); a proteção dos
  dados é feita pelo RLS do banco.
- **Não** cadastre `SUPABASE_SECRET_KEY` nem a `service_role`: a homepage não
  precisa delas. Quando alguma funcionalidade de servidor exigir a chave
  secreta, ela deve ser cadastrada sem o prefixo `NEXT_PUBLIC_` e marcada como
  secreta no Netlify.
- Variáveis `NEXT_PUBLIC_*` são embutidas no build: depois de alterá-las,
  faça um novo deploy (*Deploys → Trigger deploy → Deploy site*).

## Primeiro deploy (importação do projeto)

1. No Netlify: *Add new project → Import an existing project → GitHub*.
2. Autorize o acesso à organização `plataformageologar`, se solicitado, e
   escolha o repositório `Geologar`.
3. Branch to deploy: `main`. Mantenha os campos de build sugeridos pelo
   Netlify (framework **Next.js** detectado).
4. Em *Environment variables*, adicione as duas variáveis acima.
5. Clique em *Deploy*. Ao final, o site fica disponível em
   `https://<nome>.netlify.app`.

## Atualização de conteúdo

O conteúdo vem do Supabase com cache de 5 minutos (perfil `content` em
`next.config.ts`). Alterações publicadas no banco aparecem no site em até
~5 minutos, sem novo deploy. Mudanças de código são publicadas a cada push na
`main`.

## Checklist pós-deploy

- [ ] Build concluído sem erros no log do Netlify.
- [ ] Homepage carrega com o conteúdo do banco (hero, A Rede, linhas de
      pesquisa, contato).
- [ ] Seções sem conteúdo publicado não aparecem, nem seus links no menu.
- [ ] Sem erros no console do navegador nem falhas de hidratação.
- [ ] Nenhuma requisição com erro (4xx/5xx) na aba Network.
- [ ] Nenhuma chave secreta no HTML/JS publicado (buscar por `sb_secret`).
- [ ] Layout conferido em 1280×720, 1440×900, 1024×768, 768×1024, 390×844 e
      375×812, sem rolagem horizontal.
- [ ] Menu mobile abre, fecha (Esc) e navega pelas âncoras.

## Domínio oficial

Ainda não configurado. Quando for, a troca de DNS deve ser planejada à parte
(*Domain management → Add a domain*), sem interromper o site atual.

## Problemas comuns

| Sintoma                                   | Causa provável                                     |
| ----------------------------------------- | -------------------------------------------------- |
| Site publicado só com hero, A Rede e contato (sem linhas de pesquisa); log de build com `Supabase não configurado` | Variáveis não cadastradas no Netlify: cadastre e faça novo deploy |
| Mesmo sintoma, com outro erro `[supabase] ...` no log | Leitura do banco falhou (projeto pausado, chave inválida): verifique o Supabase |
| Conteúdo novo não aparece                 | Aguarde a revalidação (até ~5 min)                 |
