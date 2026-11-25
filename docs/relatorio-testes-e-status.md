# Portal GeoLogar — Relatório de testes e situação do projeto

Data: **23/11/2026** · Último commit: `468e195` · Site:
<https://geologar.plataformageologar.workers.dev>

Resumo consolidado. Os detalhes técnicos estão em
[`qa-report.md`](qa-report.md) (auditoria completa),
[`estado-do-sistema.md`](estado-do-sistema.md) (retrato do sistema) e
[`homologation-checklist.md`](homologation-checklist.md) (roteiro de
homologação para a equipe GeoLogar).

---

## 1. Onde estamos

| | |
|---|---|
| Etapas concluídas | **1 a 10** |
| Etapa atual | Homologação pela GeoLogar (roteiro pronto) |
| Próxima etapa | 11 — **não iniciada**, aguardando briefing |
| Site em produção | No ar, em endereço `workers.dev` (sem domínio próprio) |
| Deploy | Automático a cada push em `main` (Cloudflare Workers) |
| Conteúdo | De **demonstração**; ainda não aprovado pela GeoLogar |
| Problemas críticos ou altos em aberto | **Nenhum** |

O portal está tecnicamente pronto para homologação. O que falta para
lançar depende sobretudo da GeoLogar: conteúdo real, imagens, contas da equipe,
decisão sobre o formulário de contato e domínio próprio (seção 6).

### Linha do tempo

| Data | Entregas |
|---|---|
| 03/11/2026 | Aplicação Next.js, banco Supabase, identidade visual e página inicial, deploy na Cloudflare, páginas institucionais, login da área administrativa |
| 09/11/2026 | CMS da página inicial, linhas de pesquisa, projetos e conteúdo institucional |
| 19/11/2026 | Biblioteca de mídia, conteúdo de demonstração, formulário de contato seguro (oculto), editor visual e CMS personalizável |
| 23/11/2026 | Next.js 16.4.6 (correções de segurança); rascunhos, histórico de versões e páginas personalizadas (Etapa 9.6); auditoria, QA, segurança, SEO e validação em produção (Etapa 10) |

---

## 2. Resultado dos testes

| Verificação | Resultado |
|---|---|
| Lint e TypeScript | ✅ Sem erros |
| Testes unitários | ✅ **97/97** |
| Testes de banco pgTAP (8 arquivos, transação desfeita, nada persiste) | ✅ **346/346** |
| Testes ponta a ponta do visitante (Playwright, local e produção) | ✅ **30 passaram**, 6 ignorados de propósito |
| Build OpenNext e Worker local | ✅ OK |
| Vulnerabilidades em dependências do site (`npm audit --omit=dev`) | ✅ **0** |
| Responsividade (16 páginas × 6 tamanhos de tela = 96 verificações) | ✅ Sem rolagem horizontal |
| Acessibilidade automática básica (14 páginas) | ✅ Sem problemas (não é auditoria WCAG) |
| Fluxo editorial no navegador (conta admin) | ✅ Rascunho, descarte, restauração, páginas, conflito entre abas, editor visual |
| Interface com conta **editor** (produção, sem gravar nada) | ✅ Permissões e avisos corretos |
| Validação em produção após o deploy | ✅ Todas as verificações (seção 4) |

pgTAP por arquivo: segurança do fluxo editorial 23 · fluxo editorial 61 ·
página inicial 17 · biblioteca de mídia 47 · rascunhos de projetos 9 ·
publicações/instituições/configurações 71 · linhas de pesquisa e projetos 47 ·
editor visual e personalização 71.

---

## 3. Problemas encontrados na auditoria

| # | Gravidade | Problema | Situação |
|---|---|---|---|
| 1 | Médio | “Descartar rascunho” deixava o conteúdo descartado nos campos | ✅ Corrigido |
| 2 | Médio | “Publicar” ativo com rascunho igual ao publicado | ✅ Corrigido |
| 3 | Médio | Histórico de versões sem tela de entrada (404) | ✅ Corrigido (índice + item no menu) |
| 4 | Médio | Links de menu para páginas fora do ar não eram sinalizados | ✅ Corrigido (aviso na tela Navegação) |
| 5 | Médio | SEO incompleto (sem sitemap, robots, canonical, Open Graph) | ✅ Corrigido |
| 6 | Baixo | Cabeçalhos de segurança ausentes no site público | ✅ Corrigido |
| 7 | Baixo | Endereço de produção fixo no código | ✅ Corrigido (domínio próprio configurável) |
| 8 | Baixo | Vulnerabilidades só em ferramentas de build/lint | ⏸️ Justificado (não vão para o site; correção quebraria o build) |
| 9 | Baixo | Restaurar revisão usa o conteúdo enviado pelo navegador | 📝 Registrado (sem ganho de permissão) |
| 10 | Baixo | Tipo real da imagem conferido só no navegador | 📝 Registrado (bucket só aceita JPEG/PNG/WebP) |
| 11 | Conteúdo | Fotos das linhas de pesquisa em baixa resolução (~450 × 226 px) | 📋 Para a GeoLogar substituir |
| 12 | Opcional | Revogar funções antigas de gravação (já bloqueadas) | ⏸️ Não feito (defesa extra) |

---

## 4. Segurança e produção

**Permissões testadas**

| Perfil | Comportamento verificado |
|---|---|
| Visitante | Não vê rascunhos, histórico nem páginas não publicadas; `/admin` leva ao login |
| Conta sem vínculo / inativa | Não vê documentos nem cria páginas |
| Editor | Edita e publica conteúdo editorial; **não** altera menus, aparência, informações institucionais nem redes sociais; não exclui mídia; não arquiva páginas publicadas |
| Administrador | Controle total; links perigosos (`javascript:`, `data:`) recusados no menu |

**Teste com a conta editor na interface (produção):** menu e papel corretos;
telas restritas em modo somente consulta com aviso; no editor visual, o
cabeçalho fica bloqueado, o banner é editável, a alteração aparece na hora e
pode ser descartada; nenhum rascunho ou revisão gravado no banco.

**Validação em produção**

| Verificação | Resultado |
|---|---|
| 8 páginas públicas | 200 |
| Endereços inexistentes e página arquivada | 404 |
| `/admin` sem login | Redireciona para o login, sem cache |
| Cabeçalhos de segurança | Presentes |
| `robots.txt` e `sitemap.xml` | Corretos (13 endereços, só conteúdo publicado) |
| Formulário de contato | Desativado (503), como esperado |
| Segredos no código servido | Nenhum |

---

## 5. Desempenho (produção)

Medido com Chromium headless, mediana de 3 execuções, cache vazio. Celular com
rede e CPU limitadas.

| Página | Desktop (LCP) | Celular (LCP) | CLS |
|---|---|---|---|
| Início | 572 ms | 1,50 s | 0 |
| Pesquisa | 808 ms | 1,78 s | 0 |
| Linha de pesquisa | 764 ms | 1,89 s | 0 |
| Projetos | 604 ms | 1,42 s | 0 |
| Contato | 660 ms | 1,53 s | 0 |

Sem deslocamento de layout. O tempo é dominado pela resposta do servidor e
do banco (sem cache, por decisão do projeto). A Etapa 10 não mudou a
velocidade: as diferenças em relação à medição anterior vêm da variação do
servidor “frio”.

---

## 6. O que ainda não foi testado

- Salvar e publicar pela interface com a conta **editor** (coberto pelos
  testes de banco; não feito para não alterar conteúdo real).
- Login com conta **desativada** pela interface (coberto pelos testes de banco).
- Envio real do formulário de contato (desativado em produção).
- Upload real de imagens (para não enviar arquivos ao bucket público).
- Lighthouse, leitor de tela e auditoria completa de contraste.

---

## 7. Pendências

### Da GeoLogar (bloqueiam o lançamento)

- [ ] Homologar o portal seguindo o
      [roteiro de homologação](homologation-checklist.md).
- [ ] Textos finais e aprovação do conteúdo.
- [ ] Fotos reais das 6 linhas de pesquisa (mínimo 1600 px de largura, com
      direitos de uso).
- [ ] Logotipos oficiais das instituições parceiras.
- [ ] Projetos, publicações, instituições e redes sociais reais (hoje: 0
      publicados).
- [ ] Dados de contato oficiais e decisão sobre o formulário (quem recebe,
      endereço de envio, credenciais Resend e Turnstile).
- [ ] Domínio próprio.
- [ ] Contas individuais da equipe (admin/editor).

### Técnicas (não bloqueiam)

- Revogar as funções antigas de gravação (melhoria opcional).
- Atualizar ferramentas de build quando saírem versões corrigidas.
- Acompanhar o suporte experimental do OpenNext a middleware Node.js.

### Não implementado (candidatos a etapas futuras)

- Arrastar e soltar no editor (hoje: botões subir/descer).
- Página individual de publicação e agendamento de publicação.
- Histórico de versões para projetos, linhas, publicações e instituições.
- Gestão de usuários pelo painel.

### Ação recomendada agora

- Trocar as senhas das contas que foram compartilhadas durante os testes.
- Decidir se a conta de teste com papel editor continua ativa.
