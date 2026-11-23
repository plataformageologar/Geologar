-- =============================================================================
-- Gerenciamento de Editores (Etapa 10.5): troca obrigatória da senha inicial
-- na camada de autorização, vínculos sem escrita pela API e histórico de
-- operações somente leitura para administradores.
--
-- Executar: `npx supabase test db` (local) ou `npx supabase test db --remote`.
-- Tudo roda numa transação desfeita no final (ROLLBACK): contas de teste
-- (example.test), projetos e eventos são temporários; nada real é alterado.
-- =============================================================================

begin;

create extension if not exists pgtap with schema extensions;

select plan(30);

-- Vínculos existentes não passam a exigir troca de senha ------------------------

select is(
  (select count(*)::int from public.admin_memberships where must_change_password),
  0,
  'vínculos existentes continuam sem troca de senha pendente'
);

-- Fixtures ---------------------------------------------------------------------

insert into auth.users (id, email, aud, role)
values
  ('c2000000-0000-4000-8000-000000000001', 'admin-usr@example.test', 'authenticated', 'authenticated'),
  ('c2000000-0000-4000-8000-000000000002', 'editor-usr@example.test', 'authenticated', 'authenticated'),
  ('c2000000-0000-4000-8000-000000000003', 'novo-usr@example.test', 'authenticated', 'authenticated'),
  ('c2000000-0000-4000-8000-000000000004', 'inativo-usr@example.test', 'authenticated', 'authenticated'),
  ('c2000000-0000-4000-8000-000000000005', 'comum-usr@example.test', 'authenticated', 'authenticated');

insert into public.admin_memberships (user_id, role, is_active, must_change_password, password_change_required_at)
values
  ('c2000000-0000-4000-8000-000000000001', 'admin', true, false, null),
  ('c2000000-0000-4000-8000-000000000002', 'editor', true, false, null),
  ('c2000000-0000-4000-8000-000000000003', 'editor', true, true, now()),
  ('c2000000-0000-4000-8000-000000000004', 'editor', false, false, null);

create function pg_temp.act_as(user_id uuid, email text) returns void
language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', user_id, 'role', 'authenticated', 'email', email)::text, true);
$$;

create temporary table t_ids (name text primary key, id uuid, n integer);
grant all on t_ids to anon, authenticated, service_role;

insert into t_ids (name, id, n)
select d.doc_type, d.id, d.version
from public.editorial_documents d
where d.doc_type = 'home' and d.doc_key = 'home';

insert into t_ids (name, n)
select 'media', count(*)::int from storage.objects where bucket_id = 'geologar-media';

insert into public.admin_user_events (actor_user_id, target_user_id, target_email, event_type, outcome)
values ('c2000000-0000-4000-8000-000000000001', 'c2000000-0000-4000-8000-000000000003',
        'novo-usr@example.test', 'editor_created', 'success');

-- Constraints ------------------------------------------------------------------

select throws_ok(
  $$ update public.admin_memberships set must_change_password = true, password_change_required_at = null
     where user_id = 'c2000000-0000-4000-8000-000000000002' $$,
  '23514', null,
  'troca pendente exige o instante em que passou a ser exigida'
);
select throws_ok(
  $$ insert into public.admin_user_events (event_type, outcome, detail)
     values ('editor_created', 'failure', 'senha: Segredo 123') $$,
  '23514', null,
  'detalhe do evento aceita só códigos curtos (nunca texto livre)'
);
select throws_ok(
  $$ insert into public.admin_user_events (event_type, outcome) values ('editor_deleted', 'success') $$,
  '23514', null,
  'tipo de evento fora da lista é recusado'
);

-- Editor com troca de senha pendente: sem permissão editorial --------------------

select pg_temp.act_as('c2000000-0000-4000-8000-000000000003', 'novo-usr@example.test');
set local role authenticated;

select is(
  public.has_cms_role(array['admin', 'editor']),
  false,
  'troca pendente: has_cms_role é falso'
);
select is(
  (select must_change_password from public.admin_memberships
   where user_id = 'c2000000-0000-4000-8000-000000000003'),
  true,
  'troca pendente: a conta ainda lê o próprio vínculo'
);
select throws_ok(
  $$ select public.save_editorial_drafts(jsonb_build_array(jsonb_build_object(
       'id', (select id from t_ids where name = 'home'),
       'version', (select n from t_ids where name = 'home'),
       'content', jsonb_set(public.editorial_snapshot('home', 'home'), '{homepage,hero_title}', '"Pendente (teste)"')))) $$,
  '42501', null,
  'troca pendente: não salva rascunho da homepage'
);
select throws_ok(
  $$ insert into public.projects (title, slug, project_status, is_published)
     values ('Projeto pendente (teste)', 'projeto-pendente-teste', 'ongoing', false) $$,
  '42501', null,
  'troca pendente: não cria projeto'
);
select is(
  (select count(*)::int from storage.objects where bucket_id = 'geologar-media'),
  0,
  'troca pendente: não lista a biblioteca de mídia'
);
select is(
  (select count(*)::int from public.editorial_documents),
  0,
  'troca pendente: não lê rascunhos'
);
select throws_ok(
  $$ update public.admin_memberships set must_change_password = false, password_change_required_at = null
     where user_id = 'c2000000-0000-4000-8000-000000000003' $$,
  '42501', null,
  'troca pendente: a conta não remove a própria exigência pela API'
);

-- Editor ativo: mantém o acesso editorial, sem gestão de usuários ----------------

reset role;
select pg_temp.act_as('c2000000-0000-4000-8000-000000000002', 'editor-usr@example.test');
set local role authenticated;

select is(
  public.has_cms_role(array['admin', 'editor']),
  true,
  'editor ativo sem pendência: has_cms_role continua verdadeiro'
);
select lives_ok(
  $$ insert into public.projects (title, slug, project_status, is_published)
     values ('Projeto editor (teste)', 'projeto-editor-teste', 'ongoing', false) $$,
  'editor ativo continua criando projetos'
);
select is(
  (select count(*)::int from storage.objects where bucket_id = 'geologar-media'),
  (select n from t_ids where name = 'media'),
  'editor ativo continua listando a biblioteca de mídia'
);
select throws_ok(
  $$ update public.admin_memberships set role = 'admin'
     where user_id = 'c2000000-0000-4000-8000-000000000002' $$,
  '42501', null,
  'editor não altera o próprio papel'
);
select throws_ok(
  $$ insert into public.admin_memberships (user_id, role)
     values ('c2000000-0000-4000-8000-000000000005', 'editor') $$,
  '42501', null,
  'editor não cria vínculo para outra conta'
);
select throws_ok(
  $$ update public.admin_memberships set is_active = false
     where user_id = 'c2000000-0000-4000-8000-000000000003' $$,
  '42501', null,
  'editor não desativa outra conta'
);
select is(
  (select count(*)::int from public.admin_user_events),
  0,
  'editor não lê o histórico de operações'
);
select throws_ok(
  $$ insert into public.admin_user_events (event_type, outcome) values ('editor_created', 'success') $$,
  '42501', null,
  'editor não grava no histórico de operações'
);

-- Conta inativa ------------------------------------------------------------------

reset role;
select pg_temp.act_as('c2000000-0000-4000-8000-000000000004', 'inativo-usr@example.test');
set local role authenticated;

select is(
  public.has_cms_role(array['admin', 'editor']),
  false,
  'conta inativa: has_cms_role é falso'
);

-- Administrador ------------------------------------------------------------------

reset role;
select pg_temp.act_as('c2000000-0000-4000-8000-000000000001', 'admin-usr@example.test');
set local role authenticated;

select ok(
  (select count(*)::int from public.admin_user_events
   where target_user_id = 'c2000000-0000-4000-8000-000000000003') = 1,
  'administrador lê o histórico de operações'
);
select throws_ok(
  $$ insert into public.admin_user_events (event_type, outcome) values ('editor_created', 'success') $$,
  '42501', null,
  'administrador não grava no histórico diretamente (só a Edge Function)'
);
select throws_ok(
  $$ update public.admin_memberships set must_change_password = false, password_change_required_at = null
     where user_id = 'c2000000-0000-4000-8000-000000000003' $$,
  '42501', null,
  'administrador não altera vínculos pela API (só a Edge Function)'
);

-- Visitante ----------------------------------------------------------------------

reset role;
set local role anon;

select throws_ok(
  $$ select count(*) from public.admin_user_events $$,
  '42501', null,
  'visitante não acessa o histórico de operações'
);

-- service_role (Edge Function) ---------------------------------------------------

reset role;
set local role service_role;

select lives_ok(
  $$ insert into public.admin_user_events (actor_user_id, target_user_id, event_type, outcome, detail)
     values ('c2000000-0000-4000-8000-000000000001', 'c2000000-0000-4000-8000-000000000002',
             'editor_password_reset', 'failure', 'auth:unexpected') $$,
  'service_role registra eventos'
);
select throws_ok(
  $$ update public.admin_user_events set outcome = 'success' $$,
  '42501', null,
  'histórico não pode ser alterado nem pelo service_role'
);
select throws_ok(
  $$ delete from public.admin_user_events $$,
  '42501', null,
  'histórico não pode ser excluído nem pelo service_role'
);
select lives_ok(
  $$ update public.admin_memberships set must_change_password = false, password_change_required_at = null
     where user_id = 'c2000000-0000-4000-8000-000000000003' $$,
  'service_role conclui a troca obrigatória'
);

-- Depois da troca concluída ------------------------------------------------------

reset role;
select pg_temp.act_as('c2000000-0000-4000-8000-000000000003', 'novo-usr@example.test');
set local role authenticated;

select is(
  public.has_cms_role(array['admin', 'editor']),
  true,
  'troca concluída: o editor volta a ter acesso editorial'
);
select lives_ok(
  $$ insert into public.projects (title, slug, project_status, is_published)
     values ('Projeto liberado (teste)', 'projeto-liberado-teste', 'ongoing', false) $$,
  'troca concluída: o editor cria projetos'
);

reset role;
select * from finish();
rollback;
