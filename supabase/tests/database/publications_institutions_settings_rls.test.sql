-- =============================================================================
-- RLS, privilégios e integridade de publicações (e seus vínculos),
-- instituições, categorias, site_settings e social_links (Etapa 7.3)
--
-- Executar: `npx supabase test db` (local) ou `npx supabase test db --remote`.
-- Tudo roda numa transação desfeita no final (ROLLBACK): contas, registros
-- (slugs iniciados por "tst-", URLs em example.test) e a alteração de teste
-- em site_settings são temporários; nenhum dado real é alterado.
-- =============================================================================

begin;

create extension if not exists pgtap with schema extensions;

select plan(71);

-- Fixtures ---------------------------------------------------------------------

insert into auth.users (id, email, aud, role)
values
  ('b3000000-0000-4000-8000-000000000001', 'admin@example.test', 'authenticated', 'authenticated'),
  ('b3000000-0000-4000-8000-000000000002', 'editor@example.test', 'authenticated', 'authenticated'),
  ('b3000000-0000-4000-8000-000000000003', 'inativo@example.test', 'authenticated', 'authenticated'),
  ('b3000000-0000-4000-8000-000000000004', 'comum@example.test', 'authenticated', 'authenticated');

insert into public.admin_memberships (user_id, role, is_active)
values
  ('b3000000-0000-4000-8000-000000000001', 'admin', true),
  ('b3000000-0000-4000-8000-000000000002', 'editor', true),
  ('b3000000-0000-4000-8000-000000000003', 'editor', false);

insert into public.research_lines (id, title, slug, is_published)
values
  ('a3000000-0000-4000-8000-000000000001', 'Linha publicada (teste)', 'tst-linha-publicada', true),
  ('a3000000-0000-4000-8000-000000000002', 'Linha rascunho (teste)', 'tst-linha-rascunho', false);

insert into public.projects (id, title, slug, project_status, is_published)
values ('d3000000-0000-4000-8000-000000000001', 'Projeto publicado (teste)', 'tst-projeto', 'ongoing', true);

insert into public.publications (id, title, slug, authors, doi, is_published)
values
  ('e3000000-0000-4000-8000-000000000001', 'Publicação publicada (teste)', 'tst-pub-publicada', 'Teste, A.', null, true),
  ('e3000000-0000-4000-8000-000000000002', 'Publicação rascunho (teste)', 'tst-pub-rascunho', 'Teste, B.', '10.1234/tst.0002', false);

insert into public.publication_research_lines (publication_id, research_line_id)
values ('e3000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000001');
insert into public.publication_projects (publication_id, project_id)
values ('e3000000-0000-4000-8000-000000000002', 'd3000000-0000-4000-8000-000000000001');

insert into public.institution_categories (id, name, slug)
values
  ('c3000000-0000-4000-8000-000000000001', 'Categoria (teste)', 'tst-categoria'),
  ('c3000000-0000-4000-8000-000000000002', 'Categoria vazia (teste)', 'tst-categoria-vazia');

insert into public.institutions (id, category_id, name, is_published)
values
  ('f3000000-0000-4000-8000-000000000001', 'c3000000-0000-4000-8000-000000000001', 'Instituição publicada (teste)', true),
  ('f3000000-0000-4000-8000-000000000002', 'c3000000-0000-4000-8000-000000000001', 'Instituição rascunho (teste)', false);

insert into public.social_links (id, platform, url, is_active)
values
  ('a3100000-0000-4000-8000-000000000001', 'instagram', 'https://example.test/tst-ativo', true),
  ('a3100000-0000-4000-8000-000000000002', 'youtube', 'https://example.test/tst-inativo', false);

-- Simula uma requisição autenticada da API (auth.uid() lê o claim `sub`).
create function pg_temp.act_as(user_id uuid) returns void
language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;

-- Ids gerados durante o teste.
create temporary table ids (name text primary key, id uuid, version timestamptz);
grant all on ids to anon, authenticated;

-- Anônimo ------------------------------------------------------------------------

set local role anon;

select is(
  (select count(*)::int from public.publications where slug like 'tst-%'),
  1,
  'anon vê somente a publicação publicada'
);

select is(
  (select count(*)::int from public.institutions where name like '%(teste)'),
  1,
  'anon vê somente a instituição publicada'
);

select is(
  (select count(*)::int from public.social_links where url like 'https://example.test/tst-%'),
  1,
  'anon vê somente a rede social ativa'
);

select is(
  (select count(*)::int from public.publication_research_lines
   where publication_id = 'e3000000-0000-4000-8000-000000000001'),
  1,
  'anon vê o vínculo entre publicação e linha publicadas'
);

select is(
  (select count(*)::int from public.publication_projects
   where publication_id = 'e3000000-0000-4000-8000-000000000002'),
  0,
  'anon não vê vínculos de publicação em rascunho'
);

select throws_ok(
  $$ insert into public.publications (title, slug, authors) values ('anon', 'tst-anon', 'Anon') $$,
  '42501', null, 'anon não insere publicações'
);

select throws_ok(
  $$ select public.save_publication(null, null, 'anon', 'tst-anon', 'Anon', null, null, null, null,
       null, null, 0, false, false, '{}', '{}') $$,
  '42501', null, 'anon não executa save_publication'
);

select throws_ok(
  $$ insert into public.publication_projects (publication_id, project_id)
     values ('e3000000-0000-4000-8000-000000000001', 'd3000000-0000-4000-8000-000000000001') $$,
  '42501', null, 'anon não cria vínculos de publicações'
);

select throws_ok(
  $$ update public.site_settings set site_name = 'anon' $$,
  '42501', null, 'anon não altera site_settings'
);

select throws_ok(
  $$ insert into public.social_links (platform, url) values ('anon', 'https://example.test/tst-anon') $$,
  '42501', null, 'anon não cria redes sociais'
);

reset role;

-- Autenticado sem vínculo ---------------------------------------------------------

select pg_temp.act_as('b3000000-0000-4000-8000-000000000004');
set local role authenticated;

select is(
  (select count(*)::int from public.publications where slug like 'tst-%'),
  1,
  'usuário sem vínculo não vê rascunhos de publicações'
);

select throws_ok(
  $$ insert into public.publications (title, slug, authors) values ('comum', 'tst-comum', 'Comum') $$,
  '42501', null, 'usuário sem vínculo não insere publicações'
);

select throws_ok(
  $$ select public.save_publication(null, null, 'comum', 'tst-comum', 'Comum', null, null, null, null,
       null, null, 0, false, false, '{}', '{}') $$,
  '42501', null, 'usuário sem vínculo não salva publicações'
);

select throws_ok(
  $$ insert into public.institution_categories (name, slug) values ('comum', 'tst-comum') $$,
  '42501', null, 'usuário sem vínculo não cria categorias'
);

with changed as (update public.site_settings set site_name = 'comum' returning 1)
select is((select count(*)::int from changed), 0, 'usuário sem vínculo não altera site_settings');

reset role;

-- Vínculo inativo -----------------------------------------------------------------

select pg_temp.act_as('b3000000-0000-4000-8000-000000000003');
set local role authenticated;

select is(
  (select count(*)::int from public.institutions where name like '%(teste)'),
  1,
  'vínculo inativo não vê rascunhos de instituições'
);

select throws_ok(
  $$ insert into public.institutions (category_id, name)
     values ('c3000000-0000-4000-8000-000000000001', 'inativo') $$,
  '42501', null, 'vínculo inativo não insere instituições'
);

with changed as (
  update public.publications set title = 'inativo' where slug = 'tst-pub-publicada' returning 1
)
select is((select count(*)::int from changed), 0, 'vínculo inativo não atualiza publicações');

reset role;

-- Editor ativo --------------------------------------------------------------------

select pg_temp.act_as('b3000000-0000-4000-8000-000000000002');
set local role authenticated;

select is(
  (select count(*)::int from public.publications where slug like 'tst-%'),
  2,
  'editor vê publicações publicadas e rascunhos'
);

select is(
  (select count(*)::int from public.institutions where name like '%(teste)'),
  2,
  'editor vê instituições publicadas e rascunhos'
);

select is(
  (select count(*)::int from public.social_links where url like 'https://example.test/tst-%'),
  2,
  'editor vê redes sociais ativas e inativas'
);

select lives_ok(
  $$ insert into ids
     select 'pub', id, updated_at
     from public.save_publication(null, null, 'Nova publicação (teste)', 'tst-nova-publicacao',
       'Silva, A.; Souza, B.', 'Revista de Teste', 2024, '10.5555/tst.nova', 'https://example.test/artigo',
       'Resumo.', null, 0, false, false,
       '{d3000000-0000-4000-8000-000000000001}', '{a3000000-0000-4000-8000-000000000001}') $$,
  'editor cria publicação com projeto e linha (save_publication)'
);

select is(
  (select is_published from public.publications where slug = 'tst-nova-publicacao'),
  false,
  'publicação nova criada como rascunho'
);

select is(
  (select count(*)::int from public.publication_projects where publication_id = (select id from ids where name = 'pub'))
  + (select count(*)::int from public.publication_research_lines where publication_id = (select id from ids where name = 'pub')),
  2,
  'vínculos com projeto e linha gravados na mesma transação'
);

select lives_ok(
  $$ update ids set version = saved.updated_at
     from public.save_publication(
       (select id from ids where name = 'pub'), (select version from ids where name = 'pub'),
       'Nova publicação (teste)', 'tst-nova-publicacao', 'Silva, A.; Souza, B.', 'Revista de Teste', 2024,
       '10.5555/tst.nova', 'https://example.test/artigo', 'Resumo.', null, 0, true, true,
       '{}', '{a3000000-0000-4000-8000-000000000001,a3000000-0000-4000-8000-000000000002}') as saved
     where name = 'pub' $$,
  'editor atualiza, publica, remove projeto e adiciona linha'
);

select is(
  array[
    (select count(*)::int from public.publication_projects where publication_id = (select id from ids where name = 'pub')),
    (select count(*)::int from public.publication_research_lines where publication_id = (select id from ids where name = 'pub'))
  ],
  array[0, 2],
  'vínculos sincronizados (projeto removido, duas linhas)'
);

select isnt(
  (select published_at from public.publications where slug = 'tst-nova-publicacao'),
  null,
  'published_at preenchido pelo trigger ao publicar'
);

select throws_ok(
  $$ select public.save_publication((select id from ids where name = 'pub'), '2000-01-01',
       'Versão antiga', 'tst-nova-publicacao', 'Silva, A.', null, null, null, null, null, null,
       0, false, true, '{}', '{}') $$,
  'GL409', null, 'versão antiga é recusada (edição simultânea)'
);

select throws_ok(
  $$ select public.save_publication((select id from ids where name = 'pub'), (select version from ids where name = 'pub'),
       'Nova publicação (teste)', 'tst-nova-publicacao', 'Silva, A.; Souza, B.', null, 2024, '10.5555/tst.nova',
       null, null, null, 0, true, true,
       '{d3000000-0000-4000-8000-0000000000ff}', '{}') $$,
  '23503', null, 'projeto inexistente é recusado (FK)'
);

select is(
  (select count(*)::int from public.publication_research_lines where publication_id = (select id from ids where name = 'pub')),
  2,
  'falha no vínculo não grava nada pela metade'
);

select throws_ok(
  $$ select public.save_publication(null, null, 'Duplicada', 'tst-duplicada', 'X', null, null, null, null,
       null, null, 0, false, false,
       '{d3000000-0000-4000-8000-000000000001,d3000000-0000-4000-8000-000000000001}', '{}') $$,
  '22023', null, 'ids duplicados são recusados'
);

select throws_ok(
  $$ select public.save_publication(null, null, 'DOI duplicado', 'tst-doi-duplicado', 'X', null, null,
       '10.1234/TST.0002', null, null, null, 0, false, false, '{}', '{}') $$,
  '23505', null, 'DOI duplicado (sem diferenciar maiúsculas) é recusado'
);

select throws_ok(
  $$ select public.save_publication(null, null, 'DOI inválido', 'tst-doi-invalido', 'X', null, null,
       'https://doi.org/10.1234/x', null, null, null, 0, false, false, '{}', '{}') $$,
  '23514', null, 'DOI com prefixo de URL é recusado pelo banco'
);

select throws_ok(
  $$ select public.save_publication(null, null, 'Ano', 'tst-ano', 'X', null, 1700, null, null,
       null, null, 0, false, false, '{}', '{}') $$,
  '22023', null, 'ano fora de 1800–2100 é recusado'
);

select throws_ok(
  $$ select public.save_publication(null, null, 'Slug', 'tst-pub-publicada', 'X', null, null, null, null,
       null, null, 0, false, false, '{}', '{}') $$,
  '23505', null, 'slug duplicado é recusado'
);

select throws_ok(
  $$ select public.save_publication(null, null, 'Sem autores', 'tst-sem-autores', '   ', null, null, null, null,
       null, null, 0, false, false, '{}', '{}') $$,
  '23514', null, 'autores em branco são recusados'
);

select throws_ok(
  $$ update public.publications set published_at = now() where slug = 'tst-pub-rascunho' $$,
  '42501', null, 'editor não altera published_at diretamente'
);

with removed as (delete from public.publications where slug = 'tst-pub-rascunho' returning 1)
select is((select count(*)::int from removed), 0, 'editor não exclui publicações');

select lives_ok(
  $$ insert into public.institutions (category_id, name, acronym, website_url)
     values ('c3000000-0000-4000-8000-000000000001', 'Nova instituição (teste)', 'NIT', 'https://example.test') $$,
  'editor cria instituição'
);

with changed as (
  update public.institutions set category_id = 'c3000000-0000-4000-8000-000000000002', is_published = true
  where name = 'Nova instituição (teste)' returning 1
)
select is((select count(*)::int from changed), 1, 'editor muda a categoria e publica a instituição');

select throws_ok(
  $$ update public.institutions set logo_path = '/logo.png', logo_alt = 'Logo'
     where name = 'Nova instituição (teste)' $$,
  '42501', null, 'editor não altera logo_path'
);

select throws_ok(
  $$ insert into public.institutions (category_id, name, website_url)
     values ('c3000000-0000-4000-8000-000000000001', 'URL inválida (teste)', 'javascript:alert(1)') $$,
  '23514', null, 'website sem http(s) é recusado'
);

with removed as (delete from public.institutions where name = 'Instituição rascunho (teste)' returning 1)
select is((select count(*)::int from removed), 0, 'editor não exclui instituições');

select throws_ok(
  $$ insert into public.institution_categories (name, slug) values ('Editor', 'tst-editor') $$,
  '42501', null, 'editor não cria categorias'
);

with changed as (
  update public.institution_categories set name = 'editor' where slug = 'tst-categoria' returning 1
)
select is((select count(*)::int from changed), 0, 'editor não edita categorias');

with changed as (update public.site_settings set site_name = 'editor' returning 1)
select is((select count(*)::int from changed), 0, 'editor não altera informações institucionais');

select throws_ok(
  $$ insert into public.social_links (platform, url) values ('editor', 'https://example.test/tst-editor') $$,
  '42501', null, 'editor não cria redes sociais'
);

with changed as (
  update public.social_links set is_active = true where url = 'https://example.test/tst-inativo' returning 1
)
select is((select count(*)::int from changed), 0, 'editor não ativa redes sociais');

reset role;

-- Administrador ativo ---------------------------------------------------------------

select pg_temp.act_as('b3000000-0000-4000-8000-000000000001');
set local role authenticated;

with changed as (
  update public.site_settings set site_name = 'GeoLogar (teste)', contact_email = 'contato@example.test'
  returning 1
)
select is((select count(*)::int from changed), 1, 'admin altera o registro único de site_settings');

select throws_ok(
  $$ update public.site_settings set contact_email = 'sem-arroba' $$,
  '23514', null, 'e-mail institucional inválido é recusado'
);

select throws_ok(
  $$ update public.site_settings set site_name = '  ' $$,
  '23514', null, 'nome do site em branco é recusado'
);

select throws_ok(
  $$ update public.site_settings set logo_path = '/logo.png' $$,
  '42501', null, 'admin não altera logo_path de site_settings'
);

select throws_ok(
  $$ insert into public.site_settings (site_name) values ('Segundo registro') $$,
  '42501', null, 'admin não cria um segundo registro de site_settings'
);

select lives_ok(
  $$ insert into public.institution_categories (name, slug, sort_order) values ('Nova categoria (teste)', 'tst-nova-categoria', 3) $$,
  'admin cria categoria'
);

select throws_ok(
  $$ insert into public.institution_categories (name, slug) values ('Outra (teste)', 'tst-nova-categoria') $$,
  '23505', null, 'slug de categoria duplicado é recusado'
);

select throws_ok(
  $$ delete from public.institution_categories where slug = 'tst-categoria' $$,
  '23503', null, 'categoria com instituições não é excluída (FK RESTRICT)'
);

with removed as (delete from public.institution_categories where slug = 'tst-nova-categoria' returning 1)
select is((select count(*)::int from removed), 1, 'admin exclui categoria vazia');

select lives_ok(
  $$ insert into public.social_links (platform, label, url, sort_order)
     values ('linkedin', 'LinkedIn', 'https://example.test/tst-novo', 2) $$,
  'admin cria rede social'
);

select throws_ok(
  $$ insert into public.social_links (platform, url) values ('linkedin', 'https://example.test/tst-novo') $$,
  '23505', null, 'URL de rede social duplicada é recusada'
);

select throws_ok(
  $$ insert into public.social_links (platform, url) values ('Linked In', 'https://example.test/tst-formato') $$,
  '23514', null, 'plataforma fora do formato é recusada'
);

with changed as (
  update public.social_links set is_active = false where url = 'https://example.test/tst-novo' returning 1
)
select is((select count(*)::int from changed), 1, 'admin desativa rede social');

with removed as (delete from public.social_links where url = 'https://example.test/tst-novo' returning 1)
select is((select count(*)::int from removed), 1, 'admin exclui rede social');

with removed as (delete from public.publications where slug = 'tst-pub-publicada' returning 1)
select is((select count(*)::int from removed), 0, 'admin não exclui publicação publicada');

select throws_ok(
  $$ delete from public.publications where slug = 'tst-pub-rascunho' $$,
  '23503', null, 'publicação com vínculos não é excluída (FK RESTRICT)'
);

delete from public.publication_projects where publication_id = 'e3000000-0000-4000-8000-000000000002';

with removed as (delete from public.publications where slug = 'tst-pub-rascunho' returning 1)
select is((select count(*)::int from removed), 1, 'admin exclui rascunho depois de desfazer os vínculos');

select is(
  (select count(*)::int from public.projects where id = 'd3000000-0000-4000-8000-000000000001'),
  1,
  'o projeto vinculado continua existindo'
);

with removed as (delete from public.institutions where name = 'Instituição publicada (teste)' returning 1)
select is((select count(*)::int from removed), 0, 'admin não exclui instituição publicada');

with removed as (delete from public.institutions where name = 'Instituição rascunho (teste)' returning 1)
select is((select count(*)::int from removed), 1, 'admin exclui instituição em rascunho');

select is(
  (select count(*)::int from public.institution_categories where slug = 'tst-categoria'),
  1,
  'excluir instituição não remove a categoria'
);

reset role;

-- Vínculo revogado durante o uso ---------------------------------------------------

update public.admin_memberships set is_active = false
where user_id = 'b3000000-0000-4000-8000-000000000002';

select pg_temp.act_as('b3000000-0000-4000-8000-000000000002');
set local role authenticated;

select throws_ok(
  $$ select public.save_publication(null, null, 'Após revogação', 'tst-revogado', 'X', null, null, null, null,
       null, null, 0, false, false, '{}', '{}') $$,
  '42501', null, 'editor desativado deixa de salvar publicações'
);

with changed as (
  update public.institutions set name = 'após revogação' where name = 'Instituição publicada (teste)' returning 1
)
select is((select count(*)::int from changed), 0, 'editor desativado deixa de atualizar instituições');

reset role;

select * from finish();

rollback;
