-- =============================================================================
-- Biblioteca de mídia (Etapa 8): bucket geologar-media, policies de
-- storage.objects, referências de imagem nas tabelas editoriais,
-- save_project com imagem e list_media.
--
-- Executar: `npx supabase test db` (local) ou `npx supabase test db --remote`.
-- Tudo roda numa transação desfeita no final (ROLLBACK): contas, registros
-- (slugs "tst-") e linhas de storage.objects são temporários e nenhum arquivo
-- é enviado ao Storage (só os metadados do banco são simulados).
-- =============================================================================

begin;

create extension if not exists pgtap with schema extensions;

-- Etapa 9.6: estas tabelas só aceitam escrita pelo fluxo editorial (trigger
-- editorial_guard). Este teste verifica as regras da camada de baixo (RLS,
-- GRANTs e CHECKs usados pela publicação), então liga a mesma chave que as
-- funções do fluxo ligam. O fluxo em si: editorial_workflow.test.sql.
select set_config('geologar.editorial_write', 'on', true);

select plan(47);

-- Fixtures ---------------------------------------------------------------------

insert into auth.users (id, email, aud, role)
values
  ('b8000000-0000-4000-8000-000000000001', 'admin@example.test', 'authenticated', 'authenticated'),
  ('b8000000-0000-4000-8000-000000000002', 'editor@example.test', 'authenticated', 'authenticated'),
  ('b8000000-0000-4000-8000-000000000003', 'inativo@example.test', 'authenticated', 'authenticated'),
  ('b8000000-0000-4000-8000-000000000004', 'comum@example.test', 'authenticated', 'authenticated');

insert into public.admin_memberships (user_id, role, is_active)
values
  ('b8000000-0000-4000-8000-000000000001', 'admin', true),
  ('b8000000-0000-4000-8000-000000000002', 'editor', true),
  ('b8000000-0000-4000-8000-000000000003', 'editor', false);

-- Objetos simulados (apenas metadados; nenhum arquivo real).
-- Objetos reais já existentes no bucket (a biblioteca oficial não fica vazia
-- depois da população inicial): as contagens abaixo somam esta base.
create temporary table media_baseline as
select count(*)::int as n from storage.objects where bucket_id = 'geologar-media';
grant select on media_baseline to anon, authenticated;

insert into storage.objects (bucket_id, name, metadata, user_metadata)
values
  ('geologar-media', 'uploads/11111111-1111-4111-8111-111111111111.webp',
   '{"size": 1000, "mimetype": "image/webp"}', '{"originalName": "banner teste.webp", "width": 1600, "height": 900}'),
  ('geologar-media', 'uploads/22222222-2222-4222-8222-222222222222.png',
   '{"size": 2000, "mimetype": "image/png"}', '{"originalName": "projeto teste.png", "width": 1200, "height": 800}'),
  ('geologar-media', 'uploads/33333333-3333-4333-8333-333333333333.jpg',
   '{"size": 3000, "mimetype": "image/jpeg"}', '{"originalName": "logo teste.jpg", "width": 400, "height": 400}');

insert into public.research_lines (id, title, slug, is_published)
values ('a8000000-0000-4000-8000-000000000001', 'Linha (teste)', 'tst-linha-midia', false);

insert into public.projects (id, title, slug, project_status, is_published)
values ('d8000000-0000-4000-8000-000000000001', 'Projeto (teste)', 'tst-projeto-midia', 'ongoing', false);

insert into public.institution_categories (id, name, slug)
values ('c8000000-0000-4000-8000-000000000001', 'Categoria mídia (teste)', 'tst-categoria-midia');

insert into public.institutions (id, category_id, name, is_published)
values ('f8000000-0000-4000-8000-000000000001', 'c8000000-0000-4000-8000-000000000001', 'Instituição (teste)', false);

create function pg_temp.act_as(user_id uuid) returns void
language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;

create temporary table ids (name text primary key, id uuid, version timestamptz);
grant all on ids to anon, authenticated;

-- Exclusões em SQL exigem esta opção (a API do Storage a define).
set local storage.allow_delete_query = 'true';

-- Bucket e formatos --------------------------------------------------------------

select is(
  (select public from storage.buckets where id = 'geologar-media'),
  true,
  'bucket geologar-media existe e é público'
);

select is(
  (select file_size_limit from storage.buckets where id = 'geologar-media'),
  5242880::bigint,
  'limite de 5 MB por arquivo'
);

select is(
  (select allowed_mime_types from storage.buckets where id = 'geologar-media'),
  array['image/jpeg', 'image/png', 'image/webp'],
  'somente JPEG, PNG e WebP'
);

select ok(
  public.is_media_object_name('uploads/550e8400-e29b-41d4-a716-446655440000.webp'),
  'nome de objeto uploads/<uuid>.webp é aceito'
);

select ok(
  not public.is_media_object_name('uploads/../550e8400-e29b-41d4-a716-446655440000.svg')
  and not public.is_media_object_name('uploads/foto.png')
  and not public.is_media_object_name('outra-pasta/550e8400-e29b-41d4-a716-446655440000.png'),
  'nomes fora do padrão, SVG e "..": recusados'
);

select ok(
  public.is_valid_image_reference('/images/hero.jpg')
  and public.is_valid_image_reference('uploads/550e8400-e29b-41d4-a716-446655440000.png')
  and public.is_valid_image_reference(null),
  'referências aceitas: arquivo local, objeto da biblioteca e vazio'
);

select ok(
  not public.is_valid_image_reference('https://example.test/a.jpg')
  and not public.is_valid_image_reference('/images/../segredo.png')
  and not public.is_valid_image_reference('//example.test/a.png')
  and not public.is_valid_image_reference('javascript:alert(1)'),
  'URLs externas, "..", "//" e esquemas são recusados'
);

-- Anônimo ------------------------------------------------------------------------

set local role anon;

select is(
  (select count(*)::int from storage.objects where bucket_id = 'geologar-media'),
  0,
  'anon não lista a biblioteca'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('geologar-media', 'uploads/44444444-4444-4444-8444-444444444444.png') $$,
  '42501',
  null,
  'anon não envia arquivos'
);

select throws_ok(
  $$ select * from public.list_media() $$,
  '42501',
  null,
  'anon não executa list_media'
);

reset role;

-- Usuário sem vínculo --------------------------------------------------------------

set local role authenticated;
select pg_temp.act_as('b8000000-0000-4000-8000-000000000004');

select is(
  (select count(*)::int from storage.objects where bucket_id = 'geologar-media'),
  0,
  'conta sem vínculo não lista a biblioteca'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('geologar-media', 'uploads/44444444-4444-4444-8444-444444444444.png') $$,
  '42501',
  null,
  'conta sem vínculo não envia arquivos'
);

-- Vínculo inativo ------------------------------------------------------------------

select pg_temp.act_as('b8000000-0000-4000-8000-000000000003');

select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('geologar-media', 'uploads/44444444-4444-4444-8444-444444444444.png') $$,
  '42501',
  null,
  'vínculo inativo não envia arquivos'
);

with changed as (
  update public.research_lines
  set image_path = 'uploads/11111111-1111-4111-8111-111111111111.webp', image_alt = 'x'
  where id = 'a8000000-0000-4000-8000-000000000001'
  returning 1
)
select is((select count(*)::int from changed), 0, 'vínculo inativo não associa imagens');

-- Editor ---------------------------------------------------------------------------

select pg_temp.act_as('b8000000-0000-4000-8000-000000000002');

select is(
  (select count(*)::int from storage.objects where bucket_id = 'geologar-media'),
  (select n from media_baseline) + 3,
  'editor lista a biblioteca'
);

select lives_ok(
  $$ insert into storage.objects (bucket_id, name, metadata)
     values ('geologar-media', 'uploads/44444444-4444-4444-8444-444444444444.png',
             '{"size": 10, "mimetype": "image/png"}') $$,
  'editor envia arquivo com nome válido'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('geologar-media', 'uploads/minha foto.png') $$,
  '42501',
  null,
  'nome fora do padrão (nome original) é recusado'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('geologar-media', 'uploads/44444444-4444-4444-8444-444444444444.png') $$,
  '23505',
  null,
  'mesmo caminho não é gravado duas vezes (sem sobrescrita)'
);

with changed as (
  update storage.objects
  set name = 'uploads/55555555-5555-4555-8555-555555555555.png'
  where bucket_id = 'geologar-media' and name = 'uploads/44444444-4444-4444-8444-444444444444.png'
  returning 1
)
select is((select count(*)::int from changed), 0, 'editor não altera nem move objetos (sem UPDATE)');

with removed as (
  delete from storage.objects
  where bucket_id = 'geologar-media' and name = 'uploads/44444444-4444-4444-8444-444444444444.png'
  returning 1
)
select is((select count(*)::int from removed), 0, 'editor não exclui arquivos');

select lives_ok(
  $$ update public.research_lines
     set image_path = 'uploads/11111111-1111-4111-8111-111111111111.webp',
         image_alt = 'Afloramento rochoso (teste)'
     where id = 'a8000000-0000-4000-8000-000000000001' $$,
  'editor associa imagem à linha de pesquisa'
);

select lives_ok(
  $$ update public.homepage_content
     set hero_image_path = 'uploads/11111111-1111-4111-8111-111111111111.webp',
         hero_image_alt = 'Paisagem (teste)' $$,
  'editor associa imagem ao banner da homepage (mesma imagem em dois conteúdos)'
);

select lives_ok(
  $$ update public.institutions
     set logo_path = 'uploads/33333333-3333-4333-8333-333333333333.jpg',
         logo_alt = 'Logotipo (teste)'
     where id = 'f8000000-0000-4000-8000-000000000001' $$,
  'editor associa logotipo à instituição'
);

select throws_ok(
  $$ update public.projects
     set image_path = 'uploads/66666666-6666-4666-8666-666666666666.png', image_alt = 'x'
     where id = 'd8000000-0000-4000-8000-000000000001' $$,
  'GL422',
  null,
  'objeto inexistente não pode ser associado'
);

select throws_ok(
  $$ update public.projects
     set image_path = 'https://example.test/imagem.png', image_alt = 'x'
     where id = 'd8000000-0000-4000-8000-000000000001' $$,
  '23514',
  null,
  'URL arbitrária não é aceita como referência'
);

select throws_ok(
  $$ update public.projects
     set image_path = 'uploads/22222222-2222-4222-8222-222222222222.png', image_alt = null
     where id = 'd8000000-0000-4000-8000-000000000001' $$,
  '23514',
  null,
  'imagem sem texto alternativo é recusada'
);

with changed as (
  update public.site_settings
  set logo_path = 'uploads/33333333-3333-4333-8333-333333333333.jpg'
  returning 1
)
select is((select count(*)::int from changed), 0, 'editor não altera o logotipo institucional');

-- save_project com imagem.
insert into ids (name, id, version)
select 'novo', p.id, p.updated_at
from public.save_project(
  null, null, 'Projeto com imagem (teste)', 'tst-projeto-com-imagem', null, null,
  'uploads/22222222-2222-4222-8222-222222222222.png', 'Equipe em campo (teste)',
  'ongoing', null, null, null, null, null, null, 0, false, false,
  array['a8000000-0000-4000-8000-000000000001']::uuid[]
) as p;

select is(
  (select image_path || ' | ' || image_alt from public.projects where slug = 'tst-projeto-com-imagem'),
  'uploads/22222222-2222-4222-8222-222222222222.png | Equipe em campo (teste)',
  'save_project grava imagem e texto alternativo junto com o projeto'
);

select is(
  (select count(*)::int from public.project_research_lines
   where project_id = (select id from ids where name = 'novo')),
  1,
  'save_project grava os vínculos na mesma operação'
);

select throws_ok(
  $$ select public.save_project(
       (select id from ids where name = 'novo'), (select version from ids where name = 'novo'),
       'Projeto com imagem (teste)', 'tst-projeto-com-imagem', null, null,
       'uploads/77777777-7777-4777-8777-777777777777.png', 'x',
       'ongoing', null, null, null, null, null, null, 0, false, false, '{}'::uuid[]) $$,
  'GL422',
  null,
  'save_project recusa imagem inexistente'
);

select is(
  (select count(*)::int from public.project_research_lines
   where project_id = (select id from ids where name = 'novo')),
  1,
  'falha na imagem não remove vínculos (transação inteira desfeita)'
);

select is(
  (select array_agg(entity order by entity) from public.media_usage('uploads/11111111-1111-4111-8111-111111111111.webp')),
  array['homepage', 'research-line'],
  'media_usage aponta os dois conteúdos que usam a imagem'
);

select is(
  (select total_count::int from public.list_media() limit 1),
  (select n from media_baseline) + 4,
  'list_media lista os quatro objetos de teste além dos existentes'
);

select is(
  (select usage_count from public.list_media(p_limit => 1000) where name = 'uploads/11111111-1111-4111-8111-111111111111.webp'),
  2,
  'list_media informa o número de usos'
);

select is(
  (select count(*)::int from public.list_media(p_unused_only => true, p_limit => 1000)
   where name in ('uploads/11111111-1111-4111-8111-111111111111.webp',
                  'uploads/22222222-2222-4222-8222-222222222222.png',
                  'uploads/33333333-3333-4333-8333-333333333333.jpg',
                  'uploads/44444444-4444-4444-8444-444444444444.png')),
  1,
  'filtro "sem uso" retorna somente o arquivo não associado'
);

select is(
  (select original_name from public.list_media(p_search => 'logo')),
  'logo teste.jpg',
  'busca pelo nome original'
);

reset role;

-- Administrador ------------------------------------------------------------------------

set local role authenticated;
select pg_temp.act_as('b8000000-0000-4000-8000-000000000001');

select lives_ok(
  $$ update public.site_settings
     set logo_path = 'uploads/33333333-3333-4333-8333-333333333333.jpg',
         favicon_path = 'uploads/33333333-3333-4333-8333-333333333333.jpg' $$,
  'admin altera logotipo e favicon institucionais'
);

with removed as (
  delete from storage.objects
  where bucket_id = 'geologar-media' and name = 'uploads/22222222-2222-4222-8222-222222222222.png'
  returning 1
)
select is((select count(*)::int from removed), 0, 'admin não exclui imagem usada por projeto');

with removed as (
  delete from storage.objects
  where bucket_id = 'geologar-media' and name = 'uploads/33333333-3333-4333-8333-333333333333.jpg'
  returning 1
)
select is((select count(*)::int from removed), 0, 'admin não exclui logotipo em uso');

with removed as (
  delete from storage.objects
  where bucket_id = 'geologar-media' and name = 'uploads/11111111-1111-4111-8111-111111111111.webp'
  returning 1
)
select is((select count(*)::int from removed), 0, 'admin não exclui imagem do banner');

with removed as (
  delete from storage.objects
  where bucket_id = 'geologar-media' and name = 'uploads/44444444-4444-4444-8444-444444444444.png'
  returning 1
)
select is((select count(*)::int from removed), 1, 'admin exclui arquivo sem uso');

-- Remover a associação não exclui o arquivo; depois dela, a exclusão é liberada.
insert into ids (name, id, version)
select 'removido', p.id, p.updated_at
from public.save_project(
  (select id from ids where name = 'novo'), (select version from ids where name = 'novo'),
  'Projeto com imagem (teste)', 'tst-projeto-com-imagem', null, null,
  null, 'texto que deve ser descartado',
  'ongoing', null, null, null, null, null, null, 0, false, false,
  array['a8000000-0000-4000-8000-000000000001']::uuid[]
) as p;

select is(
  (select coalesce(image_path, '-') || ' | ' || coalesce(image_alt, '-')
   from public.projects where slug = 'tst-projeto-com-imagem'),
  '- | -',
  'remover a imagem limpa caminho e texto alternativo juntos'
);

select is(
  (select count(*)::int from storage.objects
   where bucket_id = 'geologar-media' and name = 'uploads/22222222-2222-4222-8222-222222222222.png'),
  1,
  'remover a associação não exclui o arquivo'
);

with removed as (
  delete from storage.objects
  where bucket_id = 'geologar-media' and name = 'uploads/22222222-2222-4222-8222-222222222222.png'
  returning 1
)
select is((select count(*)::int from removed), 1, 'sem associações, o arquivo pode ser excluído');

select throws_ok(
  $$ update public.research_lines
     set image_path = 'uploads/22222222-2222-4222-8222-222222222222.png', image_alt = 'x'
     where id = 'a8000000-0000-4000-8000-000000000001' $$,
  'GL422',
  null,
  'arquivo excluído não pode mais ser associado'
);

-- Revogação: editor desativado perde o acesso à biblioteca.
reset role;
update public.admin_memberships set is_active = false
where user_id = 'b8000000-0000-4000-8000-000000000002';

set local role authenticated;
select pg_temp.act_as('b8000000-0000-4000-8000-000000000002');

select is(
  (select count(*)::int from storage.objects where bucket_id = 'geologar-media'),
  0,
  'editor desativado não lista a biblioteca'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('geologar-media', 'uploads/88888888-8888-4888-8888-888888888888.png') $$,
  '42501',
  null,
  'editor desativado não envia arquivos'
);

reset role;

select * from finish();
rollback;
