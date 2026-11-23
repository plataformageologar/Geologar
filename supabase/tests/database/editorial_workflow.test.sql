-- =============================================================================
-- Fluxo editorial (Etapa 9.6): rascunhos, publicação transacional, histórico,
-- restauração, páginas personalizadas, guarda contra gravação direta, RLS por
-- papel e referências de imagens.
--
-- Executar: `npx supabase test db` (local) ou `npx supabase test db --remote`.
-- Tudo roda numa transação desfeita no final (ROLLBACK): contas de teste
-- (example.test), rascunhos, revisões, páginas e o objeto de storage são
-- temporários; nenhum dado real é alterado.
-- =============================================================================

begin;

create extension if not exists pgtap with schema extensions;

select plan(61);

-- Fixtures ---------------------------------------------------------------------

insert into auth.users (id, email, aud, role)
values
  ('c9600000-0000-4000-8000-000000000001', 'admin@example.test', 'authenticated', 'authenticated'),
  ('c9600000-0000-4000-8000-000000000002', 'editor@example.test', 'authenticated', 'authenticated'),
  ('c9600000-0000-4000-8000-000000000003', 'inativo@example.test', 'authenticated', 'authenticated'),
  ('c9600000-0000-4000-8000-000000000004', 'comum@example.test', 'authenticated', 'authenticated');

insert into public.admin_memberships (user_id, role, is_active)
values
  ('c9600000-0000-4000-8000-000000000001', 'admin', true),
  ('c9600000-0000-4000-8000-000000000002', 'editor', true),
  ('c9600000-0000-4000-8000-000000000003', 'editor', false);

-- Imagem temporária na biblioteca (só a linha de metadados; nenhum arquivo).
insert into storage.objects (bucket_id, name, metadata, user_metadata)
values ('geologar-media', 'uploads/c9600000-0000-4000-8000-0000000000aa.png',
        '{"mimetype": "image/png", "size": 10}', '{"original_name": "teste.png"}');

create function pg_temp.act_as(user_id uuid, email text) returns void
language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', user_id, 'role', 'authenticated', 'email', email)::text, true);
$$;

create temporary table t_ids (name text primary key, id uuid, n integer);
grant all on t_ids to anon, authenticated;

create function pg_temp.doc_version(p_type text) returns integer
language sql as $$ select version from public.editorial_documents where doc_type = p_type and doc_key = p_type $$;
create function pg_temp.doc_id(p_type text) returns uuid
language sql as $$ select id from public.editorial_documents where doc_type = p_type and doc_key = p_type $$;
grant execute on function pg_temp.doc_version(text), pg_temp.doc_id(text) to authenticated;

create temporary table t_text (name text primary key, value text);
grant all on t_text to anon, authenticated;
insert into t_text values ('hero_title', (select hero_title from public.homepage_content limit 1));

-- Estado inicial ---------------------------------------------------------------

select is(
  (select count(*)::int from public.editorial_documents where doc_type <> 'custom'),
  11,
  'uma unidade editorial para cada conteúdo publicado'
);

select is(
  (select count(*)::int from public.editorial_documents d
   join public.editorial_revisions r on r.id = d.published_revision_id
   where d.doc_type <> 'custom' and r.operation = 'published'),
  11,
  'cada unidade aponta para a revisão publicada inicial'
);

select is(
  (select r.content from public.editorial_revisions r
   join public.editorial_documents d on d.id = r.document_id
   where d.doc_type = 'home' and r.revision_number = 1),
  public.editorial_snapshot('home', 'home'),
  'a revisão inicial da homepage é igual ao conteúdo publicado'
);

-- Visitante e usuário sem vínculo ------------------------------------------------

set local role anon;

select throws_ok(
  $$ select count(*) from public.editorial_documents $$,
  '42501',
  null,
  'visitante não lê rascunhos'
);
select throws_ok(
  $$ select count(*) from public.editorial_revisions $$,
  '42501',
  null,
  'visitante não lê o histórico'
);
select throws_ok(
  $$ select public.save_editorial_drafts('[]') $$,
  '42501',
  null,
  'visitante não executa o fluxo editorial'
);

reset role;
select pg_temp.act_as('c9600000-0000-4000-8000-000000000004', 'comum@example.test');
set local role authenticated;

select is(
  (select count(*)::int from public.editorial_documents),
  0,
  'usuário sem vínculo não vê documentos editoriais'
);
select throws_ok(
  $$ select public.create_custom_page('Página (teste)', 'pagina-teste-comum', null) $$,
  '42501',
  null,
  'usuário sem vínculo não cria páginas'
);

reset role;

-- Guarda: o caminho antigo de gravação direta está fechado -----------------------

select pg_temp.act_as('c9600000-0000-4000-8000-000000000002', 'editor@example.test');
set local role authenticated;

select throws_ok(
  $$ update public.homepage_content set hero_title = 'Direto (teste)' $$,
  'GL403',
  null,
  'editor não altera a homepage publicada diretamente'
);
select throws_ok(
  $$ select public.save_site_pillars(
       coalesce((select jsonb_agg(jsonb_build_object('id', id, 'updated_at', updated_at)) from public.site_pillars), '[]'),
       '[]') $$,
  'GL403',
  null,
  'a função antiga de pilares não publica fora do fluxo'
);
select throws_ok(
  format($$ insert into public.editorial_revisions (document_id, revision_number, operation, content, author_id)
            values (%L, 999, 'published', '{}', %L) $$,
         pg_temp.doc_id('home'), 'c9600000-0000-4000-8000-000000000002'),
  'GL403',
  null,
  'revisões não são inseridas fora do fluxo'
);
select throws_ok(
  format($$ update public.editorial_documents set draft = '{}' where id = %L $$, pg_temp.doc_id('home')),
  'GL403',
  null,
  'rascunhos não são gravados fora do fluxo'
);

-- Rascunho do editor ---------------------------------------------------------------

select is(
  (select count(*)::int from public.editorial_documents where doc_type in ('appearance', 'navigation', 'settings')),
  0,
  'editor não vê as unidades globais restritas a administradores'
);

select lives_ok(
  format($$ select public.save_editorial_drafts(jsonb_build_array(jsonb_build_object(
    'id', %L, 'version', %s,
    'content', jsonb_set(public.editorial_snapshot('home', 'home'), '{homepage,hero_title}', '"Título em rascunho (teste)"')
  ))) $$, pg_temp.doc_id('home'), pg_temp.doc_version('home')),
  'editor salva um rascunho da homepage'
);

select is(
  (select draft #>> '{homepage,hero_title}' from public.editorial_documents where doc_type = 'home'),
  'Título em rascunho (teste)',
  'o rascunho fica salvo no banco'
);
select is(
  (select hero_title from public.homepage_content limit 1),
  (select value from t_text where name = 'hero_title'),
  'o conteúdo publicado não muda ao salvar o rascunho'
);
select is(
  (select operation || ':' || author_id || ':' || author_email from public.editorial_revisions
   where document_id = pg_temp.doc_id('home') order by revision_number desc limit 1),
  'draft_saved:c9600000-0000-4000-8000-000000000002:editor@example.test',
  'a revisão registra a operação e o autor autenticado'
);

select throws_ok(
  format($$ select public.save_editorial_drafts(jsonb_build_array(jsonb_build_object(
    'id', %L, 'version', %s, 'content', public.editorial_snapshot('home', 'home')))) $$,
    pg_temp.doc_id('home'), pg_temp.doc_version('home') - 1),
  'GL409',
  null,
  'versão desatualizada é recusada (edição simultânea)'
);
select throws_ok(
  format($$ select public.save_editorial_drafts(jsonb_build_array(jsonb_build_object(
    'id', %L, 'version', %s,
    'content', public.editorial_snapshot('home', 'home') || '{"sql": "drop table x"}'))) $$,
    pg_temp.doc_id('home'), pg_temp.doc_version('home')),
  '22023',
  null,
  'conteúdo com chaves desconhecidas é recusado'
);
select throws_ok(
  format($$ select public.save_editorial_drafts(jsonb_build_array(jsonb_build_object(
    'id', %L, 'version', %s,
    'content', jsonb_set(public.editorial_snapshot('home', 'home'), '{sections}',
      '[{"id": null, "section_type": "html", "is_visible": true, "settings": {"html": "<script>x</script>"}}]')))) $$,
    pg_temp.doc_id('home'), pg_temp.doc_version('home')),
  '22023',
  null,
  'bloco de tipo desconhecido é recusado'
);
select throws_ok(
  format($$ select public.save_editorial_drafts(jsonb_build_array(jsonb_build_object(
    'id', %L, 'version', %s,
    'content', jsonb_set(public.editorial_snapshot('home', 'home'), '{homepage,hero_image_path}',
      '"uploads/c9600000-0000-4000-8000-0000000000ff.png"')))) $$,
    pg_temp.doc_id('home'), pg_temp.doc_version('home')),
  'GL422',
  null,
  'imagem inexistente na biblioteca é recusada no rascunho'
);

reset role;
insert into t_ids (name, id, n)
select 'appearance', id, version from public.editorial_documents where doc_type = 'appearance';
select pg_temp.act_as('c9600000-0000-4000-8000-000000000002', 'editor@example.test');
set local role authenticated;

select throws_ok(
  $$ select public.save_editorial_drafts(jsonb_build_array(jsonb_build_object(
    'id', (select id from t_ids where name = 'appearance'), 'version', (select n from t_ids where name = 'appearance'),
    'content', '{"appearance": {"primary_color": "#0b3d2e"}}'::jsonb))) $$,
  '42501',
  null,
  'editor não salva rascunho de aparência'
);

-- Publicação -----------------------------------------------------------------------

select lives_ok(
  format($$ select public.publish_editorial_documents(jsonb_build_array(jsonb_build_object('id', %L, 'version', %s)), null) $$,
    pg_temp.doc_id('home'), pg_temp.doc_version('home')),
  'editor publica a homepage'
);
select is(
  (select hero_title from public.homepage_content limit 1),
  'Título em rascunho (teste)',
  'a publicação atualiza o conteúdo publicado'
);
select is(
  (select (d.draft is null) and r.operation = 'published' and r.content = public.editorial_snapshot('home', 'home')
   from public.editorial_documents d join public.editorial_revisions r on r.id = d.published_revision_id
   where d.doc_type = 'home'),
  true,
  'o rascunho é limpo e a revisão publicada retrata as tabelas públicas'
);
select throws_ok(
  format($$ select public.publish_editorial_documents(jsonb_build_array(jsonb_build_object('id', %L, 'version', %s)), null) $$,
    pg_temp.doc_id('home'), pg_temp.doc_version('home')),
  'GL404',
  null,
  'sem rascunho não há o que publicar'
);

-- Atomicidade: uma unidade sem permissão desfaz a publicação inteira.
select lives_ok(
  format($$ select public.save_editorial_drafts(jsonb_build_array(jsonb_build_object(
    'id', %L, 'version', %s,
    'content', jsonb_set(public.editorial_snapshot('home', 'home'), '{homepage,hero_title}', '"Título parcial (teste)"')
  ))) $$, pg_temp.doc_id('home'), pg_temp.doc_version('home')),
  'editor salva outro rascunho'
);
select throws_ok(
  format($$ select public.publish_editorial_documents(jsonb_build_array(
    jsonb_build_object('id', %L, 'version', %s),
    jsonb_build_object('id', (select id from t_ids where name = 'appearance'), 'version', (select n from t_ids where name = 'appearance'))
  ), null) $$, pg_temp.doc_id('home'), pg_temp.doc_version('home')),
  '42501',
  null,
  'publicação com uma unidade proibida falha'
);
select is(
  (select hero_title from public.homepage_content limit 1),
  'Título em rascunho (teste)',
  'nada foi publicado parcialmente'
);

-- Restauração: vira rascunho, não publica.
select lives_ok(
  format($$ select public.restore_editorial_revision(
    (select id from public.editorial_revisions where document_id = %L and revision_number = 1),
    %s,
    (select content from public.editorial_revisions where document_id = %L and revision_number = 1)) $$,
    pg_temp.doc_id('home'), pg_temp.doc_version('home'), pg_temp.doc_id('home')),
  'editor restaura a revisão 1 como rascunho'
);
select is(
  (select hero_title from public.homepage_content limit 1),
  'Título em rascunho (teste)',
  'restaurar não altera o site publicado'
);
select is(
  (select r.operation || ':' || (r.restored_from_id = (select id from public.editorial_revisions x
     where x.document_id = r.document_id and x.revision_number = 1))::text
   from public.editorial_revisions r where r.document_id = pg_temp.doc_id('home')
   order by r.revision_number desc limit 1),
  'restored:true',
  'a restauração gera uma nova revisão ligada à original'
);
select lives_ok(
  format($$ select public.publish_editorial_documents(jsonb_build_array(jsonb_build_object('id', %L, 'version', %s)), 'Restaura a versão inicial') $$,
    pg_temp.doc_id('home'), pg_temp.doc_version('home')),
  'editor publica a versão restaurada'
);
select is(
  (select hero_title from public.homepage_content limit 1),
  (select value from t_text where name = 'hero_title'),
  'o título original voltou ao site'
);
select is(
  (select count(*)::int from public.editorial_revisions where document_id = pg_temp.doc_id('home') and operation = 'published'),
  3,
  'o histórico preserva todas as publicações anteriores'
);

-- Histórico imutável.
select throws_ok(
  $$ update public.editorial_revisions set note = 'alterado' $$,
  '42501',
  null,
  'revisões não podem ser editadas'
);
select throws_ok(
  $$ delete from public.editorial_revisions $$,
  '42501',
  null,
  'revisões não podem ser excluídas'
);

-- Referências de imagem em rascunhos e no histórico protegem o arquivo.
select lives_ok(
  format($$ select public.save_editorial_drafts(jsonb_build_array(jsonb_build_object(
    'id', %L, 'version', %s,
    'content', jsonb_set(public.editorial_snapshot('home', 'home'), '{homepage}',
      (public.editorial_snapshot('home', 'home') -> 'homepage')
        || '{"hero_image_path": "uploads/c9600000-0000-4000-8000-0000000000aa.png", "hero_image_alt": "Teste"}')
  ))) $$, pg_temp.doc_id('home'), pg_temp.doc_version('home')),
  'rascunho com imagem da biblioteca é aceito'
);

reset role;
select pg_temp.act_as('c9600000-0000-4000-8000-000000000001', 'admin@example.test');
set local role authenticated;

select is(
  (select array_agg(entity order by entity) from public.media_usage('uploads/c9600000-0000-4000-8000-0000000000aa.png')),
  array['editorial-draft', 'editorial-revision'],
  'imagem citada em rascunho e histórico aparece como em uso'
);
select is(
  public.media_object_deletable('uploads/c9600000-0000-4000-8000-0000000000aa.png'),
  false,
  'imagem do histórico não pode ser excluída'
);

-- Administrador: unidades globais --------------------------------------------------

select lives_ok(
  $$ select public.save_editorial_drafts(jsonb_build_array(jsonb_build_object(
    'id', (select id from t_ids where name = 'appearance'), 'version', (select n from t_ids where name = 'appearance'),
    'content', jsonb_set(public.editorial_snapshot('appearance', 'appearance'), '{appearance,primary_color}', '"#0b3d2e"')))) $$,
  'administrador salva rascunho de aparência'
);
select is(
  (select primary_color from public.site_appearance limit 1) is distinct from '#0b3d2e',
  true,
  'aparência publicada não muda com o rascunho'
);
select lives_ok(
  $$ select public.publish_editorial_documents(jsonb_build_array(jsonb_build_object(
    'id', (select id from t_ids where name = 'appearance'), 'version', (select n from t_ids where name = 'appearance') + 1)), null) $$,
  'administrador publica a aparência'
);
select is(
  (select primary_color from public.site_appearance limit 1),
  '#0b3d2e',
  'aparência publicada'
);

reset role;

-- Conta inativa ----------------------------------------------------------------------

select pg_temp.act_as('c9600000-0000-4000-8000-000000000003', 'inativo@example.test');
set local role authenticated;

select is(
  (select count(*)::int from public.editorial_documents),
  0,
  'conta inativa não vê documentos'
);
select throws_ok(
  $$ select public.create_custom_page('Página (teste)', 'pagina-teste-inativa', null) $$,
  '42501',
  null,
  'conta inativa não cria páginas'
);

reset role;

-- Páginas personalizadas -------------------------------------------------------------

select pg_temp.act_as('c9600000-0000-4000-8000-000000000002', 'editor@example.test');
set local role authenticated;

select lives_ok(
  $$ insert into t_ids (name, id) values ('page', public.create_custom_page('Laboratórios (teste)', 'laboratorios-teste', 'Infraestrutura')) $$,
  'editor cria uma página em rascunho'
);
select is(
  (select status from public.custom_pages where id = (select id from t_ids where name = 'page')),
  'draft',
  'página nova começa como rascunho'
);
select throws_ok(
  $$ select public.create_custom_page('Outra (teste)', 'Lab Teste', null) $$,
  '23514',
  null,
  'endereço fora do formato é recusado'
);
select throws_ok(
  $$ select public.create_custom_page('Outra (teste)', 'laboratorios-teste', null) $$,
  '23505',
  null,
  'endereço repetido é recusado'
);

reset role;
set local role anon;
select is(
  (select count(*)::int from public.custom_pages where slug = 'laboratorios-teste'),
  0,
  'visitante não vê página em rascunho'
);
reset role;

update t_ids set n = (select version from public.editorial_documents where custom_page_id = t_ids.id) where name = 'page';
select pg_temp.act_as('c9600000-0000-4000-8000-000000000002', 'editor@example.test');
set local role authenticated;

select throws_ok(
  $$ select public.save_editorial_drafts(jsonb_build_array(jsonb_build_object(
    'id', (select id from public.editorial_documents where custom_page_id = (select id from t_ids where name = 'page')),
    'version', (select n from t_ids where name = 'page'),
    'content', jsonb_build_object('page', jsonb_build_object('title', 'Laboratórios (teste)'),
      'sections', '[{"id": null, "section_type": "hero", "is_visible": true, "settings": {}}]'::jsonb)))) $$,
  '22023',
  null,
  'página personalizada não aceita seções nativas'
);
select lives_ok(
  $$ select public.save_editorial_drafts(jsonb_build_array(jsonb_build_object(
    'id', (select id from public.editorial_documents where custom_page_id = (select id from t_ids where name = 'page')),
    'version', (select n from t_ids where name = 'page'),
    'content', jsonb_build_object('page', jsonb_build_object('title', 'Laboratórios (teste)', 'description', 'Infraestrutura'),
      'sections', '[{"id": null, "section_type": "text", "is_visible": true, "settings": {"title": "Apresentação"}},
                    {"id": null, "section_type": "cta", "is_visible": true, "settings": {"title": "Contato", "cta_label": "Fale conosco", "cta_href": "/contato"}}]'::jsonb)))) $$,
  'editor salva blocos da página'
);
select lives_ok(
  $$ select public.publish_editorial_documents(jsonb_build_array(jsonb_build_object(
    'id', (select id from public.editorial_documents where custom_page_id = (select id from t_ids where name = 'page')),
    'version', (select n from t_ids where name = 'page') + 1)), null) $$,
  'editor publica a página'
);
select throws_ok(
  $$ select public.update_custom_page_slug((select id from t_ids where name = 'page'), 'laboratorios-novo') $$,
  'GL423',
  null,
  'endereço de página publicada não muda'
);
select throws_ok(
  $$ select public.set_custom_page_status((select id from t_ids where name = 'page'), 'archive') $$,
  '42501',
  null,
  'editor não arquiva página já publicada'
);

reset role;
set local role anon;
select is(
  (select count(*)::int from public.custom_pages c join public.page_sections s on s.custom_page_id = c.id
   where c.slug = 'laboratorios-teste'),
  2,
  'visitante vê a página publicada e seus blocos'
);
reset role;

select pg_temp.act_as('c9600000-0000-4000-8000-000000000001', 'admin@example.test');
set local role authenticated;
select lives_ok(
  $$ select public.set_custom_page_status((select id from t_ids where name = 'page'), 'unpublish') $$,
  'administrador despublica a página'
);
reset role;
set local role anon;
select is(
  (select count(*)::int from public.page_sections where page_key = 'custom'
     and custom_page_id = (select id from t_ids where name = 'page')),
  0,
  'blocos de página despublicada deixam de ser públicos'
);
reset role;

select pg_temp.act_as('c9600000-0000-4000-8000-000000000001', 'admin@example.test');
set local role authenticated;
select lives_ok(
  $$ select public.set_custom_page_status((select id from t_ids where name = 'page'), 'archive') $$,
  'administrador arquiva a página'
);
select is(
  (select status || ':' || (select count(*) from public.page_sections where custom_page_id = c.id)::text
   from public.custom_pages c where c.id = (select id from t_ids where name = 'page')),
  'archived:2',
  'arquivar preserva os blocos'
);

reset role;

select * from finish();
rollback;
