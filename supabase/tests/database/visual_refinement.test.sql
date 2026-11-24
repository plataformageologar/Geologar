-- =============================================================================
-- Refinamento visual (Etapa 10.7): novos campos de aparência (tom escuro,
-- densidade das seções, fundo creme), preset “Referência GeoLogar” pelo fluxo
-- editorial, restauração de revisões antigas e novas opções das seções
-- (banner “brand”, linhas de pesquisa fotográficas, projetos ao lado das
-- publicações).
--
-- Tudo roda numa transação desfeita no final (ROLLBACK): contas de teste
-- (example.test), rascunhos e publicações são temporários.
-- =============================================================================

begin;

create extension if not exists pgtap with schema extensions;

select plan(31);

insert into auth.users (id, email, aud, role)
values
  ('c1070000-0000-4000-8000-000000000001', 'admin@example.test', 'authenticated', 'authenticated'),
  ('c1070000-0000-4000-8000-000000000002', 'editor@example.test', 'authenticated', 'authenticated');

insert into public.admin_memberships (user_id, role, is_active, must_change_password, password_change_required_at)
values
  ('c1070000-0000-4000-8000-000000000001', 'admin', true, false, null),
  ('c1070000-0000-4000-8000-000000000002', 'editor', true, false, null);

create function pg_temp.act_as(user_id uuid, email text) returns void
language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', user_id, 'role', 'authenticated', 'email', email)::text, true);
$$;

create function pg_temp.doc_id() returns uuid
language sql as $$ select id from public.editorial_documents where doc_type = 'appearance' $$;
create function pg_temp.doc_version() returns integer
language sql as $$ select version from public.editorial_documents where doc_type = 'appearance' $$;
grant execute on function pg_temp.doc_id(), pg_temp.doc_version() to authenticated;

-- Conteúdo do preset “Referência GeoLogar” (igual a REFERENCE_PRESET no TypeScript).
create function pg_temp.preset() returns jsonb
language sql as $$
  select '{"appearance": {
    "primary_color": "#805022", "secondary_color": "#244c3e", "accent_color": null,
    "dark_color": "#443020", "section_background": "cream", "button_shape": "rounded",
    "corner_style": "soft", "heading_font": "sans", "card_style": "bordered",
    "section_style": "compact"}}'::jsonb
$$;
grant execute on function pg_temp.preset() to authenticated;

create temporary table t_state (name text primary key, value text);
grant all on t_state to authenticated;
insert into t_state values ('first_revision', (
  select r.id::text from public.editorial_revisions r
  where r.document_id = pg_temp.doc_id() order by r.revision_number limit 1));
insert into t_state values ('doc_id', pg_temp.doc_id()::text), ('doc_version', pg_temp.doc_version()::text);
insert into t_state values ('published_row', (
  select row(dark_color, section_style, section_background, primary_color)::text from public.site_appearance limit 1));

-- 1. Estrutura ------------------------------------------------------------------

select has_column('public', 'site_appearance', 'dark_color', 'coluna dark_color');
select has_column('public', 'site_appearance', 'section_style', 'coluna section_style');
select col_default_is('public', 'site_appearance', 'section_style', 'spacious', 'densidade padrão: espaçosa');
select ok(
  (select count(*) = 1 from public.site_appearance),
  'continua havendo um único registro de aparência'
);
select ok(
  public.editorial_snapshot('appearance', 'appearance') -> 'appearance' ?& array['dark_color', 'section_style'],
  'o retrato editorial inclui os campos novos'
);

-- 2. Preset pelo fluxo editorial (somente administradores) ----------------------------

select pg_temp.act_as('c1070000-0000-4000-8000-000000000002', 'editor@example.test');
set local role authenticated;
select throws_ok(
  format($$ select public.save_editorial_drafts(jsonb_build_array(jsonb_build_object(
    'id', %L, 'version', %s, 'content', %L::jsonb))) $$,
    (select value from t_state where name = 'doc_id'), (select value from t_state where name = 'doc_version'), pg_temp.preset()),
  '42501',
  null,
  'Editor não altera a aparência'
);

reset role;
select pg_temp.act_as('c1070000-0000-4000-8000-000000000001', 'admin@example.test');
set local role authenticated;
select lives_ok(
  format($$ select public.save_editorial_drafts(jsonb_build_array(jsonb_build_object(
    'id', %L, 'version', %s, 'content', %L::jsonb))) $$, pg_temp.doc_id(), pg_temp.doc_version(), pg_temp.preset()),
  'administrador grava o preset como rascunho'
);
reset role;
select is(
  (select draft -> 'appearance' ->> 'section_style' from public.editorial_documents where id = pg_temp.doc_id()),
  'compact',
  'o rascunho guarda a densidade compacta'
);
select is(
  (select row(dark_color, section_style, section_background, primary_color)::text from public.site_appearance limit 1),
  (select value from t_state where name = 'published_row'),
  'nada muda no site antes de publicar'
);

select pg_temp.act_as('c1070000-0000-4000-8000-000000000001', 'admin@example.test');
set local role authenticated;
select lives_ok(
  format($$ select public.publish_editorial_documents(jsonb_build_array(jsonb_build_object('id', %L, 'version', %s)), null) $$,
    pg_temp.doc_id(), pg_temp.doc_version()),
  'administrador publica o preset'
);
reset role;
select is(
  (select row(primary_color, secondary_color, accent_color, dark_color, section_background, button_shape,
              corner_style, heading_font, card_style, section_style)::text from public.site_appearance limit 1),
  '(#805022,#244c3e,,#443020,cream,rounded,soft,sans,bordered,compact)',
  'site_appearance recebe o preset completo'
);
select ok(
  exists (select 1 from public.editorial_revisions where document_id = pg_temp.doc_id()
          and operation = 'published' and content -> 'appearance' ->> 'dark_color' = '#443020'),
  'a publicação fica no histórico com os campos novos'
);

set local role anon;
select is(
  (select section_style from public.site_appearance limit 1),
  'compact',
  'visitantes leem a densidade publicada'
);
reset role;

-- 3. Valores inválidos são recusados ao publicar ----------------------------------------

select pg_temp.act_as('c1070000-0000-4000-8000-000000000001', 'admin@example.test');
set local role authenticated;
select lives_ok(
  format($$ select public.save_editorial_drafts(jsonb_build_array(jsonb_build_object(
    'id', %L, 'version', %s, 'content', %L::jsonb))) $$, pg_temp.doc_id(), pg_temp.doc_version(),
    jsonb_set(pg_temp.preset(), '{appearance,dark_color}', '"black; background: url(x)"')),
  'rascunho com tom escuro inválido pode ser salvo (o TypeScript avisa antes)'
);
select throws_ok(
  format($$ select public.publish_editorial_documents(jsonb_build_array(jsonb_build_object('id', %L, 'version', %s)), null) $$,
    pg_temp.doc_id(), pg_temp.doc_version()),
  '23514',
  null,
  'publicar tom escuro que não é #rrggbb é recusado'
);
select lives_ok(
  format($$ select public.save_editorial_drafts(jsonb_build_array(jsonb_build_object(
    'id', %L, 'version', %s, 'content', %L::jsonb))) $$, pg_temp.doc_id(), pg_temp.doc_version(),
    jsonb_set(pg_temp.preset(), '{appearance,section_style}', '"giant"')),
  'rascunho com densidade desconhecida'
);
select throws_ok(
  format($$ select public.publish_editorial_documents(jsonb_build_array(jsonb_build_object('id', %L, 'version', %s)), null) $$,
    pg_temp.doc_id(), pg_temp.doc_version()),
  '23514',
  null,
  'publicar densidade desconhecida é recusado'
);
select throws_ok(
  format($$ select public.save_editorial_drafts(jsonb_build_array(jsonb_build_object(
    'id', %L, 'version', %s, 'content', %L::jsonb))) $$, pg_temp.doc_id(), pg_temp.doc_version(),
    jsonb_set(pg_temp.preset(), '{appearance,custom_css}', '"body{display:none}"')),
  '22023',
  null,
  'chave desconhecida na aparência é recusada'
);

-- 4. Revisão anterior à Etapa 10.7 continua restaurável ----------------------------------

select lives_ok(
  format($$ select public.restore_editorial_revision(%L::uuid, %s,
      (select content from public.editorial_revisions where id = %L::uuid)) $$,
    (select value from t_state where name = 'first_revision'), pg_temp.doc_version(),
    (select value from t_state where name = 'first_revision')),
  'a primeira revisão da aparência (sem os campos novos) é restaurável'
);
select lives_ok(
  format($$ select public.publish_editorial_documents(jsonb_build_array(jsonb_build_object('id', %L, 'version', %s)), null) $$,
    pg_temp.doc_id(), pg_temp.doc_version()),
  'e pode ser publicada'
);
reset role;
select is(
  (select coalesce(dark_color, '-') || ' ' || section_style from public.site_appearance limit 1),
  '- spacious',
  'campos ausentes na revisão antiga voltam ao padrão'
);

-- 5. Novas opções das seções ---------------------------------------------------------

select ok(public.is_valid_section_settings('hero', '{"layout": "brand"}'), 'banner aceita o layout brand');
select ok(not public.is_valid_section_settings('hero', '{"layout": "mosaic"}'), 'layout desconhecido é recusado');
select ok(public.is_valid_section_settings('research', '{"title": "Linhas", "display": "photos"}'), 'linhas de pesquisa aceitam cards fotográficos');
select ok(not public.is_valid_section_settings('research', '{"display": "carousel"}'), 'apresentação desconhecida é recusada');
select ok(not public.is_valid_section_settings('research', '{"display": 1}'), 'apresentação precisa ser texto');
select ok(not public.is_valid_section_settings('projects', '{"display": "photos"}'), 'display só vale para linhas de pesquisa');
select ok(public.is_valid_section_settings('projects', '{"side_by_side": true}'), 'projetos aceitam side_by_side');
select ok(not public.is_valid_section_settings('projects', '{"side_by_side": "sim"}'), 'side_by_side precisa ser booleano');
select ok(not public.is_valid_section_settings('publications', '{"side_by_side": true}'), 'side_by_side só vale para projetos');

-- Página inicial com as opções novas é conteúdo editorial válido.
select ok(
  public.is_valid_editorial_content('home', jsonb_set(public.editorial_snapshot('home', 'home'), '{sections}',
    (select jsonb_agg(case
        when s ->> 'section_type' = 'research' then jsonb_set(s, '{settings,display}', '"photos"')
        when s ->> 'section_type' = 'projects' then jsonb_set(s, '{settings,side_by_side}', 'true')
        when s ->> 'section_type' = 'hero' then jsonb_set(s, '{settings,layout}', '"brand"')
        else s end order by ord)
     from jsonb_array_elements(public.editorial_snapshot('home', 'home') -> 'sections') with ordinality as e(s, ord)))),
  'página inicial com banner brand, linhas fotográficas e projetos ao lado das publicações é válida'
);

select * from finish();
rollback;
