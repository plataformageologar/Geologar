-- =============================================================================
-- RLS e privilégios de public.homepage_content (Etapa 7.1)
--
-- Executar: `npx supabase test db` (local) ou `npx supabase test db --remote`.
-- Tudo roda numa transação desfeita no final (ROLLBACK): as contas e vínculos
-- abaixo são fixtures temporárias e nenhuma alteração permanece no banco.
-- =============================================================================

begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

-- Fixtures (UUIDs fixos usados apenas neste teste) -----------------------------

insert into auth.users (id, email, aud, role)
values
  ('a1000000-0000-4000-8000-000000000001', 'admin@example.test', 'authenticated', 'authenticated'),
  ('a1000000-0000-4000-8000-000000000002', 'editor@example.test', 'authenticated', 'authenticated'),
  ('a1000000-0000-4000-8000-000000000003', 'inativo@example.test', 'authenticated', 'authenticated'),
  ('a1000000-0000-4000-8000-000000000004', 'comum@example.test', 'authenticated', 'authenticated');

insert into public.admin_memberships (user_id, role, is_active)
values
  ('a1000000-0000-4000-8000-000000000001', 'admin', true),
  ('a1000000-0000-4000-8000-000000000002', 'editor', true),
  ('a1000000-0000-4000-8000-000000000003', 'editor', false);

-- O teste assume o registro único da homepage já existente.
select is(
  (select count(*)::int from public.homepage_content),
  1,
  'homepage_content tem exatamente um registro'
);

create temporary table original on commit drop as
  select hero_title from public.homepage_content;
grant select on original to anon, authenticated;

-- Simula uma requisição autenticada da API (auth.uid() lê o claim `sub`).
create function pg_temp.act_as(user_id uuid) returns void
language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;

-- Anônimo ------------------------------------------------------------------------

set local role anon;

select is(
  (select count(*)::int from public.homepage_content),
  1,
  'anon lê a homepage'
);

select throws_ok(
  $$ update public.homepage_content set hero_title = 'anon' $$,
  '42501',
  null,
  'anon não atualiza a homepage'
);

reset role;

-- Autenticado sem vínculo e com vínculo inativo -------------------------------

select pg_temp.act_as('a1000000-0000-4000-8000-000000000004');
set local role authenticated;

with changed as (
  update public.homepage_content set hero_title = 'comum' returning 1
)
select is((select count(*)::int from changed), 0, 'usuário sem vínculo não atualiza (0 linhas)');

reset role;
select pg_temp.act_as('a1000000-0000-4000-8000-000000000003');
set local role authenticated;

with changed as (
  update public.homepage_content set hero_title = 'inativo' returning 1
)
select is((select count(*)::int from changed), 0, 'vínculo inativo não atualiza (0 linhas)');

select is(
  (select hero_title from public.homepage_content),
  (select hero_title from original),
  'o título permanece inalterado após as tentativas não autorizadas'
);

reset role;

-- Editor ativo -------------------------------------------------------------------

select pg_temp.act_as('a1000000-0000-4000-8000-000000000002');
set local role authenticated;

with changed as (
  update public.homepage_content set hero_title = 'Título do editor' returning 1
)
select is((select count(*)::int from changed), 1, 'editor ativo atualiza (1 linha)');

select is(
  (select hero_title from public.homepage_content),
  'Título do editor',
  'o valor gravado pelo editor é lido de volta'
);

select throws_ok(
  $$ update public.homepage_content set hero_image_path = '/imagem.jpg' $$,
  '42501',
  null,
  'editor não altera hero_image_path (fora dos campos liberados)'
);

reset role;

-- Administrador ativo ------------------------------------------------------------

select pg_temp.act_as('a1000000-0000-4000-8000-000000000001');
set local role authenticated;

with changed as (
  update public.homepage_content set hero_title = 'Título do admin' returning 1
)
select is((select count(*)::int from changed), 1, 'administrador ativo atualiza (1 linha)');

select is(
  (select hero_title from public.homepage_content),
  'Título do admin',
  'o valor gravado pelo administrador é lido de volta'
);

select throws_ok(
  $$ update public.homepage_content set id = gen_random_uuid() $$,
  '42501',
  null,
  'colunas estruturais (id) não podem ser alteradas'
);

select throws_ok(
  $$ update public.homepage_content set created_at = now() $$,
  '42501',
  null,
  'colunas estruturais (created_at) não podem ser alteradas'
);

select throws_ok(
  $$ insert into public.homepage_content (hero_title) values ('novo') $$,
  '42501',
  null,
  'nem administradores inserem registros'
);

select throws_ok(
  $$ delete from public.homepage_content $$,
  '42501',
  null,
  'nem administradores excluem o registro'
);

reset role;

-- Permissão revogada depois de abrir o formulário --------------------------------

update public.admin_memberships
set is_active = false
where user_id = 'a1000000-0000-4000-8000-000000000002';

select pg_temp.act_as('a1000000-0000-4000-8000-000000000002');
set local role authenticated;

with changed as (
  update public.homepage_content set hero_title = 'após revogação' returning 1
)
select is((select count(*)::int from changed), 0, 'editor desativado deixa de atualizar na hora');

reset role;

select is(
  (select hero_title from public.homepage_content),
  'Título do admin',
  'a tentativa após a revogação não alterou o registro'
);

select * from finish();

rollback;
