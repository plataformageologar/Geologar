-- =============================================================================
-- Experiências digitais (Etapa 10.6): validação da seção `experiences`,
-- conteúdo inicial em rascunho, publicação pelo fluxo editorial, histórico,
-- restauração de versões anteriores à seção, imagens e permissões.
--
-- Executar: `npx supabase test db` (local) ou `npx supabase test db --remote`.
-- Tudo roda numa transação desfeita no final (ROLLBACK): contas de teste
-- (example.test), rascunhos, publicações e o objeto de storage são
-- temporários; nenhum dado real é alterado.
-- =============================================================================

begin;

create extension if not exists pgtap with schema extensions;

select plan(49);

-- Fixtures ---------------------------------------------------------------------

insert into auth.users (id, email, aud, role)
values
  ('c1060000-0000-4000-8000-000000000001', 'admin@example.test', 'authenticated', 'authenticated'),
  ('c1060000-0000-4000-8000-000000000002', 'editor@example.test', 'authenticated', 'authenticated'),
  ('c1060000-0000-4000-8000-000000000003', 'inativo@example.test', 'authenticated', 'authenticated'),
  ('c1060000-0000-4000-8000-000000000004', 'pendente@example.test', 'authenticated', 'authenticated'),
  ('c1060000-0000-4000-8000-000000000005', 'comum@example.test', 'authenticated', 'authenticated');

insert into public.admin_memberships (user_id, role, is_active, must_change_password, password_change_required_at)
values
  ('c1060000-0000-4000-8000-000000000001', 'admin', true, false, null),
  ('c1060000-0000-4000-8000-000000000002', 'editor', true, false, null),
  ('c1060000-0000-4000-8000-000000000003', 'editor', false, false, null),
  ('c1060000-0000-4000-8000-000000000004', 'editor', true, true, now());

-- Imagem temporária na biblioteca (só a linha de metadados; nenhum arquivo).
insert into storage.objects (bucket_id, name, metadata, user_metadata)
values ('geologar-media', 'uploads/c1060000-0000-4000-8000-0000000000aa.webp',
        '{"mimetype": "image/webp", "size": 10}', '{"original_name": "experiencia.webp"}');

create function pg_temp.act_as(user_id uuid, email text) returns void
language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', user_id, 'role', 'authenticated', 'email', email)::text, true);
$$;

create function pg_temp.home_id() returns uuid
language sql as $$ select id from public.editorial_documents where doc_type = 'home' and doc_key = 'home' $$;
create function pg_temp.home_version() returns integer
language sql as $$ select version from public.editorial_documents where doc_type = 'home' and doc_key = 'home' $$;
grant execute on function pg_temp.home_id(), pg_temp.home_version() to authenticated;

-- Seção mínima válida (usada para montar os casos inválidos).
create function pg_temp.card(extra jsonb default '{}') returns jsonb
language sql as $$
  select jsonb_build_object(
    'id', 'c1060000-0000-4000-8000-0000000000c1',
    'title', 'Experiência de teste',
    'availability', 'coming_soon',
    'is_visible', true,
    'open_in_new_tab', true
  ) || extra
$$;
create function pg_temp.settings(cards jsonb, extra jsonb default '{}') returns jsonb
language sql as $$ select jsonb_build_object('title', 'Experiências', 'columns', 2, 'experiences', cards) || extra $$;
grant execute on function pg_temp.card(jsonb), pg_temp.settings(jsonb, jsonb) to authenticated;

-- 1. Endereços ------------------------------------------------------------------

select ok(public.is_valid_experience_url('https://bernardo-aeonvr.github.io/Geologar-2/'), 'aceita URL https com caminho');
select ok(not public.is_valid_experience_url('http://example.org/experiencia'), 'recusa http (sem TLS)');
select ok(not public.is_valid_experience_url('javascript:alert(1)'), 'recusa javascript:');
select ok(not public.is_valid_experience_url('data:text/html;base64,PHNjcmlwdD4='), 'recusa data:');
select ok(not public.is_valid_experience_url('file:///etc/passwd'), 'recusa file:');
select ok(not public.is_valid_experience_url('https://usuario:senha@example.org/'), 'recusa usuário e senha no endereço');
select ok(not public.is_valid_experience_url('#'), 'recusa "#" como endereço');
select ok(not public.is_valid_experience_url('https://example .org/x'), 'recusa espaços');
select ok(not public.is_valid_experience_url('https://localhost/x'), 'recusa endereço sem domínio');

-- 2. Configurações da seção --------------------------------------------------------

select ok(public.is_valid_section_settings('experiences', pg_temp.settings(jsonb_build_array(pg_temp.card()))),
  'seção mínima com um card "em breve" é válida');
select ok(public.is_valid_section_settings('experiences', pg_temp.settings(jsonb_build_array(pg_temp.card(
  '{"availability": "available", "external_url": "https://example.org/tour", "image_path": "uploads/c1060000-0000-4000-8000-0000000000aa.webp", "image_alt": "Pedreira"}')))),
  'card disponível com URL e imagem da biblioteca é válido');
select ok(not public.is_valid_section_settings('experiences', pg_temp.settings(jsonb_build_array(pg_temp.card(
  '{"availability": "available"}')))), 'disponível sem URL é recusado');
select ok(not public.is_valid_section_settings('experiences', pg_temp.settings(jsonb_build_array(pg_temp.card(
  '{"html": "<script>x</script>"}')))), 'chave desconhecida no card é recusada');
select ok(not public.is_valid_section_settings('experiences', pg_temp.settings(
  jsonb_build_array(pg_temp.card(), pg_temp.card()))), 'ids repetidos são recusados');
select ok(not public.is_valid_section_settings('experiences', pg_temp.settings(jsonb_build_array(pg_temp.card(
  '{"id": "1"}')))), 'id fora do formato UUID é recusado');
select ok(not public.is_valid_section_settings('experiences', pg_temp.settings(jsonb_build_array(pg_temp.card(
  '{"availability": "beta"}')))), 'disponibilidade desconhecida é recusada');
select ok(not public.is_valid_section_settings('experiences', pg_temp.settings(jsonb_build_array(pg_temp.card(
  '{"title": "   "}')))), 'título vazio é recusado');
select ok(not public.is_valid_section_settings('experiences', pg_temp.settings(jsonb_build_array(pg_temp.card(
  jsonb_build_object('description', repeat('a', 401)))))), 'descrição acima de 400 caracteres é recusada');
select ok(not public.is_valid_section_settings('experiences', pg_temp.settings(jsonb_build_array(pg_temp.card(
  '{"image_path": "https://example.org/foto.png"}')))), 'imagem fora da biblioteca é recusada');
select ok(not public.is_valid_section_settings('experiences', pg_temp.settings(jsonb_build_array(pg_temp.card(
  '{"availability": "available", "external_url": "javascript:alert(1)"}')))), 'URL maliciosa é recusada');
select ok(not public.is_valid_section_settings('experiences', pg_temp.settings(
  (select jsonb_agg(pg_temp.card(jsonb_build_object('id', format('c1060000-0000-4000-8000-%s', lpad(n::text, 12, '0')))))
   from generate_series(1, 13) as n))), 'mais de 12 experiências é recusado');
select ok(not public.is_valid_section_settings('experiences', pg_temp.settings('[]', '{"columns": 4}')),
  'quatro colunas não é opção para experiências');
select ok(not public.is_valid_section_settings('text', '{"experiences": []}'),
  'outros tipos não aceitam a lista de experiências');
select is(
  (select array_agg(path order by path) from public.section_image_paths(pg_temp.settings(jsonb_build_array(pg_temp.card(
    '{"image_path": "uploads/c1060000-0000-4000-8000-0000000000aa.webp"}')))) as path),
  array['uploads/c1060000-0000-4000-8000-0000000000aa.webp'],
  'section_image_paths inclui as imagens das experiências'
);

-- 3. Conteúdo editorial: só na página inicial, uma por página -----------------------------

select ok(not public.is_valid_editorial_content('rede', jsonb_build_object(
  'page', '{}'::jsonb,
  'sections', jsonb_build_array(jsonb_build_object('id', null, 'section_type', 'experiences', 'is_visible', true,
    'settings', pg_temp.settings('[]'))))), 'A Rede não recebe a seção de experiências');
select ok(not public.is_valid_editorial_content('home', jsonb_set(public.editorial_snapshot('home', 'home'), '{sections}',
  (public.editorial_snapshot('home', 'home') -> 'sections') || jsonb_build_array(
    jsonb_build_object('id', null, 'section_type', 'experiences', 'is_visible', true, 'settings', pg_temp.settings('[]')),
    jsonb_build_object('id', null, 'section_type', 'experiences', 'is_visible', true, 'settings', pg_temp.settings('[]'))))),
  'duas seções de experiências na mesma página são recusadas');

-- 4. Conteúdo inicial (migration) --------------------------------------------------
-- A migration grava a seção só no rascunho. Depois que a equipe publica (em
-- produção: revisão 5, 24/11/2026), o conteúdo passa a valer no publicado;
-- as verificações usam o rascunho pendente ou, sem rascunho, o publicado.

create function pg_temp.home_content() returns jsonb
language sql as $$
  select coalesce(d.draft, public.editorial_snapshot('home', 'home'))
  from public.editorial_documents d where d.id = pg_temp.home_id()
$$;

select ok(
  jsonb_path_exists(pg_temp.home_content(), '$.sections[*] ? (@.section_type == "experiences")'),
  'a página inicial (rascunho ou publicada) tem a seção de experiências'
);
select is(
  jsonb_path_query_array(pg_temp.home_content(), '$.sections[*] ? (@.section_type == "experiences").settings.experiences[*].availability'),
  '["available", "coming_soon"]'::jsonb,
  'Bege Bahia disponível e a segunda experiência "em breve"'
);
select is(
  jsonb_path_query_array(pg_temp.home_content(), '$.sections[*] ? (@.section_type == "experiences").settings.experiences[1].external_url'),
  '[]'::jsonb,
  'a experiência provisória não tem endereço'
);
select ok(
  exists (select 1 from public.editorial_revisions
          where document_id = pg_temp.home_id() and operation = 'draft_saved' and note like 'Etapa 10.6:%'),
  'o conteúdo inicial ficou registrado no histórico'
);
select ok(
  (select count(*) from public.page_sections where section_type = 'experiences') =
  (case when (select draft from public.editorial_documents where id = pg_temp.home_id()) is null then 1 else
     (select count(*) from public.page_sections where section_type = 'experiences') end),
  'a migration não publica: a seção só aparece no site depois de publicada pelo fluxo'
);

-- 5. Publicação pelo fluxo editorial --------------------------------------------------

select pg_temp.act_as('c1060000-0000-4000-8000-000000000002', 'editor@example.test');
set local role authenticated;

select lives_ok(
  format($$ select public.save_editorial_drafts(jsonb_build_array(jsonb_build_object(
    'id', %L, 'version', %s, 'content', %L::jsonb))) $$,
    pg_temp.home_id(), pg_temp.home_version(), pg_temp.home_content()),
  'editor grava a página inicial com a seção de experiências como rascunho'
);
select lives_ok(
  format($$ select public.publish_editorial_documents(jsonb_build_array(jsonb_build_object('id', %L, 'version', %s)), null) $$,
    pg_temp.home_id(), pg_temp.home_version()),
  'editor publica a página inicial com a seção de experiências'
);
-- A publicação acima ligou a escrita editorial nesta transação; fora das
-- funções do fluxo ela fica desligada.
select set_config('geologar.editorial_write', '', true);
select throws_ok(
  $$ update public.page_sections set is_visible = false where section_type = 'experiences' $$,
  'GL403',
  null,
  'gravação direta fora do fluxo é recusada'
);

reset role;
set local role anon;
select is(
  (select jsonb_array_length(settings -> 'experiences') from public.page_sections where section_type = 'experiences'),
  2,
  'visitantes leem a seção publicada com as duas experiências'
);
select throws_ok(
  $$ select count(*) from public.editorial_documents $$,
  '42501',
  null,
  'visitantes não leem rascunhos'
);

reset role;
select throws_ok(
  $$ insert into public.page_sections (page_key, section_type, sort_order, settings)
     values ('home', 'experiences', 99, '{"experiences": []}') $$,
  '23505',
  null,
  'só existe uma seção de experiências na página inicial'
);
select throws_ok(
  $$ insert into public.page_sections (page_key, section_type, sort_order, settings)
     values ('rede', 'experiences', 99, '{"experiences": []}') $$,
  '23514',
  null,
  'a seção não existe em A Rede'
);

-- 6. Imagens: biblioteca, existência e proteção contra exclusão ------------------------

select pg_temp.act_as('c1060000-0000-4000-8000-000000000002', 'editor@example.test');
set local role authenticated;

select throws_ok(
  format($$ select public.save_editorial_drafts(jsonb_build_array(jsonb_build_object(
    'id', %L, 'version', %s,
    'content', jsonb_set(public.editorial_snapshot('home', 'home'), '{sections}',
      (select jsonb_agg(case when s ->> 'section_type' = 'experiences'
         then jsonb_set(s, '{settings,experiences,0,image_path}', '"uploads/c1060000-0000-4000-8000-0000000000ff.webp"')
         else s end)
       from jsonb_array_elements(public.editorial_snapshot('home', 'home') -> 'sections') s))))) $$,
    pg_temp.home_id(), pg_temp.home_version()),
  'GL422',
  null,
  'imagem inexistente na biblioteca é recusada'
);
select lives_ok(
  format($$ select public.save_editorial_drafts(jsonb_build_array(jsonb_build_object(
    'id', %L, 'version', %s,
    'content', jsonb_set(public.editorial_snapshot('home', 'home'), '{sections}',
      (select jsonb_agg(case when s ->> 'section_type' = 'experiences'
         then jsonb_set(s, '{settings,experiences,0,image_path}', '"uploads/c1060000-0000-4000-8000-0000000000aa.webp"')
         else s end)
       from jsonb_array_elements(public.editorial_snapshot('home', 'home') -> 'sections') s))))) $$,
    pg_temp.home_id(), pg_temp.home_version()),
  'editor troca a capa por uma imagem da biblioteca (rascunho)'
);
select lives_ok(
  format($$ select public.publish_editorial_documents(jsonb_build_array(jsonb_build_object('id', %L, 'version', %s)), null) $$,
    pg_temp.home_id(), pg_temp.home_version()),
  'editor publica a nova capa'
);

reset role;
select ok(
  'page-section' = any (select entity from public.media_usage('uploads/c1060000-0000-4000-8000-0000000000aa.webp')),
  'a imagem da experiência aparece no uso da biblioteca'
);
select ok(
  not public.media_object_deletable('uploads/c1060000-0000-4000-8000-0000000000aa.webp'),
  'imagem usada por uma experiência não pode ser excluída'
);

-- 7. Restauração de uma versão anterior à seção -----------------------------------------

select pg_temp.act_as('c1060000-0000-4000-8000-000000000002', 'editor@example.test');
set local role authenticated;

select lives_ok(
  format($$ select public.restore_editorial_revision(
    (select id from public.editorial_revisions where document_id = %L and revision_number = 1),
    %s,
    (select content from public.editorial_revisions where document_id = %L and revision_number = 1)) $$,
    pg_temp.home_id(), pg_temp.home_version(), pg_temp.home_id()),
  'uma revisão anterior à seção continua restaurável (vira rascunho)'
);
select lives_ok(
  format($$ select public.publish_editorial_documents(jsonb_build_array(jsonb_build_object('id', %L, 'version', %s)), null) $$,
    pg_temp.home_id(), pg_temp.home_version()),
  'publicar a versão restaurada é permitido'
);
select is((select count(*)::int from public.page_sections where section_type = 'experiences'), 0,
  'a versão restaurada não tem a seção (ela é removida pelo fluxo)');

-- 8. Permissões --------------------------------------------------------------------

reset role;
select pg_temp.act_as('c1060000-0000-4000-8000-000000000004', 'pendente@example.test');
set local role authenticated;
select throws_ok(
  format($$ select public.save_editorial_drafts(jsonb_build_array(jsonb_build_object(
    'id', %L, 'version', 1, 'content', '{}'::jsonb))) $$, pg_temp.home_id()),
  '42501',
  null,
  'editor com troca de senha pendente não edita as experiências'
);

reset role;
select pg_temp.act_as('c1060000-0000-4000-8000-000000000003', 'inativo@example.test');
set local role authenticated;
select throws_ok(
  format($$ select public.save_editorial_drafts(jsonb_build_array(jsonb_build_object(
    'id', %L, 'version', 1, 'content', '{}'::jsonb))) $$, pg_temp.home_id()),
  '42501',
  null,
  'editor desativado não edita as experiências'
);

reset role;
select pg_temp.act_as('c1060000-0000-4000-8000-000000000005', 'comum@example.test');
set local role authenticated;
select throws_ok(
  format($$ select public.save_editorial_drafts(jsonb_build_array(jsonb_build_object(
    'id', %L, 'version', 1, 'content', '{}'::jsonb))) $$, pg_temp.home_id()),
  '42501',
  null,
  'usuário autenticado sem vínculo não edita as experiências'
);

reset role;
select * from finish();
rollback;
