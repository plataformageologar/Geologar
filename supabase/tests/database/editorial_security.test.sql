-- =============================================================================
-- Segurança do fluxo editorial (Etapa 10): limites do papel editor nas
-- unidades globais, chamadas diretas a funções internas e às funções antigas,
-- links inseguros nos menus, páginas arquivadas, versões desatualizadas e
-- colunas que só mudam pelo fluxo.
--
-- Executar: `npx supabase test db` (local) ou `npx supabase test db --remote`.
-- Tudo roda numa transação desfeita no final (ROLLBACK): contas de teste
-- (example.test), páginas e rascunhos são temporários; nada real é alterado.
-- =============================================================================

begin;

create extension if not exists pgtap with schema extensions;

select plan(23);

-- Fixtures ---------------------------------------------------------------------

insert into auth.users (id, email, aud, role)
values
  ('c1000000-0000-4000-8000-000000000001', 'admin-seg@example.test', 'authenticated', 'authenticated'),
  ('c1000000-0000-4000-8000-000000000002', 'editor-seg@example.test', 'authenticated', 'authenticated'),
  ('c1000000-0000-4000-8000-000000000004', 'comum-seg@example.test', 'authenticated', 'authenticated');

insert into public.admin_memberships (user_id, role, is_active)
values
  ('c1000000-0000-4000-8000-000000000001', 'admin', true),
  ('c1000000-0000-4000-8000-000000000002', 'editor', true);

create function pg_temp.act_as(user_id uuid, email text) returns void
language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', user_id, 'role', 'authenticated', 'email', email)::text, true);
$$;

create temporary table t_ids (name text primary key, id uuid, n integer);
grant all on t_ids to anon, authenticated;

-- Identificadores lidos antes de trocar de papel (o editor não enxerga as
-- unidades globais pelo RLS).
insert into t_ids (name, id, n)
select d.doc_type, d.id, d.version
from public.editorial_documents d
where d.doc_type in ('navigation', 'settings', 'home') and d.doc_key = d.doc_type;

insert into t_ids (name, id)
select 'nav_revision', r.id
from public.editorial_revisions r
where r.document_id = (select id from t_ids where name = 'navigation')
order by r.revision_number
limit 1;

create function pg_temp.nav_with(p_href text) returns jsonb
language sql as $$
  select jsonb_build_object(
    'header', jsonb_build_array(jsonb_build_object(
      'id', null, 'label', 'Teste', 'href', p_href, 'open_in_new_tab', false, 'is_visible', true)),
    'footer', '[]'::jsonb)
$$;
grant execute on function pg_temp.nav_with(text) to authenticated;

-- Editor: unidades globais são só do administrador -------------------------------

select pg_temp.act_as('c1000000-0000-4000-8000-000000000002', 'editor-seg@example.test');
set local role authenticated;

select throws_ok(
  $$ select public.save_editorial_drafts(jsonb_build_array(jsonb_build_object(
       'id', (select id from t_ids where name = 'navigation'),
       'version', (select n from t_ids where name = 'navigation'),
       'content', pg_temp.nav_with('/pesquisa')))) $$,
  '42501', null,
  'editor não salva rascunho da navegação'
);
select throws_ok(
  $$ select public.publish_editorial_documents(jsonb_build_array(jsonb_build_object(
       'id', (select id from t_ids where name = 'navigation'),
       'version', (select n from t_ids where name = 'navigation'))), null) $$,
  '42501', null,
  'editor não publica a navegação'
);
select throws_ok(
  $$ select public.publish_editorial_documents(jsonb_build_array(jsonb_build_object(
       'id', (select id from t_ids where name = 'settings'),
       'version', (select n from t_ids where name = 'settings'))), null) $$,
  '42501', null,
  'editor não publica as informações institucionais'
);
select throws_ok(
  $$ select public.discard_editorial_draft(
       (select id from t_ids where name = 'settings'), (select n from t_ids where name = 'settings')) $$,
  '42501', null,
  'editor não descarta rascunho das informações institucionais'
);
select throws_ok(
  $$ select public.restore_editorial_revision(
       (select id from t_ids where name = 'nav_revision'),
       (select n from t_ids where name = 'navigation'),
       pg_temp.nav_with('/pesquisa')) $$,
  '42501', null,
  'editor não restaura revisão fora do seu escopo'
);

-- Funções internas e antigas: a guarda recusa a gravação --------------------------

select throws_ok(
  $$ select public.editorial_record_draft(
       (select id from t_ids where name = 'home'), (select n from t_ids where name = 'home'),
       public.editorial_snapshot('home', 'home'), 'draft_saved', null) $$,
  'GL403', null,
  'função interna de rascunho chamada diretamente é recusada'
);
-- Com um rascunho real, a publicação direta chega à gravação e é barrada.
select lives_ok(
  $$ select public.save_editorial_drafts(jsonb_build_array(jsonb_build_object(
       'id', (select id from t_ids where name = 'home'), 'version', (select n from t_ids where name = 'home'),
       'content', jsonb_set(public.editorial_snapshot('home', 'home'), '{homepage,hero_title}', '"Segurança (teste)"')))) $$,
  'editor salva rascunho da homepage pelo fluxo'
);
update t_ids set n = (select version from public.editorial_documents where id = t_ids.id) where name = 'home';
-- A chave da guarda vale até o fim da transação; aqui o arquivo inteiro é uma
-- transação só (na API, cada chamada é uma transação). Desliga antes de testar.
select set_config('geologar.editorial_write', 'off', true);
select throws_ok(
  $$ select public.editorial_publish_one(
       (select id from t_ids where name = 'home'), (select n from t_ids where name = 'home'), null) $$,
  'GL403', null,
  'função interna de publicação chamada diretamente é recusada'
);
-- A chave da guarda vale até o fim da transação; aqui o arquivo inteiro é uma
-- transação só (na API, cada chamada é uma transação). Desliga antes de testar.
select set_config('geologar.editorial_write', 'off', true);
select throws_ok(
  $$ select public.save_page_sections('home',
       coalesce((select jsonb_agg(jsonb_build_object('id', id, 'updated_at', updated_at))
                 from public.page_sections where page_key = 'home'), '[]'),
       coalesce((select jsonb_agg(jsonb_build_object('id', id, 'section_type', section_type,
                   'is_visible', is_visible, 'settings', settings) order by sort_order, created_at)
                 from public.page_sections where page_key = 'home'), '[]')) $$,
  'GL403', null,
  'função antiga de seções (anterior ao fluxo editorial) não grava'
);
-- A chave da guarda vale até o fim da transação; aqui o arquivo inteiro é uma
-- transação só (na API, cada chamada é uma transação). Desliga antes de testar.
select set_config('geologar.editorial_write', 'off', true);
select throws_ok(
  $$ update public.custom_pages set status = 'published', published_at = now() $$,
  'GL403', null,
  'status de página não muda por gravação direta'
);

-- Páginas: endereço, arquivamento --------------------------------------------------

select throws_ok(
  $$ select public.create_custom_page('Curta (teste)', 'ab', null) $$,
  '23514', null,
  'endereço curto demais é recusado'
);
select throws_ok(
  $$ select public.create_custom_page('Caminho (teste)', '../admin', null) $$,
  '23514', null,
  'endereço com caminho é recusado'
);

insert into t_ids (name, id)
values ('page', public.create_custom_page('Segurança (teste)', 'seguranca-etapa-10-teste', null));
update t_ids set n = (select version from public.editorial_documents where custom_page_id = t_ids.id)
where name = 'page';

select is(
  public.set_custom_page_status((select id from t_ids where name = 'page'), 'archive'),
  'archived',
  'editor arquiva página nunca publicada'
);
select throws_ok(
  $$ select public.publish_editorial_documents(jsonb_build_array(jsonb_build_object(
       'id', (select id from public.editorial_documents where custom_page_id = (select id from t_ids where name = 'page')),
       'version', (select n from t_ids where name = 'page'))), null) $$,
  'GL423', null,
  'página arquivada não é publicada'
);

-- Versão desatualizada -------------------------------------------------------------

select throws_ok(
  $$ select public.save_editorial_drafts(jsonb_build_array(jsonb_build_object(
       'id', (select id from t_ids where name = 'home'),
       'version', (select n from t_ids where name = 'home') - 1,
       'content', public.editorial_snapshot('home', 'home')))) $$,
  'GL409', null,
  'versão desatualizada é recusada'
);

-- Administrador: links inseguros no menu ---------------------------------------------

reset role;
select pg_temp.act_as('c1000000-0000-4000-8000-000000000001', 'admin-seg@example.test');
set local role authenticated;

select throws_ok(
  $$ select public.save_editorial_drafts(jsonb_build_array(jsonb_build_object(
       'id', (select id from t_ids where name = 'navigation'),
       'version', (select n from t_ids where name = 'navigation'),
       'content', pg_temp.nav_with('javascript:alert(1)')))) $$,
  '22023', null,
  'link javascript: é recusado no menu'
);
select throws_ok(
  $$ select public.save_editorial_drafts(jsonb_build_array(jsonb_build_object(
       'id', (select id from t_ids where name = 'navigation'),
       'version', (select n from t_ids where name = 'navigation'),
       'content', pg_temp.nav_with('//evil.example/x')))) $$,
  '22023', null,
  'link relativo ao protocolo é recusado no menu'
);
select throws_ok(
  $$ select public.save_editorial_drafts(jsonb_build_array(jsonb_build_object(
       'id', (select id from t_ids where name = 'navigation'),
       'version', (select n from t_ids where name = 'navigation'),
       'content', pg_temp.nav_with('data:text/html,x')))) $$,
  '22023', null,
  'link data: é recusado no menu'
);
select lives_ok(
  $$ select public.save_editorial_drafts(jsonb_build_array(jsonb_build_object(
       'id', (select id from t_ids where name = 'navigation'),
       'version', (select n from t_ids where name = 'navigation'),
       'content', pg_temp.nav_with('/paginas/seguranca-etapa-10-teste')))) $$,
  'administrador salva menu com link interno válido (rascunho)'
);
select is(
  (select count(*)::int from public.site_navigation where href = '/paginas/seguranca-etapa-10-teste'),
  0,
  'salvar o rascunho do menu não altera o menu publicado'
);

-- Visitante e conta sem vínculo ------------------------------------------------------

reset role;
set local role anon;

select is(
  (select count(*)::int from public.custom_pages where slug = 'seguranca-etapa-10-teste'),
  0,
  'visitante não vê página arquivada'
);
select throws_ok(
  $$ select public.restore_editorial_revision(null, 1, '{}') $$,
  '42501', null,
  'visitante não restaura revisões'
);

reset role;
select pg_temp.act_as('c1000000-0000-4000-8000-000000000004', 'comum-seg@example.test');
set local role authenticated;

select throws_ok(
  $$ select public.restore_editorial_revision((select id from t_ids where name = 'nav_revision'), 1, '{}') $$,
  '42501', null,
  'conta sem vínculo não restaura revisões'
);

reset role;

select * from finish();
rollback;
