-- =============================================================================
-- Etapa 8: Supabase Storage e biblioteca de mídia do CMS
--
-- - bucket público `geologar-media` (JPEG, PNG e WebP até 5 MB), com objetos
--   em `uploads/<uuid>.<ext>`;
-- - policies de storage.objects restritas a esse bucket: listar e enviar
--   (admin/editor ativos), excluir (somente admin e somente arquivos que não
--   estejam em uso); sem UPDATE (nada é sobrescrito nem movido);
-- - referências de imagem nas tabelas editoriais: formato validado por
--   constraint e existência do objeto verificada por trigger;
-- - GRANTs de escrita nas colunas de mídia (logo e favicon institucionais:
--   somente admin, pela policy já existente de site_settings);
-- - save_project passa a receber image_path (imagem, texto alternativo,
--   dados e vínculos continuam numa única transação);
-- - list_media: listagem paginada da biblioteca a partir de storage.objects
--   (a própria tabela do Storage é a fonte de verdade; nada é duplicado).
--
-- Nenhuma função SECURITY DEFINER: tudo roda com a sessão do usuário e o RLS.
-- Não altera registros existentes (todas as colunas de mídia estão vazias ou
-- apontam para arquivos locais de public/, que continuam aceitos).
-- =============================================================================

-- Bucket --------------------------------------------------------------------------

-- Público: qualquer pessoa com a URL vê o arquivo (inclusive antes de ele ser
-- associado a um conteúdo publicado). Apenas imagens institucionais.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'geologar-media',
  'geologar-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Funções auxiliares (SECURITY INVOKER, search_path vazio) -----------------------

-- Nome de objeto aceito na biblioteca: `uploads/<uuid v4 minúsculo>.<ext>`.
create function public.is_media_object_name(value text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select value ~ '^uploads/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$';
$$;

-- Referência de imagem aceita nas tabelas editoriais: objeto da biblioteca ou
-- arquivo local de public/ ("/images/x.jpg"), sem "..", "//" nem esquemas.
create function public.is_valid_image_reference(value text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select value is null
    or public.is_media_object_name(value)
    or (
      value ~ '^/[A-Za-z0-9_-][A-Za-z0-9/_.-]*\.(jpg|jpeg|png|webp|avif|svg)$'
      and value !~ '\.\.'
      and value !~ '//'
    );
$$;

-- Trava por objeto, mantida até o fim da transação. Associação e exclusão do
-- mesmo arquivo passam por ela, em série (ver check_media_references e
-- media_object_deletable).
create function public.lock_media_object(p_name text)
returns void
language sql
volatile
set search_path = ''
as $$
  select pg_advisory_xact_lock(hashtextextended('geologar-media:' || p_name, 0));
$$;

-- Onde um objeto da biblioteca é usado. Com RLS: admin e editor enxergam
-- rascunhos; para outros papéis o resultado é parcial (e eles não excluem).
create function public.media_usage(p_name text)
returns table (entity text, record_id uuid, label text)
language sql
stable
set search_path = ''
as $$
  select 'homepage'::text, h.id, 'Homepage (banner principal)'::text
  from public.homepage_content h where h.hero_image_path = p_name
  union all
  select 'research-line', r.id, r.title from public.research_lines r where r.image_path = p_name
  union all
  select 'project', p.id, p.title from public.projects p where p.image_path = p_name
  union all
  select 'institution', i.id, i.name from public.institutions i where i.logo_path = p_name
  union all
  select 'site-logo', s.id, 'Logotipo institucional'::text from public.site_settings s where s.logo_path = p_name
  union all
  select 'site-favicon', s.id, 'Favicon do site'::text from public.site_settings s where s.favicon_path = p_name;
$$;

-- Usada pela policy de DELETE. VOLATILE de propósito: em READ COMMITTED, a
-- consulta depois da trava enxerga associações confirmadas enquanto esperava.
create function public.media_object_deletable(p_name text)
returns boolean
language plpgsql
volatile
set search_path = ''
as $$
begin
  perform public.lock_media_object(p_name);
  return not exists (select 1 from public.media_usage(p_name));
end;
$$;

-- Trigger das tabelas editoriais: ao gravar uma referência nova da biblioteca,
-- trava o objeto e confirma que ele existe (uma exclusão concorrente ou já
-- confirmada faz a gravação falhar com GL422). As colunas vêm em TG_ARGV.
create function public.check_media_references()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  column_name text;
  new_value text;
  old_value text;
begin
  foreach column_name in array tg_argv loop
    new_value := to_jsonb(new) ->> column_name;
    old_value := case when tg_op = 'UPDATE' then to_jsonb(old) ->> column_name end;

    if new_value is not null
       and new_value is distinct from old_value
       and public.is_media_object_name(new_value) then
      perform public.lock_media_object(new_value);
      if not exists (
        select 1 from storage.objects o
        where o.bucket_id = 'geologar-media' and o.name = new_value
      ) then
        raise exception 'imagem inexistente na biblioteca: %', new_value
          using errcode = 'GL422';
      end if;
    end if;
  end loop;
  return new;
end;
$$;

revoke execute on function public.lock_media_object(text) from public, anon;
revoke execute on function public.media_usage(text) from public, anon;
revoke execute on function public.media_object_deletable(text) from public, anon;
revoke execute on function public.check_media_references() from public, anon, authenticated;
grant execute on function public.lock_media_object(text) to authenticated;
grant execute on function public.media_usage(text) to authenticated;
grant execute on function public.media_object_deletable(text) to authenticated;

-- Constraints de formato das referências --------------------------------------------

alter table public.homepage_content
  add constraint homepage_content_hero_image_path_format
  check (public.is_valid_image_reference(hero_image_path));
alter table public.research_lines
  add constraint research_lines_image_path_format
  check (public.is_valid_image_reference(image_path));
alter table public.projects
  add constraint projects_image_path_format
  check (public.is_valid_image_reference(image_path));
alter table public.institutions
  add constraint institutions_logo_path_format
  check (public.is_valid_image_reference(logo_path));
alter table public.site_settings
  add constraint site_settings_logo_path_format
  check (public.is_valid_image_reference(logo_path)),
  add constraint site_settings_favicon_path_format
  check (public.is_valid_image_reference(favicon_path));

-- Existência do objeto (triggers) ---------------------------------------------------

create trigger homepage_content_media_references
  before insert or update of hero_image_path on public.homepage_content
  for each row execute function public.check_media_references('hero_image_path');
create trigger research_lines_media_references
  before insert or update of image_path on public.research_lines
  for each row execute function public.check_media_references('image_path');
create trigger projects_media_references
  before insert or update of image_path on public.projects
  for each row execute function public.check_media_references('image_path');
create trigger institutions_media_references
  before insert or update of logo_path on public.institutions
  for each row execute function public.check_media_references('logo_path');
create trigger site_settings_media_references
  before insert or update of logo_path, favicon_path on public.site_settings
  for each row execute function public.check_media_references('logo_path', 'favicon_path');

-- GRANTs nas colunas de mídia -------------------------------------------------------
-- As policies existentes continuam decidindo quem grava cada tabela:
-- homepage, linhas, projetos e instituições: admin e editor;
-- site_settings: somente admin ("Admins can update site settings").

grant update (hero_image_path) on public.homepage_content to authenticated;
grant insert (image_path, image_alt) on public.research_lines to authenticated;
grant update (image_path) on public.research_lines to authenticated;
grant insert (image_path, image_alt) on public.projects to authenticated;
grant update (image_path) on public.projects to authenticated;
grant insert (logo_path, logo_alt) on public.institutions to authenticated;
grant update (logo_path) on public.institutions to authenticated;
grant update (logo_path, favicon_path) on public.site_settings to authenticated;

-- Policies do Storage (somente o bucket geologar-media) ----------------------------

create policy "CMS staff can read media library"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'geologar-media'
    and (select public.has_cms_role(array['admin', 'editor']))
  );

create policy "CMS staff can upload media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'geologar-media'
    and (select public.has_cms_role(array['admin', 'editor']))
    and public.is_media_object_name(name)
  );

create policy "Admins can delete unused media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'geologar-media'
    and (select public.has_cms_role(array['admin']))
    and public.media_object_deletable(name)
  );

-- save_project com imagem -------------------------------------------------------------
-- Substitui a versão da Etapa 7.2 (mesmos contratos + p_image_path). Imagem e
-- texto alternativo são gravados juntos; sem imagem, o texto alternativo é
-- limpo.

drop function public.save_project(
  uuid, timestamptz, text, text, text, text, text, text, date, date,
  text, text, text, text, integer, boolean, boolean, uuid[]
);

create function public.save_project(
  p_id uuid,
  p_expected_updated_at timestamptz,
  p_title text,
  p_slug text,
  p_short_description text,
  p_description text,
  p_image_path text,
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
set search_path = ''
as $$
declare
  saved public.projects;
  line_ids uuid[] := coalesce(p_research_line_ids, '{}');
  image_alt_value text := case when p_image_path is null then null else p_image_alt end;
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
      title, slug, short_description, description, image_path, image_alt,
      project_status, start_date, end_date,
      coordination, funding, result_or_contribution, external_url,
      sort_order, is_featured, is_published
    )
    values (
      p_title, p_slug, p_short_description, p_description, p_image_path, image_alt_value,
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
        image_path = p_image_path,
        image_alt = image_alt_value,
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

revoke execute on function public.save_project(
  uuid, timestamptz, text, text, text, text, text, text, text, date, date,
  text, text, text, text, integer, boolean, boolean, uuid[]
) from public, anon;
grant execute on function public.save_project(
  uuid, timestamptz, text, text, text, text, text, text, text, date, date,
  text, text, text, text, integer, boolean, boolean, uuid[]
) to authenticated;

-- Listagem da biblioteca ---------------------------------------------------------------
-- Lê storage.objects com a sessão do usuário: pela policy acima, só admin e
-- editor ativos recebem linhas. Metadados do envio (nome original e
-- dimensões) ficam em user_metadata, gravados pelo CMS no upload.

create function public.list_media(
  p_search text default null,
  p_unused_only boolean default false,
  p_limit integer default 24,
  p_offset integer default 0
)
returns table (
  name text,
  created_at timestamptz,
  size_bytes bigint,
  mime_type text,
  original_name text,
  width integer,
  height integer,
  usage_count integer,
  total_count bigint
)
language sql
stable
set search_path = ''
as $$
  with media as (
    select
      o.name,
      o.created_at,
      nullif(o.metadata ->> 'size', '')::bigint as size_bytes,
      o.metadata ->> 'mimetype' as mime_type,
      o.user_metadata ->> 'originalName' as original_name,
      case when o.user_metadata ->> 'width' ~ '^[0-9]{1,6}$'
        then (o.user_metadata ->> 'width')::integer end as width,
      case when o.user_metadata ->> 'height' ~ '^[0-9]{1,6}$'
        then (o.user_metadata ->> 'height')::integer end as height,
      (select count(*)::integer from public.media_usage(o.name)) as usage_count
    from storage.objects o
    where o.bucket_id = 'geologar-media'
      and public.is_media_object_name(o.name)
      and (
        p_search is null or p_search = ''
        or coalesce(o.user_metadata ->> 'originalName', '') ilike
          '%' || replace(replace(replace(p_search, '\', '\\'), '%', '\%'), '_', '\_') || '%'
      )
  )
  select m.*, count(*) over () as total_count
  from media m
  where not p_unused_only or m.usage_count = 0
  order by m.created_at desc, m.name
  limit least(greatest(coalesce(p_limit, 24), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke execute on function public.list_media(text, boolean, integer, integer) from public, anon;
grant execute on function public.list_media(text, boolean, integer, integer) to authenticated;
