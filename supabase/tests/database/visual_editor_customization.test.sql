-- =============================================================================
-- Personalização do site e editor visual (Etapa 9.5): pilares, navegação,
-- seções/blocos, textos das páginas, aparência e rodapé.
--
-- Executar: `npx supabase test db` (local) ou `npx supabase test db --remote`.
-- Tudo roda numa transação desfeita no final (ROLLBACK): contas de teste
-- (example.test) e alterações são temporárias; nenhum dado real é alterado.
-- =============================================================================

begin;

create extension if not exists pgtap with schema extensions;

-- Etapa 9.6: estas tabelas só aceitam escrita pelo fluxo editorial (trigger
-- editorial_guard). Este teste verifica as regras da camada de baixo (RLS,
-- GRANTs e CHECKs usados pela publicação), então liga a mesma chave que as
-- funções do fluxo ligam. O fluxo em si: editorial_workflow.test.sql.
select set_config('geologar.editorial_write', 'on', true);

select plan(71);

-- Fixtures ---------------------------------------------------------------------

insert into auth.users (id, email, aud, role)
values
  ('b9500000-0000-4000-8000-000000000001', 'admin@example.test', 'authenticated', 'authenticated'),
  ('b9500000-0000-4000-8000-000000000002', 'editor@example.test', 'authenticated', 'authenticated'),
  ('b9500000-0000-4000-8000-000000000003', 'inativo@example.test', 'authenticated', 'authenticated'),
  ('b9500000-0000-4000-8000-000000000004', 'comum@example.test', 'authenticated', 'authenticated');

insert into public.admin_memberships (user_id, role, is_active)
values
  ('b9500000-0000-4000-8000-000000000001', 'admin', true),
  ('b9500000-0000-4000-8000-000000000002', 'editor', true),
  ('b9500000-0000-4000-8000-000000000003', 'editor', false);

-- Item oculto de cada lista (não aparece para o público).
insert into public.site_pillars (id, title, icon, sort_order, is_visible)
values ('a9500000-0000-4000-8000-000000000001', 'Pilar oculto (teste)', 'globe', 9, false);
insert into public.site_navigation (id, location, label, href, sort_order, is_visible)
values ('a9500000-0000-4000-8000-000000000002', 'header', 'Oculto (teste)', '/rede', 9, false);
insert into public.page_sections (id, page_key, section_type, sort_order, is_visible, settings)
values ('a9500000-0000-4000-8000-000000000003', 'home', 'text', 9, false, '{"title": "Bloco oculto (teste)"}');

create function pg_temp.act_as(user_id uuid) returns void
language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;

-- Versões atuais (id, updated_at) de uma lista, como o CMS as envia.
create function pg_temp.versions(p_table text, p_filter text default null) returns jsonb
language plpgsql as $$
declare result jsonb;
begin
  execute format(
    'select coalesce(jsonb_agg(jsonb_build_object(''id'', id, ''updated_at'', updated_at)), ''[]'') from public.%I %s',
    p_table, coalesce('where ' || p_filter, '')
  ) into result;
  return result;
end;
$$;
grant execute on function pg_temp.versions(text, text) to anon, authenticated;

-- Conteúdo inicial ---------------------------------------------------------------

select is(
  (select array_agg(title order by sort_order) from public.site_pillars where is_visible),
  array['Pesquisa', 'Formação', 'Território', 'Cooperação'],
  'os quatro pilares do código foram preservados, na ordem'
);

select is(
  (select array_agg(href order by sort_order) from public.site_navigation where location = 'header' and is_visible),
  array['/', '/rede', '/pesquisa', '/projetos', '/publicacoes', '/contato'],
  'menu do cabeçalho preservado'
);

select is(
  (select count(*)::int from public.site_navigation where location = 'footer'),
  7,
  'menu do rodapé preservado (sete links)'
);

select is(
  (select array_agg(section_type order by sort_order) from public.page_sections where page_key = 'home' and section_type <> 'text'),
  array['hero', 'about', 'research', 'projects', 'publications', 'institutions', 'cooperation'],
  'seções da homepage na ordem atual'
);

select is(
  (select count(*)::int from public.page_content),
  6,
  'textos das seis páginas internas'
);

select is(
  (select count(*)::int from public.site_appearance),
  1,
  'aparência com registro único'
);

-- Validação das configurações (JSONB) ---------------------------------------------

select ok(
  public.is_valid_section_settings('research', '{"title": "T", "limit": 6, "columns": 3, "background": "muted", "cta_href": "/pesquisa"}'),
  'configurações válidas são aceitas'
);
select ok(
  not public.is_valid_section_settings('research', '{"style": "color: red"}'),
  'chave desconhecida é recusada'
);
select ok(
  not public.is_valid_section_settings('script', '{}'),
  'tipo de seção desconhecido é recusado'
);
select ok(
  not public.is_valid_section_settings('text', '{"cta_href": "javascript:alert(1)"}'),
  'link javascript: é recusado'
);
select ok(
  not public.is_valid_section_settings('text', '{"cta_href": "//evil.example"}'),
  'link protocol-relative é recusado'
);
select ok(
  not public.is_valid_section_settings('research', '{"limit": 50}'),
  'quantidade fora do intervalo é recusada'
);
select ok(
  not public.is_valid_section_settings('research', '{"limit": "6"}'),
  'número como texto é recusado'
);
select ok(
  not public.is_valid_section_settings('text', '{"background": "url(x)"}'),
  'fundo fora da lista é recusado'
);
select ok(
  not public.is_valid_section_settings('text', jsonb_build_object('title', repeat('x', 161))),
  'título acima do limite é recusado'
);
select ok(
  public.is_valid_section_settings('gallery', '{"images": [{"path": "/images/a.jpg", "alt": "A"}]}'),
  'galeria com imagem local é aceita'
);
select ok(
  not public.is_valid_section_settings('gallery', '{"images": [{"path": "https://example.test/a.jpg"}]}'),
  'galeria com URL externa é recusada'
);
select ok(
  not public.is_valid_section_settings('gallery', '{"images": [{"path": "/images/a.jpg", "onclick": "x"}]}'),
  'imagem de galeria com chave extra é recusada'
);
select ok(
  not public.is_valid_section_settings('logos', '{"institution_ids": ["não-é-uuid"]}'),
  'lista de logotipos aceita somente UUIDs'
);
select ok(
  public.is_valid_site_href('https://example.test/a?b=1') and public.is_valid_site_href('/contato#form'),
  'links internos e externos válidos'
);
select ok(
  not (public.is_valid_site_href('https://user:x@example.test') or public.is_valid_site_href('/a b')
       or public.is_valid_site_href('/\evil') or public.is_valid_site_href('mailto:x@example.test')),
  'links com credenciais, espaços, barra invertida ou outro esquema são recusados'
);

-- Anônimo ------------------------------------------------------------------------

set local role anon;

select is(
  (select count(*)::int from public.site_pillars where title like '%(teste)'),
  0,
  'anon não vê pilar oculto'
);
select is(
  (select count(*)::int from public.site_navigation where label like '%(teste)'),
  0,
  'anon não vê link oculto'
);
select is(
  (select count(*)::int from public.page_sections where settings ->> 'title' like '%(teste)'),
  0,
  'anon não vê bloco oculto'
);
select is(
  (select count(*)::int from public.page_content),
  6,
  'anon lê os textos das páginas'
);
select throws_ok(
  $$ insert into public.site_pillars (title) values ('anon') $$,
  '42501', null, 'anon não cria pilares'
);
select throws_ok(
  $$ update public.page_content set title = 'anon' $$,
  '42501', null, 'anon não altera textos das páginas'
);
select throws_ok(
  $$ select public.save_site_pillars('[]', '[]') $$,
  '42501', null, 'anon não executa save_site_pillars'
);
select throws_ok(
  $$ select public.save_page_sections('home', '[]', '[]') $$,
  '42501', null, 'anon não executa save_page_sections'
);

reset role;

-- Autenticado sem vínculo e vínculo inativo -------------------------------------

select pg_temp.act_as('b9500000-0000-4000-8000-000000000004');
set local role authenticated;

select is(
  (select count(*)::int from public.site_pillars where title like '%(teste)'),
  0,
  'usuário sem vínculo não vê pilar oculto'
);
select throws_ok(
  $$ select public.save_site_pillars('[]', '[]') $$,
  '42501', null, 'usuário sem vínculo não salva pilares'
);
with changed as (update public.page_content set title = 'comum' returning 1)
select is((select count(*)::int from changed), 0, 'usuário sem vínculo não altera textos das páginas');

reset role;

select pg_temp.act_as('b9500000-0000-4000-8000-000000000003');
set local role authenticated;

select throws_ok(
  $$ select public.save_page_sections('home', pg_temp.versions('page_sections', 'page_key = ''home'''), '[]') $$,
  '42501', null, 'vínculo inativo não salva seções'
);
with changed as (update public.site_pillars set title = 'inativo' returning 1)
select is((select count(*)::int from changed), 0, 'vínculo inativo não altera pilares');

reset role;

-- Editor ------------------------------------------------------------------------

select pg_temp.act_as('b9500000-0000-4000-8000-000000000002');
set local role authenticated;

select is(
  (select count(*)::int from public.site_pillars where title like '%(teste)'),
  1,
  'editor vê pilar oculto'
);

-- Reordena, oculta, edita, adiciona e remove numa só gravação.
select lives_ok(
  $$ select public.save_site_pillars(
       pg_temp.versions('site_pillars'),
       (select jsonb_agg(item order by ord) from (
          select jsonb_build_object('id', id, 'title', title || ' (editado)', 'description', description,
                   'icon', icon, 'is_visible', title <> 'Formação') as item,
                 case title when 'Cooperação' then 0 else sort_order + 1 end as ord
          from public.site_pillars where title not like '%(teste)'
          union all
          select '{"title": "Novo pilar", "icon": "leaf"}'::jsonb, 99
        ) s)
     ) $$,
  'editor salva a lista de pilares'
);
select is(
  (select array_agg(title order by sort_order) from public.site_pillars),
  array['Cooperação (editado)', 'Pesquisa (editado)', 'Formação (editado)', 'Território (editado)', 'Novo pilar'],
  'pilares reordenados, editados, adicionados e o omitido removido'
);
select is(
  (select is_visible from public.site_pillars where title = 'Formação (editado)'),
  false,
  'pilar ocultado'
);
select throws_ok(
  $$ select public.save_site_pillars('[{"id": "a9500000-0000-4000-8000-000000000001", "updated_at": "2000-01-01T00:00:00Z"}]', '[]') $$,
  'GL409', null, 'lista desatualizada (edição simultânea) é recusada'
);
select throws_ok(
  $$ select public.save_site_pillars(pg_temp.versions('site_pillars'), '[{"title": "X", "icon": "skull"}]') $$,
  '23514', null, 'ícone fora da lista é recusado'
);
select throws_ok(
  $$ select public.save_site_pillars(pg_temp.versions('site_pillars'), '[{"title": "  ", "icon": "leaf"}]') $$,
  '23514', null, 'pilar sem título é recusado'
);

-- Seções: blocos podem ser criados e excluídos; seções nativas não.
select lives_ok(
  $$ select public.save_page_sections(
       'home',
       pg_temp.versions('page_sections', 'page_key = ''home'''),
       (select jsonb_agg(jsonb_build_object('id', id, 'section_type', section_type,
                 'is_visible', section_type <> 'publications', 'settings', settings) order by
                 case section_type when 'institutions' then 1.5 else sort_order end)
        from public.page_sections where page_key = 'home' and section_type <> 'text')
       || '[{"section_type": "cta", "settings": {"title": "Chamada (teste)", "cta_label": "Contato", "cta_href": "/contato"}}]'::jsonb
     ) $$,
  'editor reordena, oculta seções e adiciona um bloco'
);
select is(
  (select array_agg(section_type order by sort_order) from public.page_sections where page_key = 'home'),
  array['hero', 'about', 'institutions', 'research', 'projects', 'publications', 'cooperation', 'cta'],
  'nova ordem gravada, bloco omitido excluído e bloco novo no fim'
);
select is(
  (select is_visible from public.page_sections where page_key = 'home' and section_type = 'publications'),
  false,
  'seção ocultada'
);
select throws_ok(
  $$ select public.save_page_sections('home', pg_temp.versions('page_sections', 'page_key = ''home'''),
       (select jsonb_agg(jsonb_build_object('id', id, 'section_type', section_type, 'settings', settings))
        from public.page_sections where page_key = 'home' and section_type <> 'hero')) $$,
  '42501', null, 'seção nativa não pode ser excluída'
);
select throws_ok(
  $$ select public.save_page_sections('home', pg_temp.versions('page_sections', 'page_key = ''home'''),
       (select jsonb_agg(jsonb_build_object('id', id, 'section_type', section_type, 'settings', settings))
        from public.page_sections where page_key = 'home')
       || '[{"section_type": "hero", "settings": {}}]'::jsonb) $$,
  '42501', null, 'segunda seção nativa não pode ser criada'
);
select throws_ok(
  $$ select public.save_page_sections('home', pg_temp.versions('page_sections', 'page_key = ''home'''),
       (select jsonb_agg(jsonb_build_object('id', id, 'section_type',
                 case section_type when 'cta' then 'text' else section_type end, 'settings', settings))
        from public.page_sections where page_key = 'home')) $$,
  '42501', null, 'tipo de uma seção existente não muda'
);
select throws_ok(
  $$ select public.save_page_sections('home', pg_temp.versions('page_sections', 'page_key = ''home'''),
       (select jsonb_agg(jsonb_build_object('id', id, 'section_type', section_type,
                 'settings', case section_type when 'cta' then '{"html": "<script>"}'::jsonb else settings end))
        from public.page_sections where page_key = 'home')) $$,
  '23514', null, 'configuração com chave desconhecida é recusada'
);
select throws_ok(
  $$ select public.save_page_sections('home', pg_temp.versions('page_sections', 'page_key = ''home'''),
       '[{"section_type": "html", "settings": {}}]'::jsonb) $$,
  '42501', null, 'tipo de bloco desconhecido é recusado'
);
select throws_ok(
  $$ select public.save_page_sections('contato', '[]', '[]') $$,
  '22023', null, 'página fora da lista é recusada'
);
select throws_ok(
  $$ insert into public.page_sections (page_key, section_type, settings)
     values ('home', 'image_text', '{"image_path": "uploads/00000000-0000-4000-8000-000000000000.jpg"}') $$,
  'GL422', null, 'bloco com imagem inexistente na biblioteca é recusado'
);

-- Textos das páginas: editor altera; não cria nem exclui.
with changed as (
  update public.page_content set title = 'Projetos (teste)', seo_description = 'Descrição (teste)'
  where page_key = 'projetos' returning 1
)
select is((select count(*)::int from changed), 1, 'editor altera o texto de uma página');
select throws_ok(
  $$ insert into public.page_content (page_key) values ('rede') $$,
  '42501', null, 'editor não cria páginas'
);
select throws_ok(
  $$ update public.page_content set seo_image_path = 'https://example.test/x.png' where page_key = 'projetos' $$,
  '23514', null, 'imagem de compartilhamento externa é recusada'
);

-- Configurações globais: somente admin.
select throws_ok(
  $$ select public.save_site_navigation('header', pg_temp.versions('site_navigation', 'location = ''header'''), '[]') $$,
  '42501', null, 'editor não altera a navegação'
);
with changed as (update public.site_appearance set primary_color = '#000000' returning 1)
select is((select count(*)::int from changed), 0, 'editor não altera a aparência');
with changed as (update public.site_settings set footer_note = 'editor' returning 1)
select is((select count(*)::int from changed), 0, 'editor não altera o rodapé');

reset role;

-- Admin -------------------------------------------------------------------------

select pg_temp.act_as('b9500000-0000-4000-8000-000000000001');
set local role authenticated;

select lives_ok(
  $$ select public.save_site_navigation(
       'header',
       pg_temp.versions('site_navigation', 'location = ''header'''),
       (select jsonb_agg(jsonb_build_object('id', id, 'label', label, 'href', href, 'is_visible', is_visible) order by sort_order desc)
        from public.site_navigation where location = 'header' and label not like '%(teste)')
       || '[{"label": "Externo (teste)", "href": "https://example.test/", "open_in_new_tab": true}]'::jsonb
     ) $$,
  'admin reordena, adiciona e remove links do cabeçalho'
);
select is(
  (select array_agg(href order by sort_order) from public.site_navigation where location = 'header'),
  array['/contato', '/publicacoes', '/projetos', '/pesquisa', '/rede', '/', 'https://example.test/'],
  'cabeçalho gravado na nova ordem'
);
select is(
  (select count(*)::int from public.site_navigation where location = 'footer'),
  7,
  'rodapé não é afetado pela gravação do cabeçalho'
);
select throws_ok(
  $$ select public.save_site_navigation('header', pg_temp.versions('site_navigation', 'location = ''header'''),
       '[{"label": "Mal", "href": "javascript:alert(1)"}]') $$,
  '23514', null, 'link javascript: é recusado no menu'
);
select throws_ok(
  $$ select public.save_site_navigation('footer', pg_temp.versions('site_navigation', 'location = ''header'''), '[]') $$,
  'GL409', null, 'versões de outra lista são recusadas'
);
select throws_ok(
  $$ select public.save_site_navigation('sidebar', '[]', '[]') $$,
  '22023', null, 'local de menu desconhecido é recusado'
);
with changed as (
  update public.site_appearance
     set primary_color = '#1a4d2e', button_shape = 'rounded', heading_font = 'sans'
  returning 1
)
select is((select count(*)::int from changed), 1, 'admin altera a aparência');
select throws_ok(
  $$ update public.site_appearance set primary_color = 'red; background: url(x)' $$,
  '23514', null, 'cor fora do formato hexadecimal é recusada'
);
select throws_ok(
  $$ update public.site_appearance set button_shape = 'blob' $$,
  '23514', null, 'forma de botão fora da lista é recusada'
);
select throws_ok(
  $$ insert into public.site_appearance (button_shape) values ('pill') $$,
  '42501', null, 'admin não cria um segundo registro de aparência'
);
with changed as (
  update public.site_settings
     set footer_description = 'Rodapé (teste)', footer_nav_title = 'Navegação', footer_logo_mode = 'institutional'
  returning 1
)
select is((select count(*)::int from changed), 1, 'admin altera o rodapé');
select throws_ok(
  $$ update public.site_settings set footer_logo_mode = 'custom', footer_logo_path = null $$,
  '23514', null, 'logotipo próprio do rodapé exige uma imagem'
);
select throws_ok(
  $$ update public.site_settings set footer_logo_path = 'https://example.test/logo.png', footer_logo_mode = 'custom' $$,
  '23514', null, 'logotipo do rodapé externo é recusado'
);

reset role;

-- Uso de mídia --------------------------------------------------------------------

update public.page_content set seo_image_path = '/images/tst.jpg' where page_key = 'pesquisa';
insert into public.page_sections (page_key, section_type, settings)
values ('rede', 'gallery', '{"images": [{"path": "/images/tst.jpg", "alt": "Teste"}]}');

select is(
  (select count(*)::int from public.media_usage('/images/tst.jpg')),
  2,
  'media_usage encontra imagens de textos de página e de blocos'
);

select * from finish();

rollback;
