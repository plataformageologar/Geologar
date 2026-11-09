-- =============================================================================
-- GeoLogar — CMS de linhas de pesquisa, projetos e seus vínculos (Etapa 7.2)
--
-- Libera, para contas com vínculo ATIVO em admin_memberships:
--   - leitura de rascunhos (research_lines, projects) e de todos os vínculos,
--     inclusive os de publicações (necessários para checar dependências antes
--     de uma exclusão; publicações continuam só leitura e só publicadas);
--   - INSERT/UPDATE em research_lines e projects, apenas nas colunas
--     editoriais (id, created_at, updated_at, published_at e image_path
--     continuam fora do alcance da API);
--   - INSERT/DELETE em project_research_lines;
--   - DELETE de linhas e projetos somente para `admin`, somente de registros
--     não publicados.
--
-- Integridade:
--   - os vínculos que apontam para linhas e projetos passam de ON DELETE
--     CASCADE para RESTRICT: excluir uma linha ou projeto com vínculos é
--     recusado pelo próprio banco (sem condição de corrida), em vez de apagar
--     relações científicas em silêncio;
--   - save_project grava projeto + vínculos numa única transação, como
--     SECURITY INVOKER (sujeita a RLS e aos GRANTs de coluna).
--
-- Não há SECURITY DEFINER, USING (true) nem escrita para anon. As policies
-- públicas de leitura (somente conteúdo publicado) permanecem inalteradas.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Papel no CMS
-- -----------------------------------------------------------------------------

-- Verdadeiro quando o usuário da requisição tem vínculo ativo com um dos
-- papéis informados. SECURITY INVOKER: lê admin_memberships sob o RLS do
-- próprio usuário (que enxerga apenas o próprio vínculo).
create function public.has_cms_role(allowed_roles text[])
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_memberships as membership
    where membership.user_id = (select auth.uid())
      and membership.is_active
      and membership.role = any (allowed_roles)
  );
$$;

comment on function public.has_cms_role(text[]) is
  'true quando auth.uid() tem vínculo ativo em admin_memberships com um dos papéis informados.';

revoke execute on function public.has_cms_role(text[]) from public, anon;
grant execute on function public.has_cms_role(text[]) to authenticated;


-- -----------------------------------------------------------------------------
-- 2. Constraints de conteúdo (protegem o banco mesmo fora do formulário)
-- -----------------------------------------------------------------------------

alter table public.research_lines
  add constraint research_lines_title_not_blank check (btrim(title) <> ''),
  add constraint research_lines_slug_length check (char_length(slug) <= 160),
  add constraint research_lines_sort_order_nonnegative check (sort_order >= 0);

alter table public.projects
  add constraint projects_title_not_blank check (btrim(title) <> ''),
  add constraint projects_slug_length check (char_length(slug) <= 160),
  add constraint projects_sort_order_nonnegative check (sort_order >= 0);


-- -----------------------------------------------------------------------------
-- 3. Vínculos: exclusão de linhas e projetos bloqueada enquanto houver vínculo
--    (o lado das publicações mantém CASCADE até a etapa de publicações).
-- -----------------------------------------------------------------------------

alter table public.project_research_lines
  drop constraint project_research_lines_project_id_fkey,
  add constraint project_research_lines_project_id_fkey
    foreign key (project_id) references public.projects (id) on delete restrict,
  drop constraint project_research_lines_research_line_id_fkey,
  add constraint project_research_lines_research_line_id_fkey
    foreign key (research_line_id) references public.research_lines (id) on delete restrict;

alter table public.publication_projects
  drop constraint publication_projects_project_id_fkey,
  add constraint publication_projects_project_id_fkey
    foreign key (project_id) references public.projects (id) on delete restrict;

alter table public.publication_research_lines
  drop constraint publication_research_lines_research_line_id_fkey,
  add constraint publication_research_lines_research_line_id_fkey
    foreign key (research_line_id) references public.research_lines (id) on delete restrict;


-- -----------------------------------------------------------------------------
-- 4. Privilégios (somente colunas editoriais)
-- -----------------------------------------------------------------------------

grant insert (
  title, slug, short_description, description,
  sort_order, is_featured, is_published
) on public.research_lines to authenticated;

grant update (
  title, slug, short_description, description, image_alt,
  sort_order, is_featured, is_published
) on public.research_lines to authenticated;

grant insert (
  title, slug, short_description, description,
  project_status, start_date, end_date,
  coordination, funding, result_or_contribution, external_url,
  sort_order, is_featured, is_published
) on public.projects to authenticated;

grant update (
  title, slug, short_description, description, image_alt,
  project_status, start_date, end_date,
  coordination, funding, result_or_contribution, external_url,
  sort_order, is_featured, is_published
) on public.projects to authenticated;

-- A exclusão em si é decidida pelas policies (admin + não publicado).
grant delete on public.research_lines, public.projects to authenticated;

grant insert (project_id, research_line_id) on public.project_research_lines to authenticated;
grant delete on public.project_research_lines to authenticated;


-- -----------------------------------------------------------------------------
-- 5. Leitura administrativa (soma-se às policies públicas existentes)
-- -----------------------------------------------------------------------------

create policy "CMS staff can read all research lines"
  on public.research_lines for select to authenticated
  using ((select public.has_cms_role(array['admin', 'editor'])));

create policy "CMS staff can read all projects"
  on public.projects for select to authenticated
  using ((select public.has_cms_role(array['admin', 'editor'])));

create policy "CMS staff can read all project research line links"
  on public.project_research_lines for select to authenticated
  using ((select public.has_cms_role(array['admin', 'editor'])));

create policy "CMS staff can read all publication project links"
  on public.publication_projects for select to authenticated
  using ((select public.has_cms_role(array['admin', 'editor'])));

create policy "CMS staff can read all publication research line links"
  on public.publication_research_lines for select to authenticated
  using ((select public.has_cms_role(array['admin', 'editor'])));


-- -----------------------------------------------------------------------------
-- 6. Escrita
-- -----------------------------------------------------------------------------

create policy "CMS staff can create research lines"
  on public.research_lines for insert to authenticated
  with check ((select public.has_cms_role(array['admin', 'editor'])));

create policy "CMS staff can update research lines"
  on public.research_lines for update to authenticated
  using ((select public.has_cms_role(array['admin', 'editor'])))
  with check ((select public.has_cms_role(array['admin', 'editor'])));

create policy "Admins can delete unpublished research lines"
  on public.research_lines for delete to authenticated
  using ((select public.has_cms_role(array['admin'])) and not is_published);

create policy "CMS staff can create projects"
  on public.projects for insert to authenticated
  with check ((select public.has_cms_role(array['admin', 'editor'])));

create policy "CMS staff can update projects"
  on public.projects for update to authenticated
  using ((select public.has_cms_role(array['admin', 'editor'])))
  with check ((select public.has_cms_role(array['admin', 'editor'])));

create policy "Admins can delete unpublished projects"
  on public.projects for delete to authenticated
  using ((select public.has_cms_role(array['admin'])) and not is_published);

create policy "CMS staff can link projects and research lines"
  on public.project_research_lines for insert to authenticated
  with check ((select public.has_cms_role(array['admin', 'editor'])));

create policy "CMS staff can unlink projects and research lines"
  on public.project_research_lines for delete to authenticated
  using ((select public.has_cms_role(array['admin', 'editor'])));


-- -----------------------------------------------------------------------------
-- 7. Gravação atômica de projeto + linhas de pesquisa
--
-- p_id null cria o projeto; caso contrário atualiza apenas se updated_at
-- ainda for p_expected_updated_at (edição simultânea). Depois sincroniza os
-- vínculos: remove só os desmarcados e insere só os novos. Qualquer erro
-- (validação, constraint, FK, RLS) desfaz tudo. Erros próprios:
--   GL404 projeto inexistente; GL409 projeto alterado por outra pessoa;
--   22023 lista de linhas inválida; 42501 sem permissão.
-- -----------------------------------------------------------------------------

create function public.save_project(
  p_id uuid,
  p_expected_updated_at timestamptz,
  p_title text,
  p_slug text,
  p_short_description text,
  p_description text,
  p_image_alt text,
  p_project_status text,
  p_start_date date,
  p_end_date date,
  p_coordination text,
  p_funding text,
  p_result_or_contribution text,
  p_external_url text,
  p_sort_order integer,
  p_is_featured boolean,
  p_is_published boolean,
  p_research_line_ids uuid[]
)
returns public.projects
language plpgsql
security invoker
set search_path = ''
as $$
declare
  saved public.projects;
  line_ids uuid[] := coalesce(p_research_line_ids, '{}');
begin
  if not public.has_cms_role(array['admin', 'editor']) then
    raise exception 'sem permissão para editar projetos' using errcode = '42501';
  end if;

  if array_position(line_ids, null) is not null
     or cardinality(line_ids) > 100
     or (select count(distinct id) from unnest(line_ids) as id) <> cardinality(line_ids) then
    raise exception 'lista de linhas de pesquisa inválida' using errcode = '22023';
  end if;

  if p_id is null then
    insert into public.projects (
      title, slug, short_description, description,
      project_status, start_date, end_date,
      coordination, funding, result_or_contribution, external_url,
      sort_order, is_featured, is_published
    )
    values (
      p_title, p_slug, p_short_description, p_description,
      p_project_status, p_start_date, p_end_date,
      p_coordination, p_funding, p_result_or_contribution, p_external_url,
      p_sort_order, p_is_featured, p_is_published
    )
    returning * into saved;
  else
    update public.projects
    set title = p_title,
        slug = p_slug,
        short_description = p_short_description,
        description = p_description,
        -- Sem imagem não há texto alternativo a editar (upload: Etapa 8).
        image_alt = case when image_path is null then image_alt else p_image_alt end,
        project_status = p_project_status,
        start_date = p_start_date,
        end_date = p_end_date,
        coordination = p_coordination,
        funding = p_funding,
        result_or_contribution = p_result_or_contribution,
        external_url = p_external_url,
        sort_order = p_sort_order,
        is_featured = p_is_featured,
        is_published = p_is_published
    where id = p_id
      and updated_at = p_expected_updated_at
    returning * into saved;

    if not found then
      if not exists (select 1 from public.projects where id = p_id) then
        raise exception 'projeto não encontrado' using errcode = 'GL404';
      end if;
      if exists (select 1 from public.projects
                 where id = p_id and updated_at <> p_expected_updated_at) then
        raise exception 'projeto alterado por outra pessoa' using errcode = 'GL409';
      end if;
      raise exception 'sem permissão para editar projetos' using errcode = '42501';
    end if;
  end if;

  delete from public.project_research_lines
  where project_id = saved.id
    and research_line_id <> all (line_ids);

  -- Linha inexistente: violação de FK (23503) desfaz a transação inteira.
  insert into public.project_research_lines (project_id, research_line_id)
  select saved.id, line_id
  from unnest(line_ids) as line_id
  on conflict do nothing;

  return saved;
end;
$$;

comment on function public.save_project is
  'CMS: cria/atualiza um projeto e sincroniza suas linhas de pesquisa numa única transação (SECURITY INVOKER).';

revoke execute on function public.save_project from public, anon;
grant execute on function public.save_project to authenticated;
