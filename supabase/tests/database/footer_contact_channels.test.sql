-- =============================================================================
-- Contato institucional no rodapé (ajuste complementar da Etapa 10.7):
-- WhatsApp e título dos “Links úteis” em site_settings, lista “useful” em
-- site_navigation, tudo pelo fluxo editorial (somente administradores).
--
-- Tudo roda numa transação desfeita no final (ROLLBACK): contas de teste
-- (example.test), rascunhos e publicações são temporários. Os números de
-- telefone são fictícios e nunca chegam ao site.
-- =============================================================================

begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

insert into auth.users (id, email, aud, role)
values
  ('c1080000-0000-4000-8000-000000000001', 'admin@example.test', 'authenticated', 'authenticated'),
  ('c1080000-0000-4000-8000-000000000002', 'editor@example.test', 'authenticated', 'authenticated');

insert into public.admin_memberships (user_id, role, is_active, must_change_password, password_change_required_at)
values
  ('c1080000-0000-4000-8000-000000000001', 'admin', true, false, null),
  ('c1080000-0000-4000-8000-000000000002', 'editor', true, false, null);

create function pg_temp.act_as(user_id uuid, email text) returns void
language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', user_id, 'role', 'authenticated', 'email', email)::text, true);
$$;

create function pg_temp.doc_id(p_type text) returns uuid
language sql as $$ select id from public.editorial_documents where doc_type = p_type $$;
create function pg_temp.doc_version(p_type text) returns integer
language sql as $$ select version from public.editorial_documents where doc_type = p_type $$;
grant execute on function pg_temp.doc_id(text), pg_temp.doc_version(text) to authenticated;

create function pg_temp.save(p_type text, p_content jsonb) returns text
language sql as $$
  select format($f$ select public.save_editorial_drafts(jsonb_build_array(jsonb_build_object(
    'id', %L, 'version', %s, 'content', %L::jsonb))) $f$,
    pg_temp.doc_id(p_type), pg_temp.doc_version(p_type), p_content)
$$;
create function pg_temp.publish(p_type text) returns text
language sql as $$
  select format($f$ select public.publish_editorial_documents(jsonb_build_array(jsonb_build_object('id', %L, 'version', %s)), null) $f$,
    pg_temp.doc_id(p_type), pg_temp.doc_version(p_type))
$$;
grant execute on function pg_temp.save(text, jsonb), pg_temp.publish(text) to authenticated;

create temporary table t_state (name text primary key, value jsonb);
grant all on t_state to authenticated;
insert into t_state values
  ('navigation', public.editorial_snapshot('navigation', 'navigation')),
  ('settings', public.editorial_snapshot('settings', 'settings')),
  ('old_navigation', (
    select r.content from public.editorial_revisions r
    where r.document_id = pg_temp.doc_id('navigation') order by r.revision_number limit 1));

-- 1. Estrutura ------------------------------------------------------------------

select has_column('public', 'site_settings', 'contact_whatsapp', 'coluna contact_whatsapp');
select has_column('public', 'site_settings', 'footer_links_title', 'coluna footer_links_title');
select ok(
  public.editorial_snapshot('settings', 'settings') -> 'settings' ?& array['contact_whatsapp', 'footer_links_title'],
  'o retrato das configurações inclui os campos novos'
);
select ok(
  public.editorial_snapshot('navigation', 'navigation') ?& array['header', 'footer', 'useful'],
  'o retrato da navegação inclui os Links úteis'
);
select ok(
  not exists (select 1 from public.site_navigation where location = 'useful'),
  'a migration não cria links úteis (nada inventado)'
);

-- 2. Links úteis pelo fluxo editorial ------------------------------------------------

-- O SQL é montado antes de trocar de papel: o Editor nem enxerga a unidade.
create temporary table t_sql (name text primary key, sql text);
grant all on t_sql to authenticated;
insert into t_sql values
  ('editor_nav', pg_temp.save('navigation', jsonb_set(
    (select value from t_state where name = 'navigation'), '{useful}',
    '[{"id": null, "label": "Privacidade (teste)", "href": "/paginas/privacidade", "open_in_new_tab": false, "is_visible": true}]'))),
  ('editor_settings', pg_temp.save('settings', jsonb_set(
    (select value from t_state where name = 'settings'), '{settings,contact_whatsapp}', '"+55 11 0000-0000"')));

select pg_temp.act_as('c1080000-0000-4000-8000-000000000002', 'editor@example.test');
set local role authenticated;
select throws_ok(
  (select sql from t_sql where name = 'editor_nav'),
  '42501',
  null,
  'Editor não altera os Links úteis'
);
reset role;

select pg_temp.act_as('c1080000-0000-4000-8000-000000000001', 'admin@example.test');
set local role authenticated;
select lives_ok(
  pg_temp.save('navigation', jsonb_set(
    (select value from t_state where name = 'navigation'), '{useful}',
    '[{"id": null, "label": "Privacidade (teste)", "href": "/paginas/privacidade", "open_in_new_tab": false, "is_visible": true}]')),
  'administrador grava Links úteis como rascunho'
);
reset role;
select ok(
  not exists (select 1 from public.site_navigation where location = 'useful'),
  'nada muda no site antes de publicar'
);
select pg_temp.act_as('c1080000-0000-4000-8000-000000000001', 'admin@example.test');
set local role authenticated;
select lives_ok(pg_temp.publish('navigation'), 'administrador publica os Links úteis');
reset role;
select is(
  (select array_agg(label || ' ' || href) from public.site_navigation where location = 'useful'),
  array['Privacidade (teste) /paginas/privacidade'],
  'o link útil é gravado em site_navigation'
);
select is(
  (select count(*)::int from public.site_navigation where location = 'header'),
  jsonb_array_length((select value -> 'header' from t_state where name = 'navigation')),
  'o menu do cabeçalho continua igual'
);
set local role anon;
select is(
  (select count(*)::int from public.site_navigation where location = 'useful' and is_visible),
  1,
  'visitantes leem os Links úteis publicados'
);
reset role;

select pg_temp.act_as('c1080000-0000-4000-8000-000000000001', 'admin@example.test');
set local role authenticated;
select throws_ok(
  pg_temp.save('navigation', jsonb_set(
    (select value from t_state where name = 'navigation'), '{useful}',
    '[{"id": null, "label": "Sem destino", "href": "javascript:alert(1)", "open_in_new_tab": false, "is_visible": true}]')),
  '22023',
  null,
  'link útil com destino inválido é recusado'
);

-- 3. Revisão anterior (sem “useful”) continua restaurável ---------------------------

select lives_ok(
  format($$ select public.save_editorial_drafts(jsonb_build_array(jsonb_build_object(
    'id', %L, 'version', %s, 'content', %L::jsonb))) $$,
    pg_temp.doc_id('navigation'), pg_temp.doc_version('navigation'),
    (select value from t_state where name = 'old_navigation')),
  'conteúdo de navegação sem a lista useful é aceito'
);
select lives_ok(pg_temp.publish('navigation'), 'e pode ser publicado');
reset role;
select ok(
  not exists (select 1 from public.site_navigation where location = 'useful'),
  'a revisão antiga volta sem Links úteis'
);

-- 4. WhatsApp e título dos Links úteis --------------------------------------------

select pg_temp.act_as('c1080000-0000-4000-8000-000000000002', 'editor@example.test');
set local role authenticated;
select throws_ok(
  (select sql from t_sql where name = 'editor_settings'),
  '42501',
  null,
  'Editor não altera o WhatsApp'
);
reset role;

select pg_temp.act_as('c1080000-0000-4000-8000-000000000001', 'admin@example.test');
set local role authenticated;
select lives_ok(
  pg_temp.save('settings', jsonb_set(jsonb_set(
    (select value from t_state where name = 'settings'), '{settings,contact_whatsapp}', '"+55 11 0000-0000"'),
    '{settings,footer_links_title}', '"Links úteis"')),
  'administrador grava WhatsApp e título como rascunho'
);
select lives_ok(pg_temp.publish('settings'), 'e publica');
reset role;
select is(
  (select contact_whatsapp || ' | ' || footer_links_title from public.site_settings limit 1),
  '+55 11 0000-0000 | Links úteis',
  'site_settings recebe os campos novos'
);

select pg_temp.act_as('c1080000-0000-4000-8000-000000000001', 'admin@example.test');
set local role authenticated;
select lives_ok(
  pg_temp.save('settings', jsonb_set(
    (select value from t_state where name = 'settings'), '{settings,contact_whatsapp}', '"71 0000-0000"')),
  'rascunho com WhatsApp sem código do país'
);
select throws_ok(
  pg_temp.publish('settings'),
  '23514',
  null,
  'publicar WhatsApp fora do formato internacional é recusado'
);
reset role;

select * from finish();
rollback;
