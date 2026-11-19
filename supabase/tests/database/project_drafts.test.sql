-- =============================================================================
-- Rascunhos de projeto sem situação (Etapa 8.5)
--
-- Executar: `npx supabase test db` (local) ou `npx supabase test db --remote`.
-- Tudo roda numa transação desfeita no final (ROLLBACK); contas e projetos
-- abaixo são fixtures temporárias (slugs iniciados por "tst-").
-- =============================================================================

begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

insert into auth.users (id, email, aud, role)
values ('b8500000-0000-4000-8000-000000000001', 'editor@example.test', 'authenticated', 'authenticated');

insert into public.admin_memberships (user_id, role, is_active)
values ('b8500000-0000-4000-8000-000000000001', 'editor', true);

create function pg_temp.act_as(user_id uuid) returns void
language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;

create temporary table ids (name text primary key, id uuid, version timestamptz);
grant all on ids to anon, authenticated;

select is(
  (select is_nullable from information_schema.columns
   where table_schema = 'public' and table_name = 'projects' and column_name = 'project_status'),
  'YES',
  'project_status aceita null'
);

set local role authenticated;
select pg_temp.act_as('b8500000-0000-4000-8000-000000000001');

-- Rascunho sem situação, pelo mesmo caminho do CMS.
insert into ids (name, id, version)
select 'rascunho', p.id, p.updated_at
from public.save_project(
  null, null, 'Projeto a confirmar (teste)', 'tst-projeto-a-confirmar', null, null,
  null, null, null, null, null, null, null, null, null, 0, false, false, '{}'::uuid[]
) as p;

select is(
  (select project_status from public.projects where slug = 'tst-projeto-a-confirmar'),
  null,
  'editor salva rascunho sem situação'
);

-- Publicar sem situação é recusado.
select throws_ok(
  $$ select public.save_project(
       (select id from ids where name = 'rascunho'), (select version from ids where name = 'rascunho'),
       'Projeto a confirmar (teste)', 'tst-projeto-a-confirmar', 'Descrição (teste)', null,
       null, null, null, null, null, null, null, null, null, 0, false, true, '{}'::uuid[]) $$,
  '23514',
  null,
  'publicar sem situação viola projects_published_status'
);

select is(
  (select is_published from public.projects where slug = 'tst-projeto-a-confirmar'),
  false,
  'o rascunho continua não publicado após a recusa'
);

-- Com situação, publica normalmente.
select lives_ok(
  $$ select public.save_project(
       (select id from ids where name = 'rascunho'), (select version from ids where name = 'rascunho'),
       'Projeto a confirmar (teste)', 'tst-projeto-a-confirmar', 'Descrição (teste)', null,
       null, null, 'ongoing', null, null, null, null, null, null, 0, false, true, '{}'::uuid[]) $$,
  'publicar com situação é permitido'
);

-- Projeto publicado não volta a ficar sem situação.
select throws_ok(
  $$ update public.projects set project_status = null where slug = 'tst-projeto-a-confirmar' $$,
  '23514',
  null,
  'projeto publicado não fica sem situação'
);

-- Valores fora da lista continuam recusados.
select throws_ok(
  $$ update public.projects set project_status = 'planned' where slug = 'tst-projeto-a-confirmar' $$,
  '23514',
  null,
  'situação inválida continua recusada'
);

-- Anônimo não vê rascunhos.
reset role;
insert into public.projects (title, slug, is_published)
values ('Outro rascunho (teste)', 'tst-outro-rascunho', false);

set local role anon;
select is(
  (select count(*)::int from public.projects where slug = 'tst-outro-rascunho'),
  0,
  'anônimo não vê rascunho sem situação'
);
select is(
  (select count(*)::int from public.projects where slug = 'tst-projeto-a-confirmar'),
  1,
  'anônimo vê o projeto publicado'
);

reset role;
select * from finish();
rollback;
