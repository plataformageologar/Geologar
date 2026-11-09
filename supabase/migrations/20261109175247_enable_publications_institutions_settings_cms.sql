-- =============================================================================
-- GeoLogar — CMS de publicações, instituições, categorias, informações
-- institucionais e redes sociais (Etapa 7.3)
--
-- Matriz de escrita (sempre com vínculo ATIVO em admin_memberships, via
-- public.has_cms_role da Etapa 7.2):
--
--   publicações e instituições  admin + editor: criar, editar, publicar;
--                                admin: excluir rascunhos sem vínculos
--   vínculos de publicações      admin + editor (publication_projects e
--                                publication_research_lines)
--   categorias de instituições   admin (editor apenas consulta)
--   site_settings                admin: somente UPDATE do registro existente
--   social_links                 admin: criar, editar, ativar/desativar, excluir
--
-- Leitura administrativa: admin e editor leem rascunhos de publicações e
-- instituições e as redes sociais inativas. As policies públicas
-- (somente conteúdo publicado/ativo) permanecem inalteradas.
--
-- Integridade:
--   - os vínculos de publicações passam de ON DELETE CASCADE para RESTRICT
--     também do lado da publicação: excluir uma publicação vinculada é
--     recusado pelo banco, em vez de apagar relações científicas em silêncio;
--   - categorias continuam com RESTRICT (já existente) em institutions;
--   - save_publication grava publicação + projetos + linhas numa única
--     transação, como SECURITY INVOKER (sujeita a RLS e aos GRANTs).
--
-- GRANTs só nas colunas editoriais: id, created_at, updated_at,
-- published_at e caminhos de mídia (logo_path, favicon_path) ficam fora.
-- Sem SECURITY DEFINER, sem USING (true) para escrita, sem escrita para anon.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Constraints de conteúdo (protegem o banco mesmo fora do formulário)
-- -----------------------------------------------------------------------------

alter table public.publications
  add constraint publications_title_not_blank check (btrim(title) <> ''),
  add constraint publications_authors_not_blank check (btrim(authors) <> ''),
  add constraint publications_slug_length check (char_length(slug) <= 160),
  add constraint publications_sort_order_nonnegative check (sort_order >= 0);

alter table public.institutions
  add constraint institutions_name_not_blank check (btrim(name) <> ''),
  add constraint institutions_sort_order_nonnegative check (sort_order >= 0);

alter table public.institution_categories
  add constraint institution_categories_name_not_blank check (btrim(name) <> ''),
  add constraint institution_categories_slug_length check (char_length(slug) <= 160),
  add constraint institution_categories_sort_order_nonnegative check (sort_order >= 0);

alter table public.site_settings
  add constraint site_settings_site_name_not_blank check (btrim(site_name) <> '');

alter table public.social_links
  add constraint social_links_platform_length check (char_length(platform) <= 40),
  add constraint social_links_sort_order_nonnegative check (sort_order >= 0);


-- -----------------------------------------------------------------------------
-- 2. Vínculos de publicações: exclusão bloqueada enquanto houver vínculo
--    (os lados de projeto e linha já são RESTRICT desde a Etapa 7.2).
-- -----------------------------------------------------------------------------

alter table public.publication_projects
  drop constraint publication_projects_publication_id_fkey,
  add constraint publication_projects_publication_id_fkey
    foreign key (publication_id) references public.publications (id) on delete restrict;

alter table public.publication_research_lines
  drop constraint publication_research_lines_publication_id_fkey,
  add constraint publication_research_lines_publication_id_fkey
    foreign key (publication_id) references public.publications (id) on delete restrict;


-- -----------------------------------------------------------------------------
-- 3. Privilégios (somente colunas editoriais)
-- -----------------------------------------------------------------------------

grant insert (
  title, slug, authors, publication_venue, publication_year,
  doi, external_url, abstract, citation,
  sort_order, is_featured, is_published
) on public.publications to authenticated;

grant update (
  title, slug, authors, publication_venue, publication_year,
  doi, external_url, abstract, citation,
  sort_order, is_featured, is_published
) on public.publications to authenticated;

grant insert (publication_id, project_id) on public.publication_projects to authenticated;
grant insert (publication_id, research_line_id) on public.publication_research_lines to authenticated;
grant delete on public.publication_projects, public.publication_research_lines to authenticated;

grant insert (
  category_id, name, acronym, description, website_url,
  city, state, country, sort_order, is_featured, is_published
) on public.institutions to authenticated;

grant update (
  category_id, name, acronym, description, logo_alt, website_url,
  city, state, country, sort_order, is_featured, is_published
) on public.institutions to authenticated;

grant insert (name, slug, description, sort_order) on public.institution_categories to authenticated;
grant update (name, slug, description, sort_order) on public.institution_categories to authenticated;

-- Registro único: sem INSERT nem DELETE (o CMS só edita o existente).
grant update (
  site_name, institutional_name, tagline, short_description,
  contact_email, contact_phone, address, city, state, country
) on public.site_settings to authenticated;

grant insert (platform, label, url, sort_order, is_active) on public.social_links to authenticated;
grant update (platform, label, url, sort_order, is_active) on public.social_links to authenticated;

-- A exclusão em si é decidida pelas policies.
grant delete on public.publications, public.institutions,
  public.institution_categories, public.social_links to authenticated;


-- -----------------------------------------------------------------------------
-- 4. Leitura administrativa (soma-se às policies públicas existentes)
-- -----------------------------------------------------------------------------

create policy "CMS staff can read all publications"
  on public.publications for select to authenticated
  using ((select public.has_cms_role(array['admin', 'editor'])));

create policy "CMS staff can read all institutions"
  on public.institutions for select to authenticated
  using ((select public.has_cms_role(array['admin', 'editor'])));

create policy "CMS staff can read all social links"
  on public.social_links for select to authenticated
  using ((select public.has_cms_role(array['admin', 'editor'])));


-- -----------------------------------------------------------------------------
-- 5. Escrita: publicações e seus vínculos
-- -----------------------------------------------------------------------------

create policy "CMS staff can create publications"
  on public.publications for insert to authenticated
  with check ((select public.has_cms_role(array['admin', 'editor'])));

create policy "CMS staff can update publications"
  on public.publications for update to authenticated
  using ((select public.has_cms_role(array['admin', 'editor'])))
  with check ((select public.has_cms_role(array['admin', 'editor'])));

create policy "Admins can delete unpublished publications"
  on public.publications for delete to authenticated
  using ((select public.has_cms_role(array['admin'])) and not is_published);

create policy "CMS staff can link publications and projects"
  on public.publication_projects for insert to authenticated
  with check ((select public.has_cms_role(array['admin', 'editor'])));

create policy "CMS staff can unlink publications and projects"
  on public.publication_projects for delete to authenticated
  using ((select public.has_cms_role(array['admin', 'editor'])));

create policy "CMS staff can link publications and research lines"
  on public.publication_research_lines for insert to authenticated
  with check ((select public.has_cms_role(array['admin', 'editor'])));

create policy "CMS staff can unlink publications and research lines"
  on public.publication_research_lines for delete to authenticated
  using ((select public.has_cms_role(array['admin', 'editor'])));


-- -----------------------------------------------------------------------------
-- 6. Escrita: instituições e categorias
-- -----------------------------------------------------------------------------

create policy "CMS staff can create institutions"
  on public.institutions for insert to authenticated
  with check ((select public.has_cms_role(array['admin', 'editor'])));

create policy "CMS staff can update institutions"
  on public.institutions for update to authenticated
  using ((select public.has_cms_role(array['admin', 'editor'])))
  with check ((select public.has_cms_role(array['admin', 'editor'])));

create policy "Admins can delete unpublished institutions"
  on public.institutions for delete to authenticated
  using ((select public.has_cms_role(array['admin'])) and not is_published);

-- Categoria com instituições: a FK institutions_category_id_fkey (RESTRICT)
-- recusa a exclusão.
create policy "Admins can create institution categories"
  on public.institution_categories for insert to authenticated
  with check ((select public.has_cms_role(array['admin'])));

create policy "Admins can update institution categories"
  on public.institution_categories for update to authenticated
  using ((select public.has_cms_role(array['admin'])))
  with check ((select public.has_cms_role(array['admin'])));

create policy "Admins can delete institution categories"
  on public.institution_categories for delete to authenticated
  using ((select public.has_cms_role(array['admin'])));


-- -----------------------------------------------------------------------------
-- 7. Escrita: informações institucionais e redes sociais (somente admin)
-- -----------------------------------------------------------------------------

create policy "Admins can update site settings"
  on public.site_settings for update to authenticated
  using ((select public.has_cms_role(array['admin'])))
  with check ((select public.has_cms_role(array['admin'])));

create policy "Admins can create social links"
  on public.social_links for insert to authenticated
  with check ((select public.has_cms_role(array['admin'])));

create policy "Admins can update social links"
  on public.social_links for update to authenticated
  using ((select public.has_cms_role(array['admin'])))
  with check ((select public.has_cms_role(array['admin'])));

create policy "Admins can delete social links"
  on public.social_links for delete to authenticated
  using ((select public.has_cms_role(array['admin'])));


-- -----------------------------------------------------------------------------
-- 8. Gravação atômica de publicação + projetos + linhas de pesquisa
--
-- Mesmo contrato de save_project: p_id null cria; caso contrário atualiza
-- apenas se updated_at ainda for p_expected_updated_at. Depois sincroniza os
-- dois conjuntos de vínculos (remove só os desmarcados, insere só os novos).
-- Qualquer erro (validação, constraint, FK, RLS) desfaz tudo. Erros próprios:
--   GL404 publicação inexistente; GL409 alterada por outra pessoa;
--   22023 lista de vínculos inválida; 42501 sem permissão.
-- -----------------------------------------------------------------------------

create function public.save_publication(
  p_id uuid,
  p_expected_updated_at timestamptz,
  p_title text,
  p_slug text,
  p_authors text,
  p_publication_venue text,
  p_publication_year integer,
  p_doi text,
  p_external_url text,
  p_abstract text,
  p_citation text,
  p_sort_order integer,
  p_is_featured boolean,
  p_is_published boolean,
  p_project_ids uuid[],
  p_research_line_ids uuid[]
)
returns public.publications
language plpgsql
security invoker
set search_path = ''
as $$
declare
  saved public.publications;
  project_ids uuid[] := coalesce(p_project_ids, '{}');
  line_ids uuid[] := coalesce(p_research_line_ids, '{}');
begin
  if not public.has_cms_role(array['admin', 'editor']) then
    raise exception 'sem permissão para editar publicações' using errcode = '42501';
  end if;

  if array_position(project_ids, null) is not null
     or cardinality(project_ids) > 100
     or (select count(distinct id) from unnest(project_ids) as id) <> cardinality(project_ids)
     or array_position(line_ids, null) is not null
     or cardinality(line_ids) > 100
     or (select count(distinct id) from unnest(line_ids) as id) <> cardinality(line_ids) then
    raise exception 'lista de vínculos inválida' using errcode = '22023';
  end if;

  if p_publication_year is not null and p_publication_year not between 1800 and 2100 then
    raise exception 'ano de publicação fora do intervalo' using errcode = '22023';
  end if;

  if p_id is null then
    insert into public.publications (
      title, slug, authors, publication_venue, publication_year,
      doi, external_url, abstract, citation,
      sort_order, is_featured, is_published
    )
    values (
      p_title, p_slug, p_authors, p_publication_venue, p_publication_year,
      p_doi, p_external_url, p_abstract, p_citation,
      p_sort_order, p_is_featured, p_is_published
    )
    returning * into saved;
  else
    update public.publications
    set title = p_title,
        slug = p_slug,
        authors = p_authors,
        publication_venue = p_publication_venue,
        publication_year = p_publication_year,
        doi = p_doi,
        external_url = p_external_url,
        abstract = p_abstract,
        citation = p_citation,
        sort_order = p_sort_order,
        is_featured = p_is_featured,
        is_published = p_is_published
    where id = p_id
      and updated_at = p_expected_updated_at
    returning * into saved;

    if not found then
      if not exists (select 1 from public.publications where id = p_id) then
        raise exception 'publicação não encontrada' using errcode = 'GL404';
      end if;
      if exists (select 1 from public.publications
                 where id = p_id and updated_at <> p_expected_updated_at) then
        raise exception 'publicação alterada por outra pessoa' using errcode = 'GL409';
      end if;
      raise exception 'sem permissão para editar publicações' using errcode = '42501';
    end if;
  end if;

  delete from public.publication_projects
  where publication_id = saved.id
    and project_id <> all (project_ids);

  delete from public.publication_research_lines
  where publication_id = saved.id
    and research_line_id <> all (line_ids);

  -- Projeto ou linha inexistente: violação de FK (23503) desfaz tudo.
  insert into public.publication_projects (publication_id, project_id)
  select saved.id, project_id
  from unnest(project_ids) as project_id
  on conflict do nothing;

  insert into public.publication_research_lines (publication_id, research_line_id)
  select saved.id, line_id
  from unnest(line_ids) as line_id
  on conflict do nothing;

  return saved;
end;
$$;

comment on function public.save_publication is
  'CMS: cria/atualiza uma publicação e sincroniza seus projetos e linhas de pesquisa numa única transação (SECURITY INVOKER).';

revoke execute on function public.save_publication from public, anon;
grant execute on function public.save_publication to authenticated;
