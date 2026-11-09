-- =============================================================================
-- RLS, privilégios e integridade de research_lines, projects e
-- project_research_lines (Etapa 7.2)
--
-- Executar: `npx supabase test db` (local) ou `npx supabase test db --remote`.
-- Tudo roda numa transação desfeita no final (ROLLBACK): contas, vínculos,
-- linhas, projetos e publicação abaixo são fixtures temporárias (slugs
-- iniciados por "tst-") e nenhum dado real é alterado.
-- =============================================================================

begin;

create extension if not exists pgtap with schema extensions;

select plan(47);

-- Fixtures ---------------------------------------------------------------------

insert into auth.users (id, email, aud, role)
values
  ('b2000000-0000-4000-8000-000000000001', 'admin@example.test', 'authenticated', 'authenticated'),
  ('b2000000-0000-4000-8000-000000000002', 'editor@example.test', 'authenticated', 'authenticated'),
  ('b2000000-0000-4000-8000-000000000003', 'inativo@example.test', 'authenticated', 'authenticated'),
  ('b2000000-0000-4000-8000-000000000004', 'comum@example.test', 'authenticated', 'authenticated');

insert into public.admin_memberships (user_id, role, is_active)
values
  ('b2000000-0000-4000-8000-000000000001', 'admin', true),
  ('b2000000-0000-4000-8000-000000000002', 'editor', true),
  ('b2000000-0000-4000-8000-000000000003', 'editor', false);

insert into public.research_lines (id, title, slug, is_published)
values
  ('c2000000-0000-4000-8000-000000000001', 'Linha publicada (teste)', 'tst-linha-publicada', true),
  ('c2000000-0000-4000-8000-000000000002', 'Linha rascunho (teste)', 'tst-linha-rascunho', false),
  ('c2000000-0000-4000-8000-000000000003', 'Linha sem vínculos (teste)', 'tst-linha-sem-vinculos', false);

-- Projeto rascunho ligado a uma publicação (dependência fora do CMS de projetos).
insert into public.projects (id, title, slug, project_status, is_published)
values ('d2000000-0000-4000-8000-000000000009', 'Projeto com publicação (teste)', 'tst-projeto-com-publicacao', 'ongoing', false);
insert into public.publications (id, title, slug, authors, is_published)
values ('e2000000-0000-4000-8000-000000000001', 'Publicação (teste)', 'tst-publicacao', 'Teste, A.', true);
insert into public.publication_projects (publication_id, project_id)
values ('e2000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000009');

-- Simula uma requisição autenticada da API (auth.uid() lê o claim `sub`).
create function pg_temp.act_as(user_id uuid) returns void
language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;

-- Ids gerados durante o teste.
create temporary table ids (name text primary key, id uuid, version timestamptz);
grant all on ids to anon, authenticated;

-- Anônimo ------------------------------------------------------------------------

set local role anon;

select is(
  (select count(*)::int from public.research_lines where slug like 'tst-%'),
  1,
  'anon vê somente a linha publicada (rascunhos ocultos)'
);

select throws_ok(
  $$ insert into public.research_lines (title, slug) values ('anon', 'tst-anon') $$,
  '42501', null, 'anon não insere linhas de pesquisa'
);

select throws_ok(
  $$ insert into public.project_research_lines (project_id, research_line_id)
     values ('d2000000-0000-4000-8000-000000000009', 'c2000000-0000-4000-8000-000000000001') $$,
  '42501', null, 'anon não cria vínculos'
);

select throws_ok(
  $$ select public.save_project(null, null, 'anon', 'tst-anon', null, null, null, 'ongoing',
       null, null, null, null, null, null, 0, false, false, '{}') $$,
  '42501', null, 'anon não executa save_project'
);

reset role;

-- Autenticado sem vínculo ---------------------------------------------------------

select pg_temp.act_as('b2000000-0000-4000-8000-000000000004');
set local role authenticated;

select is(
  (select count(*)::int from public.research_lines where slug like 'tst-%'),
  1,
  'usuário sem vínculo não vê rascunhos'
);

select throws_ok(
  $$ insert into public.research_lines (title, slug) values ('comum', 'tst-comum') $$,
  '42501', null, 'usuário sem vínculo não insere'
);

with changed as (
  update public.research_lines set title = 'comum' where slug = 'tst-linha-publicada' returning 1
)
select is((select count(*)::int from changed), 0, 'usuário sem vínculo não atualiza (0 linhas)');

select throws_ok(
  $$ select public.save_project(null, null, 'comum', 'tst-comum', null, null, null, 'ongoing',
       null, null, null, null, null, null, 0, false, false, '{}') $$,
  '42501', null, 'usuário sem vínculo não salva projetos'
);

reset role;

-- Vínculo inativo -----------------------------------------------------------------

select pg_temp.act_as('b2000000-0000-4000-8000-000000000003');
set local role authenticated;

select is(
  (select count(*)::int from public.research_lines where slug like 'tst-%'),
  1,
  'vínculo inativo não vê rascunhos'
);

select throws_ok(
  $$ insert into public.research_lines (title, slug) values ('inativo', 'tst-inativo') $$,
  '42501', null, 'vínculo inativo não insere'
);

with changed as (
  update public.research_lines set title = 'inativo' where slug = 'tst-linha-publicada' returning 1
)
select is((select count(*)::int from changed), 0, 'vínculo inativo não atualiza (0 linhas)');

reset role;

-- Editor ativo --------------------------------------------------------------------

select pg_temp.act_as('b2000000-0000-4000-8000-000000000002');
set local role authenticated;

select is(
  (select count(*)::int from public.research_lines where slug like 'tst-%'),
  3,
  'editor vê linhas publicadas e rascunhos'
);

select is(
  (select count(*)::int from public.publication_projects
   where project_id = 'd2000000-0000-4000-8000-000000000009'),
  1,
  'editor vê vínculos de publicações (checagem de dependências)'
);

select lives_ok(
  $$ insert into public.research_lines (title, slug) values ('Nova linha (teste)', 'tst-nova-linha') $$,
  'editor cria linha de pesquisa'
);

select is(
  (select is_published from public.research_lines where slug = 'tst-nova-linha'),
  false,
  'linha nova começa como rascunho'
);

with changed as (
  update public.research_lines set title = 'Linha editada (teste)', is_published = true
  where slug = 'tst-nova-linha' returning 1
)
select is((select count(*)::int from changed), 1, 'editor edita e publica (1 linha)');

select isnt(
  (select published_at from public.research_lines where slug = 'tst-nova-linha'),
  null,
  'published_at é preenchido pelo trigger ao publicar'
);

select throws_ok(
  $$ update public.research_lines set image_path = '/x.jpg' where slug = 'tst-nova-linha' $$,
  '42501', null, 'editor não altera image_path'
);

select throws_ok(
  $$ update public.research_lines set published_at = now() where slug = 'tst-nova-linha' $$,
  '42501', null, 'editor não altera published_at'
);

select throws_ok(
  $$ update public.research_lines set id = gen_random_uuid() where slug = 'tst-nova-linha' $$,
  '42501', null, 'editor não altera id'
);

select throws_ok(
  $$ insert into public.research_lines (title, slug) values ('Duplicada', 'tst-linha-rascunho') $$,
  '23505', null, 'slug duplicado é recusado'
);

select throws_ok(
  $$ insert into public.research_lines (title, slug, sort_order) values ('Negativa', 'tst-negativa', -1) $$,
  '23514', null, 'ordenação negativa é recusada'
);

with removed as (
  delete from public.research_lines where slug = 'tst-linha-sem-vinculos' returning 1
)
select is((select count(*)::int from removed), 0, 'editor não exclui linhas (0 linhas)');

select is(
  (select count(*)::int from public.research_lines where slug = 'tst-linha-sem-vinculos'),
  1,
  'a linha continua existindo após a tentativa do editor'
);

-- Projeto + vínculos numa única chamada.
insert into ids
select 'p1', id, updated_at
from public.save_project(
  null, null, 'Projeto (teste)', 'tst-projeto', 'Resumo', null, null, 'ongoing',
  '2025-01-10', null, 'Coordenação', null, null, 'https://example.org/projeto', 0, false, false,
  array['c2000000-0000-4000-8000-000000000001', 'c2000000-0000-4000-8000-000000000002']::uuid[]
);

select is(
  (select count(*)::int from public.project_research_lines
   where project_id = (select id from ids where name = 'p1')),
  2,
  'save_project cria o projeto com duas linhas'
);

select is(
  (select is_published from public.projects where id = (select id from ids where name = 'p1')),
  false,
  'projeto criado como rascunho'
);

-- Remove um vínculo e mantém o outro.
update ids set version = (
  select updated_at from public.save_project(
    (select id from ids where name = 'p1'), (select version from ids where name = 'p1'),
    'Projeto (teste)', 'tst-projeto', 'Resumo', null, null, 'completed',
    '2025-01-10', '2025-12-20', 'Coordenação', null, 'Resultado', null, 0, true, false,
    array['c2000000-0000-4000-8000-000000000002']::uuid[]
  )
)
where name = 'p1';

select is(
  (select array_agg(research_line_id) from public.project_research_lines
   where project_id = (select id from ids where name = 'p1')),
  array['c2000000-0000-4000-8000-000000000002']::uuid[],
  'save_project remove apenas o vínculo desmarcado'
);

select is(
  (select project_status from public.projects where id = (select id from ids where name = 'p1')),
  'completed',
  'situação do projeto atualizada'
);

select throws_ok(
  format($$ select public.save_project(%L, '2000-01-01', 'Velho', 'tst-projeto', null, null, null,
    'ongoing', null, null, null, null, null, null, 0, false, false, '{}') $$,
    (select id from ids where name = 'p1')),
  'GL409', null, 'versão desatualizada é recusada (edição simultânea)'
);

select throws_ok(
  format($$ select public.save_project(%L, %L, 'Título que não deve ficar', 'tst-projeto', null, null,
    null, 'ongoing', null, null, null, null, null, null, 0, false, false,
    array['c2000000-0000-4000-8000-0000000000ff']::uuid[]) $$,
    (select id from ids where name = 'p1'), (select version from ids where name = 'p1')),
  '23503', null, 'linha de pesquisa inexistente é recusada (FK)'
);

select is(
  (select title from public.projects where id = (select id from ids where name = 'p1')),
  'Projeto (teste)',
  'falha nos vínculos desfaz também a atualização do projeto (sem gravação parcial)'
);

select throws_ok(
  format($$ select public.save_project(%L, %L, 'Projeto (teste)', 'tst-projeto', null, null, null,
    'ongoing', null, null, null, null, null, null, 0, false, false,
    array['c2000000-0000-4000-8000-000000000001', 'c2000000-0000-4000-8000-000000000001']::uuid[]) $$,
    (select id from ids where name = 'p1'), (select version from ids where name = 'p1')),
  '22023', null, 'linhas repetidas são recusadas'
);

select throws_ok(
  format($$ select public.save_project(%L, %L, 'Projeto (teste)', 'tst-projeto', null, null, null,
    'ongoing', '2025-05-01', '2025-01-01', null, null, null, null, 0, false, false, '{}') $$,
    (select id from ids where name = 'p1'), (select version from ids where name = 'p1')),
  '23514', null, 'data de término anterior ao início é recusada'
);

select throws_ok(
  format($$ select public.save_project(%L, %L, 'Projeto (teste)', 'tst-projeto', null, null, null,
    'draft', null, null, null, null, null, null, 0, false, false, '{}') $$,
    (select id from ids where name = 'p1'), (select version from ids where name = 'p1')),
  '23514', null, 'situação fora do schema (draft) é recusada'
);

select throws_ok(
  $$ select public.save_project(null, null, 'Outro', 'tst-projeto', null, null, null, 'ongoing',
       null, null, null, null, null, null, 0, false, false, '{}') $$,
  '23505', null, 'slug de projeto duplicado é recusado'
);

with removed as (
  delete from public.projects where id = (select id from ids where name = 'p1') returning 1
)
select is((select count(*)::int from removed), 0, 'editor não exclui projetos (0 linhas)');

reset role;

-- Administrador ativo -------------------------------------------------------------

select pg_temp.act_as('b2000000-0000-4000-8000-000000000001');
set local role authenticated;

with removed as (
  delete from public.research_lines where slug = 'tst-linha-publicada' returning 1
)
select is((select count(*)::int from removed), 0, 'admin não exclui linha publicada (0 linhas)');

select throws_ok(
  $$ delete from public.research_lines where slug = 'tst-linha-rascunho' $$,
  '23503', null, 'admin não exclui linha com projetos vinculados'
);

select throws_ok(
  format($$ delete from public.projects where id = %L $$, (select id from ids where name = 'p1')),
  '23503', null, 'admin não exclui projeto com linhas vinculadas'
);

select is(
  (select count(*)::int from public.project_research_lines
   where project_id = (select id from ids where name = 'p1')),
  1,
  'as tentativas recusadas preservam os vínculos'
);

select throws_ok(
  $$ delete from public.projects where slug = 'tst-projeto-com-publicacao' $$,
  '23503', null, 'admin não exclui projeto vinculado a publicação'
);

with removed as (
  delete from public.research_lines where slug = 'tst-linha-sem-vinculos' returning 1
)
select is((select count(*)::int from removed), 1, 'admin exclui linha em rascunho sem vínculos');

-- Desvincula (via save_project) e então exclui o projeto.
select lives_ok(
  format($$ select public.save_project(%L, %L, 'Projeto (teste)', 'tst-projeto', null, null, null,
    'ongoing', null, null, null, null, null, null, 0, false, false, '{}') $$,
    (select id from ids where name = 'p1'), (select version from ids where name = 'p1')),
  'admin remove todos os vínculos do projeto'
);

with removed as (
  delete from public.projects where id = (select id from ids where name = 'p1') returning 1
)
select is((select count(*)::int from removed), 1, 'admin exclui projeto em rascunho sem vínculos');

reset role;

-- Visibilidade pública dos vínculos -----------------------------------------------

-- Projeto publicado ligado a uma linha publicada e a uma em rascunho.
insert into public.projects (id, title, slug, project_status, is_published)
values ('d2000000-0000-4000-8000-000000000001', 'Projeto publicado (teste)', 'tst-projeto-publicado', 'ongoing', true);
insert into public.project_research_lines (project_id, research_line_id)
values
  ('d2000000-0000-4000-8000-000000000001', 'c2000000-0000-4000-8000-000000000001'),
  ('d2000000-0000-4000-8000-000000000001', 'c2000000-0000-4000-8000-000000000002');

set local role anon;

select is(
  (select array_agg(research_line_id) from public.project_research_lines
   where project_id = 'd2000000-0000-4000-8000-000000000001'),
  array['c2000000-0000-4000-8000-000000000001']::uuid[],
  'anon vê apenas o vínculo entre conteúdos publicados'
);

reset role;

-- Permissão revogada com o formulário aberto --------------------------------------

update public.admin_memberships
set is_active = false
where user_id = 'b2000000-0000-4000-8000-000000000002';

select pg_temp.act_as('b2000000-0000-4000-8000-000000000002');
set local role authenticated;

select throws_ok(
  $$ insert into public.research_lines (title, slug) values ('Após revogação', 'tst-revogado') $$,
  '42501', null, 'editor desativado deixa de inserir na hora'
);

with changed as (
  update public.research_lines set title = 'após revogação' where slug = 'tst-linha-rascunho' returning 1
)
select is((select count(*)::int from changed), 0, 'editor desativado deixa de atualizar na hora');

reset role;

select * from finish();

rollback;
