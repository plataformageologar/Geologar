-- =============================================================================
-- Instituições da referência visual (Etapa 10.7): categorias e cadastros
-- iniciais em rascunho, sem duplicidade e sem dados inventados.
-- Transação desfeita no final (ROLLBACK).
-- =============================================================================

begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

select is(
  (select count(*)::int from public.institution_categories where slug in
    ('parceiras-universidades', 'colaboradoras-pesquisa', 'apoio-institucional', 'empresarial', 'internacionais')),
  5,
  'as cinco categorias da referência existem'
);

create temporary table t_wanted (category_slug text, name text);
insert into t_wanted values
  ('parceiras-universidades', 'Universidade Federal da Bahia'),
  ('parceiras-universidades', 'CIENAM UFBA'),
  ('parceiras-universidades', 'Universidade Federal do Recôncavo da Bahia'),
  ('parceiras-universidades', 'Universidade Estadual de Santa Cruz'),
  ('parceiras-universidades', 'Universidade Federal do Rio de Janeiro'),
  ('parceiras-universidades', 'Universidade do Estado da Bahia'),
  ('parceiras-universidades', 'Universidade Estadual de Feira de Santana'),
  ('parceiras-universidades', 'Instituto Federal da Bahia'),
  ('parceiras-universidades', 'Universidade Federal de Sergipe'),
  ('parceiras-universidades', 'Universidade Federal do Ceará'),
  ('colaboradoras-pesquisa', 'CBPM'),
  ('colaboradoras-pesquisa', 'CETEM'),
  ('apoio-institucional', 'SDE Bahia'),
  ('apoio-institucional', 'Museu Geológico da Bahia'),
  ('apoio-institucional', 'Associação dos Astrônomos da Bahia'),
  ('apoio-institucional', 'CAPES'),
  ('apoio-institucional', 'CNPq'),
  ('apoio-institucional', 'FAPESB'),
  ('empresarial', 'ASSOBEGE'),
  ('internacionais', 'University of Toronto'),
  ('internacionais', 'Western University'),
  ('internacionais', 'Brock University');

select is(
  (select count(*)::int from t_wanted w
   where exists (select 1 from public.institutions i where lower(i.name) = lower(w.name))),
  22,
  'as 22 instituições da referência estão cadastradas'
);
select is(
  (select count(*)::int from t_wanted w
   where (select count(*) from public.institutions i where lower(i.name) = lower(w.name)) > 1),
  0,
  'nenhuma instituição duplicada'
);
select is(
  (select count(*)::int from t_wanted w
   join public.institutions i on lower(i.name) = lower(w.name)
   join public.institution_categories c on c.id = i.category_id
   where c.slug <> w.category_slug),
  0,
  'cada instituição está na categoria da referência'
);
select is(
  (select count(*)::int from public.institution_categories c
   where c.slug = 'parceiras-universidades'
     and (select count(*) from public.institutions i where i.category_id = c.id) >= 10),
  1,
  'parceiras (universidades) com as dez instituições'
);
select is(
  (select count(*)::int from t_wanted w
   join public.institutions i on lower(i.name) = lower(w.name)
   where i.website_url is not null and i.is_published = false
     and i.updated_at = i.created_at),
  0,
  'a migration não inventa sites'
);
select ok(
  not exists (
    select 1 from t_wanted w join public.institutions i on lower(i.name) = lower(w.name)
    where i.is_published and i.logo_path is null and i.updated_at = i.created_at
  ),
  'a migration não publica instituições'
);

-- Visitantes não veem rascunhos.
set local role anon;
select is(
  (select count(*)::int from public.institutions i
   where not i.is_published),
  0,
  'rascunhos não aparecem para visitantes'
);
reset role;

-- Siglas gravadas a partir do nome da referência.
select is(
  (select acronym from public.institutions where name = 'Universidade Federal do Recôncavo da Bahia'),
  'UFRB',
  'a sigla vem do nome da referência'
);

select * from finish();
rollback;
