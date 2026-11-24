-- =============================================================================
-- Etapa 10.7: instituições da referência visual como RASCUNHO.
--
-- Cria as 5 categorias e as 22 instituições apresentadas na referência do
-- cliente (conteúdo inicial pendente de confirmação institucional):
--   * somente o nome (e a sigla, quando o nome a traz entre parênteses);
--   * sem site, descrição, cidade ou logotipo — nada é inventado;
--   * is_published = false: nada aparece no site até a equipe revisar e
--     publicar em /admin/instituicoes.
-- Os logotipos provisórios são importados pela biblioteca de mídia e
-- associados pelo CMS (ver docs/visual-refinement.md).
--
-- Idempotente: categorias são reaproveitadas pelo slug ou pelo nome;
-- instituições já cadastradas (mesmo nome ou mesma sigla, sem diferenciar
-- maiúsculas) não são duplicadas nem alteradas.
-- =============================================================================

with wanted (slug, name, sort_order) as (
  values
    ('parceiras-universidades', 'Parceiras (Universidades)', 10),
    ('colaboradoras-pesquisa', 'Colaboradoras (Pesquisa)', 20),
    ('apoio-institucional', 'Apoio institucional', 30),
    ('empresarial', 'Empresarial', 40),
    ('internacionais', 'Internacionais', 50)
)
insert into public.institution_categories (slug, name, sort_order)
select w.slug, w.name, w.sort_order
from wanted w
where not exists (
  select 1 from public.institution_categories c
  where c.slug = w.slug or lower(c.name) = lower(w.name)
);

with wanted (category_slug, category_name, name, acronym, sort_order) as (
  values
    ('parceiras-universidades', 'Parceiras (Universidades)', 'Universidade Federal da Bahia', 'UFBA', 10),
    ('parceiras-universidades', 'Parceiras (Universidades)', 'CIENAM UFBA', null, 20),
    ('parceiras-universidades', 'Parceiras (Universidades)', 'Universidade Federal do Recôncavo da Bahia', 'UFRB', 30),
    ('parceiras-universidades', 'Parceiras (Universidades)', 'Universidade Estadual de Santa Cruz', 'UESC', 40),
    ('parceiras-universidades', 'Parceiras (Universidades)', 'Universidade Federal do Rio de Janeiro', 'UFRJ', 50),
    ('parceiras-universidades', 'Parceiras (Universidades)', 'Universidade do Estado da Bahia', 'UNEB', 60),
    ('parceiras-universidades', 'Parceiras (Universidades)', 'Universidade Estadual de Feira de Santana', 'UEFS', 70),
    ('parceiras-universidades', 'Parceiras (Universidades)', 'Instituto Federal da Bahia', 'IFBA', 80),
    ('parceiras-universidades', 'Parceiras (Universidades)', 'Universidade Federal de Sergipe', 'UFS', 90),
    ('parceiras-universidades', 'Parceiras (Universidades)', 'Universidade Federal do Ceará', 'UFC', 100),
    ('colaboradoras-pesquisa', 'Colaboradoras (Pesquisa)', 'CBPM', null, 10),
    ('colaboradoras-pesquisa', 'Colaboradoras (Pesquisa)', 'CETEM', null, 20),
    ('apoio-institucional', 'Apoio institucional', 'SDE Bahia', null, 10),
    ('apoio-institucional', 'Apoio institucional', 'Museu Geológico da Bahia', null, 20),
    ('apoio-institucional', 'Apoio institucional', 'Associação dos Astrônomos da Bahia', null, 30),
    ('apoio-institucional', 'Apoio institucional', 'CAPES', null, 40),
    ('apoio-institucional', 'Apoio institucional', 'CNPq', null, 50),
    ('apoio-institucional', 'Apoio institucional', 'FAPESB', null, 60),
    ('empresarial', 'Empresarial', 'ASSOBEGE', null, 10),
    ('internacionais', 'Internacionais', 'University of Toronto', null, 10),
    ('internacionais', 'Internacionais', 'Western University', null, 20),
    ('internacionais', 'Internacionais', 'Brock University', null, 30)
)
insert into public.institutions (category_id, name, acronym, sort_order, is_published)
select
  (select c.id from public.institution_categories c
   where c.slug = w.category_slug or lower(c.name) = lower(w.category_name)
   order by (c.slug = w.category_slug) desc
   limit 1),
  w.name, w.acronym, w.sort_order, false
from wanted w
where not exists (
  select 1 from public.institutions i
  where lower(i.name) = lower(w.name)
     or (w.acronym is not null and lower(i.acronym) = lower(w.acronym))
     or (w.acronym is null and lower(i.acronym) = lower(w.name))
);
