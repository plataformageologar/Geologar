-- =============================================================================
-- GeoLogar — Rascunhos, publicação controlada, histórico de versões e páginas
-- personalizadas (Etapa 9.6)
--
-- Modelo
--   As tabelas editoriais existentes (homepage_content, page_sections,
--   site_pillars, page_content, site_navigation, site_appearance,
--   site_settings) continuam sendo a VERSÃO PUBLICADA: o site público segue
--   lendo apenas delas. Rascunhos e histórico ficam numa camada privada:
--
--     editorial_documents   uma linha por unidade de publicação (homepage,
--                           A Rede, cada página interna, pilares, navegação,
--                           aparência, configurações, cada página
--                           personalizada), com o rascunho atual (JSONB),
--                           a revisão publicada e um número de versão usado
--                           para detectar edição simultânea (GL409).
--     editorial_revisions   histórico imutável: cada rascunho salvo,
--                           restauração e publicação vira uma revisão
--                           numerada com o conteúdo completo da unidade.
--     custom_pages          identidade e situação das páginas criadas pela
--                           equipe (/paginas/<slug>); os blocos ficam em
--                           page_sections (page_key = 'custom').
--
-- Fluxo
--   save_editorial_drafts       grava rascunhos (várias unidades numa transação)
--   publish_editorial_documents aplica rascunhos às tabelas publicadas, numa
--                               única transação, e registra a revisão publicada
--   discard_editorial_draft     descarta o rascunho (volta ao publicado)
--   restore_editorial_revision  transforma uma revisão antiga em NOVO rascunho
--   create_custom_page, update_custom_page_slug, set_custom_page_status
--
-- Todas as funções são SECURITY INVOKER: RLS e GRANTs das tabelas continuam
-- valendo (editor não publica aparência, navegação nem configurações). Um
-- trigger de guarda recusa escrita de anon/authenticated nas tabelas
-- editoriais fora dessas funções (que ligam `geologar.editorial_write` só
-- durante a própria transação), fechando o caminho antigo de gravação direta.
-- Sem SECURITY DEFINER, sem USING (true) para escrita, sem service_role.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Páginas personalizadas
-- -----------------------------------------------------------------------------

create table public.custom_pages (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null,
  status             text not null default 'draft',
  eyebrow            text,
  title              text not null,
  description        text,
  seo_title          text,
  seo_description    text,
  seo_image_path     text,
  published_at       timestamptz,
  first_published_at timestamptz,
  archived_at        timestamptz,
  created_by         uuid default auth.uid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint custom_pages_slug_unique unique (slug),
  constraint custom_pages_slug_format check (
    slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 100
  ),
  constraint custom_pages_status check (status in ('draft', 'published', 'archived')),
  constraint custom_pages_title_length check (btrim(title) <> '' and char_length(title) <= 160),
  constraint custom_pages_eyebrow_length check (char_length(eyebrow) <= 60),
  constraint custom_pages_description_length check (char_length(description) <= 1000),
  constraint custom_pages_seo_title_length check (char_length(seo_title) <= 70),
  constraint custom_pages_seo_description_length check (char_length(seo_description) <= 200),
  constraint custom_pages_seo_image_path_format check (public.is_valid_image_reference(seo_image_path)),
  constraint custom_pages_published_consistency check (status <> 'published' or published_at is not null)
);

comment on table public.custom_pages is
  'Páginas institucionais criadas pela equipe (/paginas/<slug>). Campos = versão publicada; rascunho em editorial_documents.';

create trigger set_updated_at before update on public.custom_pages
  for each row execute function public.set_updated_at();

create trigger custom_pages_media_references
  before insert or update of seo_image_path on public.custom_pages
  for each row execute function public.check_media_references('seo_image_path');


-- -----------------------------------------------------------------------------
-- 2. Blocos das páginas personalizadas em page_sections
--    home/rede continuam iguais; 'custom' exige a página e só aceita blocos.
-- -----------------------------------------------------------------------------

alter table public.page_sections
  add column custom_page_id uuid references public.custom_pages (id) on delete restrict;

alter table public.page_sections drop constraint page_sections_page_key;
alter table public.page_sections add constraint page_sections_page_key check (
  (page_key in ('home', 'rede') and custom_page_id is null)
  or (
    page_key = 'custom'
    and custom_page_id is not null
    and section_type in ('text', 'image_text', 'cta', 'gallery', 'logos')
  )
);

create index page_sections_custom_page_order
  on public.page_sections (custom_page_id, sort_order)
  where custom_page_id is not null;

grant insert (custom_page_id) on public.page_sections to authenticated;

-- Blocos de páginas personalizadas só são públicos com a página publicada.
drop policy "Public can read visible page sections" on public.page_sections;
create policy "Public can read visible page sections"
  on public.page_sections for select to anon, authenticated
  using (
    is_visible
    and (
      page_key <> 'custom'
      or exists (
        select 1 from public.custom_pages c
        where c.id = page_sections.custom_page_id and c.status = 'published'
      )
    )
  );


-- -----------------------------------------------------------------------------
-- 3. Documentos editoriais e revisões
-- -----------------------------------------------------------------------------

create table public.editorial_documents (
  id                     uuid primary key default gen_random_uuid(),
  doc_type               text not null,
  doc_key                text not null,
  custom_page_id         uuid references public.custom_pages (id) on delete restrict,
  draft                  jsonb,
  draft_base_revision_id uuid,
  draft_updated_at       timestamptz,
  draft_updated_by       uuid,
  draft_updated_by_email text,
  version                integer not null default 1,
  published_revision_id  uuid,
  published_at           timestamptz,
  published_by           uuid,
  published_by_email     text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  constraint editorial_documents_unique unique (doc_type, doc_key),
  constraint editorial_documents_custom_page_unique unique (custom_page_id),
  constraint editorial_documents_type check (
    doc_type in ('home', 'rede', 'page', 'pillars', 'navigation', 'appearance', 'settings', 'custom')
  ),
  constraint editorial_documents_key check (
    case doc_type
      when 'page' then doc_key in ('pesquisa', 'projetos', 'publicacoes', 'instituicoes', 'contato')
      when 'custom' then custom_page_id is not null and doc_key = custom_page_id::text
      else doc_key = doc_type
    end
  ),
  constraint editorial_documents_custom_only check ((doc_type = 'custom') = (custom_page_id is not null)),
  constraint editorial_documents_version_positive check (version > 0)
);

comment on table public.editorial_documents is
  'Unidades de publicação: rascunho atual (privado), revisão publicada e versão para detectar edição simultânea.';

create table public.editorial_revisions (
  id               uuid primary key default gen_random_uuid(),
  document_id      uuid not null references public.editorial_documents (id) on delete restrict,
  revision_number  integer not null,
  operation        text not null,
  content          jsonb not null,
  base_revision_id uuid references public.editorial_revisions (id) on delete restrict,
  restored_from_id uuid references public.editorial_revisions (id) on delete restrict,
  author_id        uuid default auth.uid(),
  author_email     text,
  note             text,
  created_at       timestamptz not null default now(),

  constraint editorial_revisions_number unique (document_id, revision_number),
  constraint editorial_revisions_operation check (operation in ('draft_saved', 'published', 'restored')),
  constraint editorial_revisions_note_length check (char_length(note) <= 300)
);

comment on table public.editorial_revisions is
  'Histórico de versões (somente inclusão): rascunhos salvos, restaurações e publicações.';

create index editorial_revisions_document_recent
  on public.editorial_revisions (document_id, revision_number desc);

alter table public.editorial_documents
  add constraint editorial_documents_published_revision
    foreign key (published_revision_id) references public.editorial_revisions (id) on delete restrict,
  add constraint editorial_documents_draft_base_revision
    foreign key (draft_base_revision_id) references public.editorial_revisions (id) on delete restrict;

create trigger set_updated_at before update on public.editorial_documents
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- 4. Funções auxiliares
-- -----------------------------------------------------------------------------

-- Quem edita (e publica) cada tipo de unidade: mesma matriz da Etapa 9.5.
create function public.editorial_can_edit(p_doc_type text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select case
    when p_doc_type in ('navigation', 'appearance', 'settings') then public.has_cms_role(array['admin'])
    else public.has_cms_role(array['admin', 'editor'])
  end;
$$;

-- Objeto com apenas chaves permitidas e valores texto/nulo.
create function public.editorial_text_object(p_value jsonb, p_allowed text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p_value) = 'object'
     and not exists (
       select 1 from jsonb_each(p_value) e
       where e.key <> all (p_allowed) or jsonb_typeof(e.value) not in ('string', 'null')
     );
$$;

-- Lista de objetos com chaves permitidas, tamanho máximo e id uuid ou nulo.
create function public.editorial_item_list(p_value jsonb, p_allowed text[], p_max integer)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p_value) = 'array'
     and jsonb_array_length(p_value) <= p_max
     and not exists (
       select 1 from jsonb_array_elements(p_value) item
       where jsonb_typeof(item) <> 'object'
          or exists (select 1 from jsonb_object_keys(item) k where k <> all (p_allowed))
          or (item ? 'id' and jsonb_typeof(item -> 'id') <> 'null'
              and (item ->> 'id') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
     );
$$;

-- Estrutura do conteúdo de cada tipo de unidade. Os textos são validados de
-- novo pelos CHECKs das tabelas publicadas na publicação; aqui garantimos o
-- formato (sem chaves, tipos de bloco ou configurações desconhecidas).
create function public.is_valid_editorial_content(p_doc_type text, p_content jsonb)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
  parts text[];
  item jsonb;
  list_name text;
begin
  if jsonb_typeof(p_content) is distinct from 'object' or octet_length(p_content::text) > 400000 then
    return false;
  end if;

  parts := case p_doc_type
    when 'home' then array['homepage', 'sections']
    when 'rede' then array['page', 'sections']
    when 'page' then array['page']
    when 'custom' then array['page', 'sections']
    when 'pillars' then array['items']
    when 'navigation' then array['header', 'footer']
    when 'appearance' then array['appearance']
    when 'settings' then array['settings']
  end;
  if parts is null
     or exists (select 1 from jsonb_object_keys(p_content) k where k <> all (parts))
     or exists (select 1 from unnest(parts) p where not (p_content ? p)) then
    return false;
  end if;

  if p_content ? 'homepage' and not public.editorial_text_object(p_content -> 'homepage', array[
    'hero_title', 'hero_description', 'hero_image_path', 'hero_image_alt',
    'hero_primary_cta_label', 'hero_primary_cta_href', 'hero_secondary_cta_label', 'hero_secondary_cta_href',
    'about_title', 'about_description', 'cooperation_title', 'cooperation_description',
    'cooperation_cta_label', 'cooperation_cta_href'
  ]) then
    return false;
  end if;

  if p_content ? 'page' and not public.editorial_text_object(p_content -> 'page', array[
    'eyebrow', 'title', 'description', 'seo_title', 'seo_description', 'seo_image_path'
  ]) then
    return false;
  end if;

  if p_content ? 'appearance' and not public.editorial_text_object(p_content -> 'appearance', array[
    'primary_color', 'secondary_color', 'accent_color', 'section_background',
    'button_shape', 'corner_style', 'heading_font', 'card_style'
  ]) then
    return false;
  end if;

  if p_content ? 'settings' and not public.editorial_text_object(p_content -> 'settings', array[
    'site_name', 'institutional_name', 'tagline', 'short_description', 'contact_email', 'contact_phone',
    'address', 'city', 'state', 'country', 'logo_path', 'favicon_path', 'footer_description', 'footer_note',
    'footer_nav_title', 'footer_contact_title', 'footer_social_title', 'footer_logo_mode', 'footer_logo_path',
    'header_style'
  ]) then
    return false;
  end if;

  if p_content ? 'items' then
    if not public.editorial_item_list(p_content -> 'items', array['id', 'title', 'description', 'icon', 'is_visible'], 12) then
      return false;
    end if;
    for item in select * from jsonb_array_elements(p_content -> 'items') loop
      if jsonb_typeof(item -> 'title') is distinct from 'string'
         or jsonb_typeof(item -> 'icon') is distinct from 'string'
         or jsonb_typeof(item -> 'is_visible') is distinct from 'boolean'
         or jsonb_typeof(item -> 'description') not in ('string', 'null') then
        return false;
      end if;
    end loop;
  end if;

  foreach list_name in array array['header', 'footer'] loop
    if p_content ? list_name then
      if not public.editorial_item_list(p_content -> list_name, array['id', 'label', 'href', 'open_in_new_tab', 'is_visible'], 20) then
        return false;
      end if;
      for item in select * from jsonb_array_elements(p_content -> list_name) loop
        if jsonb_typeof(item -> 'label') is distinct from 'string'
           or jsonb_typeof(item -> 'href') is distinct from 'string'
           or not public.is_valid_site_href(item ->> 'href')
           or jsonb_typeof(item -> 'open_in_new_tab') is distinct from 'boolean'
           or jsonb_typeof(item -> 'is_visible') is distinct from 'boolean' then
          return false;
        end if;
      end loop;
    end if;
  end loop;

  if p_content ? 'sections' then
    if not public.editorial_item_list(p_content -> 'sections', array['id', 'section_type', 'is_visible', 'settings'], 40) then
      return false;
    end if;
    for item in select * from jsonb_array_elements(p_content -> 'sections') loop
      if jsonb_typeof(item -> 'section_type') is distinct from 'string'
         or jsonb_typeof(item -> 'is_visible') is distinct from 'boolean'
         or jsonb_typeof(item -> 'settings') is distinct from 'object'
         or not public.is_valid_section_settings(item ->> 'section_type', item -> 'settings')
         or (p_doc_type = 'custom' and item ->> 'section_type' not in ('text', 'image_text', 'cta', 'gallery', 'logos')) then
        return false;
      end if;
    end loop;
  end if;

  return true;
end;
$$;

-- Imagens da biblioteca citadas em qualquer ponto de um conteúdo.
create function public.editorial_image_paths(p_content jsonb)
returns setof text
language sql
immutable
set search_path = ''
as $$
  select distinct value #>> '{}'
  from jsonb_path_query(coalesce(p_content, '{}'::jsonb), 'strict $.**') as value
  where jsonb_typeof(value) = 'string' and public.is_media_object_name(value #>> '{}');
$$;

create function public.editorial_document_label(p_doc_type text, p_doc_key text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_doc_type
    when 'home' then 'Página inicial'
    when 'rede' then 'A Rede'
    when 'page' then 'Página ' || p_doc_key
    when 'pillars' then 'Pilares'
    when 'navigation' then 'Navegação'
    when 'appearance' then 'Aparência'
    when 'settings' then 'Configurações'
    else 'Página personalizada'
  end;
$$;

-- Seções de uma página no formato do conteúdo editorial.
create function public.editorial_sections_snapshot(p_page_key text, p_custom_page_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object('id', s.id, 'section_type', s.section_type, 'is_visible', s.is_visible, 'settings', s.settings)
      order by s.sort_order, s.created_at
    ),
    '[]'::jsonb
  )
  from public.page_sections s
  where s.page_key = p_page_key and s.custom_page_id is not distinct from p_custom_page_id;
$$;

create function public.editorial_page_snapshot(p_page_key text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'eyebrow', c.eyebrow, 'title', c.title, 'description', c.description,
    'seo_title', c.seo_title, 'seo_description', c.seo_description, 'seo_image_path', c.seo_image_path
  )
  from public.page_content c
  where c.page_key = p_page_key;
$$;

-- Retrato da versão publicada de uma unidade (lida das tabelas publicadas).
create function public.editorial_snapshot(p_doc_type text, p_doc_key text)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  result jsonb;
begin
  case p_doc_type
    when 'home' then
      select jsonb_build_object(
        'homepage', jsonb_build_object(
          'hero_title', h.hero_title, 'hero_description', h.hero_description,
          'hero_image_path', h.hero_image_path, 'hero_image_alt', h.hero_image_alt,
          'hero_primary_cta_label', h.hero_primary_cta_label, 'hero_primary_cta_href', h.hero_primary_cta_href,
          'hero_secondary_cta_label', h.hero_secondary_cta_label, 'hero_secondary_cta_href', h.hero_secondary_cta_href,
          'about_title', h.about_title, 'about_description', h.about_description,
          'cooperation_title', h.cooperation_title, 'cooperation_description', h.cooperation_description,
          'cooperation_cta_label', h.cooperation_cta_label, 'cooperation_cta_href', h.cooperation_cta_href
        ),
        'sections', public.editorial_sections_snapshot('home', null)
      )
      into result
      from public.homepage_content h
      limit 1;
    when 'rede' then
      result := jsonb_build_object(
        'page', public.editorial_page_snapshot('rede'),
        'sections', public.editorial_sections_snapshot('rede', null)
      );
    when 'page' then
      result := jsonb_build_object('page', public.editorial_page_snapshot(p_doc_key));
    when 'pillars' then
      select jsonb_build_object('items', coalesce(jsonb_agg(
        jsonb_build_object('id', p.id, 'title', p.title, 'description', p.description, 'icon', p.icon, 'is_visible', p.is_visible)
        order by p.sort_order, p.created_at
      ), '[]'::jsonb))
      into result
      from public.site_pillars p;
    when 'navigation' then
      select jsonb_build_object(
        'header', coalesce(jsonb_agg(
          jsonb_build_object('id', n.id, 'label', n.label, 'href', n.href, 'open_in_new_tab', n.open_in_new_tab, 'is_visible', n.is_visible)
          order by n.sort_order, n.created_at
        ) filter (where n.location = 'header'), '[]'::jsonb),
        'footer', coalesce(jsonb_agg(
          jsonb_build_object('id', n.id, 'label', n.label, 'href', n.href, 'open_in_new_tab', n.open_in_new_tab, 'is_visible', n.is_visible)
          order by n.sort_order, n.created_at
        ) filter (where n.location = 'footer'), '[]'::jsonb)
      )
      into result
      from public.site_navigation n;
    when 'appearance' then
      select jsonb_build_object('appearance', jsonb_build_object(
        'primary_color', a.primary_color, 'secondary_color', a.secondary_color, 'accent_color', a.accent_color,
        'section_background', a.section_background, 'button_shape', a.button_shape, 'corner_style', a.corner_style,
        'heading_font', a.heading_font, 'card_style', a.card_style
      ))
      into result
      from public.site_appearance a
      limit 1;
    when 'settings' then
      select jsonb_build_object('settings', jsonb_build_object(
        'site_name', s.site_name, 'institutional_name', s.institutional_name, 'tagline', s.tagline,
        'short_description', s.short_description, 'contact_email', s.contact_email, 'contact_phone', s.contact_phone,
        'address', s.address, 'city', s.city, 'state', s.state, 'country', s.country,
        'logo_path', s.logo_path, 'favicon_path', s.favicon_path,
        'footer_description', s.footer_description, 'footer_note', s.footer_note,
        'footer_nav_title', s.footer_nav_title, 'footer_contact_title', s.footer_contact_title,
        'footer_social_title', s.footer_social_title, 'footer_logo_mode', s.footer_logo_mode,
        'footer_logo_path', s.footer_logo_path, 'header_style', s.header_style
      ))
      into result
      from public.site_settings s
      limit 1;
    when 'custom' then
      select jsonb_build_object(
        'page', jsonb_build_object(
          'eyebrow', c.eyebrow, 'title', c.title, 'description', c.description,
          'seo_title', c.seo_title, 'seo_description', c.seo_description, 'seo_image_path', c.seo_image_path
        ),
        'sections', public.editorial_sections_snapshot('custom', c.id)
      )
      into result
      from public.custom_pages c
      where c.id::text = p_doc_key;
    else
      result := null;
  end case;
  return result;
end;
$$;


-- -----------------------------------------------------------------------------
-- 5. Guarda contra gravação direta: migration seguinte
--    (20261123120500_editorial_write_guard.sql), aplicada junto com o código
--    que passa a usar o fluxo editorial.
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- 6. RLS e privilégios
-- -----------------------------------------------------------------------------

alter table public.custom_pages enable row level security;
alter table public.editorial_documents enable row level security;
alter table public.editorial_revisions enable row level security;

revoke all on public.custom_pages, public.editorial_documents, public.editorial_revisions from anon, authenticated;

-- Páginas: visitantes veem só as publicadas; a equipe vê todas.
grant select on public.custom_pages to anon, authenticated;
grant insert (slug, title, description, status, created_by) on public.custom_pages to authenticated;
grant update (
  slug, status, eyebrow, title, description, seo_title, seo_description, seo_image_path,
  published_at, first_published_at, archived_at
) on public.custom_pages to authenticated;

create policy "Public can read published custom pages"
  on public.custom_pages for select to anon, authenticated
  using (status = 'published');
create policy "CMS staff can read all custom pages"
  on public.custom_pages for select to authenticated
  using ((select public.has_cms_role(array['admin', 'editor'])));
create policy "CMS staff can create custom pages"
  on public.custom_pages for insert to authenticated
  with check ((select public.has_cms_role(array['admin', 'editor'])) and status = 'draft');
create policy "CMS staff can update custom pages"
  on public.custom_pages for update to authenticated
  using ((select public.has_cms_role(array['admin', 'editor'])))
  with check ((select public.has_cms_role(array['admin', 'editor'])));

-- Documentos: somente quem edita aquele tipo de unidade (nada é público).
grant select on public.editorial_documents to authenticated;
grant insert (doc_type, doc_key, custom_page_id, draft, draft_updated_at, draft_updated_by, draft_updated_by_email, version)
  on public.editorial_documents to authenticated;
grant update (
  draft, draft_base_revision_id, draft_updated_at, draft_updated_by, draft_updated_by_email, version,
  published_revision_id, published_at, published_by, published_by_email
) on public.editorial_documents to authenticated;

create policy "CMS staff can read editorial documents"
  on public.editorial_documents for select to authenticated
  using (public.editorial_can_edit(doc_type));
create policy "CMS staff can create custom page documents"
  on public.editorial_documents for insert to authenticated
  with check (doc_type = 'custom' and public.editorial_can_edit(doc_type));
create policy "CMS staff can update editorial documents"
  on public.editorial_documents for update to authenticated
  using (public.editorial_can_edit(doc_type))
  with check (public.editorial_can_edit(doc_type));

-- Revisões: leitura e inclusão por quem edita a unidade; nunca UPDATE/DELETE.
grant select on public.editorial_revisions to authenticated;
grant insert (
  document_id, revision_number, operation, content, base_revision_id, restored_from_id,
  author_id, author_email, note
) on public.editorial_revisions to authenticated;

create policy "CMS staff can read editorial revisions"
  on public.editorial_revisions for select to authenticated
  using (exists (select 1 from public.editorial_documents d where d.id = editorial_revisions.document_id));
create policy "CMS staff can add editorial revisions"
  on public.editorial_revisions for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (select 1 from public.editorial_documents d where d.id = editorial_revisions.document_id)
  );


-- -----------------------------------------------------------------------------
-- 7. Uso de imagens: rascunhos, histórico e páginas personalizadas contam
-- -----------------------------------------------------------------------------

create or replace function public.media_usage(p_name text)
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
  select 'site-favicon', s.id, 'Favicon do site'::text from public.site_settings s where s.favicon_path = p_name
  union all
  select 'site-footer-logo', s.id, 'Logotipo do rodapé'::text from public.site_settings s where s.footer_logo_path = p_name
  union all
  select 'page-content', null::uuid, 'Imagem de compartilhamento da página ' || c.page_key
  from public.page_content c where c.seo_image_path = p_name
  union all
  select 'custom-page', c.id, 'Imagem de compartilhamento: ' || c.title
  from public.custom_pages c where c.seo_image_path = p_name
  union all
  select 'page-section', coalesce(s.custom_page_id, s.id),
    'Bloco da página ' || case s.page_key when 'home' then 'inicial' when 'custom' then 'personalizada' else s.page_key end
  from public.page_sections s
  where exists (select 1 from public.section_image_paths(s.settings) as path where path = p_name)
  union all
  select 'editorial-draft', d.id, 'Rascunho: ' || public.editorial_document_label(d.doc_type, d.doc_key)
  from public.editorial_documents d
  where d.draft is not null and strpos(d.draft::text, '"' || p_name || '"') > 0
  union all
  select 'editorial-revision', d.id,
    'Histórico de versões: ' || public.editorial_document_label(d.doc_type, d.doc_key)
  from public.editorial_documents d
  where exists (
    select 1 from public.editorial_revisions r
    where r.document_id = d.id and strpos(r.content::text, '"' || p_name || '"') > 0
  );
$$;


-- -----------------------------------------------------------------------------
-- 8. Funções do fluxo editorial
--
-- Códigos: GL409 versão desatualizada (outra pessoa salvou ou publicou);
-- GL404 nada para publicar; GL422 imagem inexistente; GL423 operação não
-- permitida na situação atual da página; 42501 sem permissão; 22023 conteúdo
-- inválido; 23505 endereço (slug) já usado.
-- -----------------------------------------------------------------------------

-- Lista (id, updated_at) atual de uma tabela de listas, para reutilizar as
-- funções de gravação da Etapa 9.5 dentro da publicação.
create function public.editorial_section_versions(p_page_key text, p_custom_page_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'updated_at', s.updated_at)), '[]'::jsonb)
  from public.page_sections s
  where s.page_key = p_page_key and s.custom_page_id is not distinct from p_custom_page_id;
$$;

-- Blocos de uma página personalizada (mesma regra de save_page_sections).
create function public.save_custom_page_sections(p_page_id uuid, p_items jsonb)
returns setof public.page_sections
language plpgsql
security invoker
set search_path = ''
as $$
declare
  item jsonb;
  item_position integer := 0;
  item_id uuid;
  affected integer;
  kept uuid[] := '{}';
begin
  if not public.has_cms_role(array['admin', 'editor']) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) > 40 then
    raise exception 'lista de blocos inválida' using errcode = '22023';
  end if;

  for item in select * from jsonb_array_elements(p_items) loop
    if jsonb_typeof(item) <> 'object' or jsonb_typeof(item -> 'settings') is distinct from 'object' then
      raise exception 'bloco inválido' using errcode = '22023';
    end if;
    item_id := nullif(item ->> 'id', '')::uuid;
    if item_id is null then
      insert into public.page_sections (page_key, custom_page_id, section_type, sort_order, is_visible, settings)
      values ('custom', p_page_id, item ->> 'section_type', item_position,
              coalesce((item ->> 'is_visible')::boolean, true), item -> 'settings')
      returning id into item_id;
    else
      update public.page_sections
         set sort_order = item_position,
             is_visible = coalesce((item ->> 'is_visible')::boolean, true),
             settings = item -> 'settings'
       where id = item_id
         and page_key = 'custom'
         and custom_page_id = p_page_id
         and section_type = item ->> 'section_type';
      get diagnostics affected = row_count;
      if affected <> 1 then
        raise exception 'bloco inexistente ou sem permissão' using errcode = '42501';
      end if;
    end if;
    kept := kept || item_id;
    item_position := item_position + 1;
  end loop;

  delete from public.page_sections
   where page_key = 'custom' and custom_page_id = p_page_id and not (id = any (kept));
  if exists (
    select 1 from public.page_sections
    where page_key = 'custom' and custom_page_id = p_page_id and not (id = any (kept))
  ) then
    raise exception 'sem permissão para excluir blocos' using errcode = '42501';
  end if;

  return query
    select * from public.page_sections
    where page_key = 'custom' and custom_page_id = p_page_id
    order by sort_order, created_at;
end;
$$;

create function public.editorial_apply_page_content(p_page_key text, p_values jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  affected integer;
begin
  update public.page_content
     set eyebrow = p_values ->> 'eyebrow',
         title = p_values ->> 'title',
         description = p_values ->> 'description',
         seo_title = p_values ->> 'seo_title',
         seo_description = p_values ->> 'seo_description',
         seo_image_path = p_values ->> 'seo_image_path'
   where page_key = p_page_key;
  get diagnostics affected = row_count;
  if affected <> 1 then
    raise exception 'textos da página inexistentes ou sem permissão' using errcode = '42501';
  end if;
end;
$$;

-- Próximo número de revisão (o documento já está travado por quem chama).
create function public.editorial_add_revision(
  p_document_id uuid,
  p_operation text,
  p_content jsonb,
  p_base_revision_id uuid,
  p_restored_from_id uuid,
  p_note text
)
returns public.editorial_revisions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  result public.editorial_revisions;
begin
  insert into public.editorial_revisions (
    document_id, revision_number, operation, content, base_revision_id, restored_from_id,
    author_id, author_email, note
  )
  values (
    p_document_id,
    coalesce((select max(r.revision_number) from public.editorial_revisions r where r.document_id = p_document_id), 0) + 1,
    p_operation, p_content, p_base_revision_id, p_restored_from_id,
    auth.uid(), nullif(auth.jwt() ->> 'email', ''), nullif(btrim(p_note), '')
  )
  returning * into result;
  return result;
end;
$$;

-- Trava o documento e confere permissão e versão.
create function public.editorial_lock_document(p_document_id uuid, p_expected_version integer)
returns public.editorial_documents
language plpgsql
security invoker
set search_path = ''
as $$
declare
  doc public.editorial_documents;
begin
  select * into doc from public.editorial_documents where id = p_document_id for update;
  if not found or not public.editorial_can_edit(doc.doc_type) then
    raise exception 'documento inexistente ou sem permissão' using errcode = '42501';
  end if;
  if p_expected_version is null or doc.version <> p_expected_version then
    raise exception 'o conteúdo foi alterado por outra pessoa' using errcode = 'GL409';
  end if;
  return doc;
end;
$$;

create function public.editorial_record_draft(
  p_document_id uuid,
  p_expected_version integer,
  p_content jsonb,
  p_operation text,
  p_restored_from_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  doc public.editorial_documents;
  revision public.editorial_revisions;
  image_name text;
begin
  doc := public.editorial_lock_document(p_document_id, p_expected_version);
  if not public.is_valid_editorial_content(doc.doc_type, p_content) then
    raise exception 'conteúdo inválido' using errcode = '22023';
  end if;

  -- Imagens citadas no rascunho precisam existir na biblioteca.
  for image_name in select * from public.editorial_image_paths(p_content) loop
    perform public.lock_media_object(image_name);
    if not exists (
      select 1 from storage.objects o where o.bucket_id = 'geologar-media' and o.name = image_name
    ) then
      raise exception 'imagem inexistente na biblioteca: %', image_name using errcode = 'GL422';
    end if;
  end loop;

  revision := public.editorial_add_revision(
    doc.id, p_operation, p_content, doc.published_revision_id, p_restored_from_id, null
  );

  update public.editorial_documents
     set draft = p_content,
         draft_base_revision_id = doc.published_revision_id,
         draft_updated_at = now(),
         draft_updated_by = auth.uid(),
         draft_updated_by_email = nullif(auth.jwt() ->> 'email', ''),
         version = doc.version + 1
   where id = doc.id;

  return jsonb_build_object(
    'id', doc.id, 'version', doc.version + 1, 'revision', revision.revision_number, 'saved_at', now()
  );
end;
$$;

create function public.editorial_publish_one(p_document_id uuid, p_expected_version integer, p_note text)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  doc public.editorial_documents;
  content jsonb;
  affected integer;
  page_status text;
  revision public.editorial_revisions;
begin
  doc := public.editorial_lock_document(p_document_id, p_expected_version);
  if doc.draft is null then
    raise exception 'não há rascunho para publicar' using errcode = 'GL404';
  end if;
  content := doc.draft;
  if not public.is_valid_editorial_content(doc.doc_type, content) then
    raise exception 'conteúdo inválido' using errcode = '22023';
  end if;

  case doc.doc_type
    when 'home' then
      update public.homepage_content
         set hero_title = content #>> '{homepage,hero_title}',
             hero_description = content #>> '{homepage,hero_description}',
             hero_image_path = content #>> '{homepage,hero_image_path}',
             hero_image_alt = content #>> '{homepage,hero_image_alt}',
             hero_primary_cta_label = content #>> '{homepage,hero_primary_cta_label}',
             hero_primary_cta_href = content #>> '{homepage,hero_primary_cta_href}',
             hero_secondary_cta_label = content #>> '{homepage,hero_secondary_cta_label}',
             hero_secondary_cta_href = content #>> '{homepage,hero_secondary_cta_href}',
             about_title = content #>> '{homepage,about_title}',
             about_description = content #>> '{homepage,about_description}',
             cooperation_title = content #>> '{homepage,cooperation_title}',
             cooperation_description = content #>> '{homepage,cooperation_description}',
             cooperation_cta_label = content #>> '{homepage,cooperation_cta_label}',
             cooperation_cta_href = content #>> '{homepage,cooperation_cta_href}'
       where true;
      get diagnostics affected = row_count;
      if affected <> 1 then
        raise exception 'homepage inexistente ou sem permissão' using errcode = '42501';
      end if;
      perform public.save_page_sections('home', public.editorial_section_versions('home', null), content -> 'sections');
    when 'rede' then
      perform public.editorial_apply_page_content('rede', content -> 'page');
      perform public.save_page_sections('rede', public.editorial_section_versions('rede', null), content -> 'sections');
    when 'page' then
      perform public.editorial_apply_page_content(doc.doc_key, content -> 'page');
    when 'pillars' then
      perform public.save_site_pillars(
        coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'updated_at', p.updated_at)) from public.site_pillars p), '[]'::jsonb),
        content -> 'items'
      );
    when 'navigation' then
      perform public.save_site_navigation(
        'header',
        coalesce((select jsonb_agg(jsonb_build_object('id', n.id, 'updated_at', n.updated_at))
                  from public.site_navigation n where n.location = 'header'), '[]'::jsonb),
        content -> 'header'
      );
      perform public.save_site_navigation(
        'footer',
        coalesce((select jsonb_agg(jsonb_build_object('id', n.id, 'updated_at', n.updated_at))
                  from public.site_navigation n where n.location = 'footer'), '[]'::jsonb),
        content -> 'footer'
      );
    when 'appearance' then
      update public.site_appearance
         set primary_color = content #>> '{appearance,primary_color}',
             secondary_color = content #>> '{appearance,secondary_color}',
             accent_color = content #>> '{appearance,accent_color}',
             section_background = content #>> '{appearance,section_background}',
             button_shape = content #>> '{appearance,button_shape}',
             corner_style = content #>> '{appearance,corner_style}',
             heading_font = content #>> '{appearance,heading_font}',
             card_style = content #>> '{appearance,card_style}'
       where true;
      get diagnostics affected = row_count;
      if affected <> 1 then
        raise exception 'aparência inexistente ou sem permissão' using errcode = '42501';
      end if;
    when 'settings' then
      update public.site_settings
         set site_name = content #>> '{settings,site_name}',
             institutional_name = content #>> '{settings,institutional_name}',
             tagline = content #>> '{settings,tagline}',
             short_description = content #>> '{settings,short_description}',
             contact_email = content #>> '{settings,contact_email}',
             contact_phone = content #>> '{settings,contact_phone}',
             address = content #>> '{settings,address}',
             city = content #>> '{settings,city}',
             state = content #>> '{settings,state}',
             country = content #>> '{settings,country}',
             logo_path = content #>> '{settings,logo_path}',
             favicon_path = content #>> '{settings,favicon_path}',
             footer_description = content #>> '{settings,footer_description}',
             footer_note = content #>> '{settings,footer_note}',
             footer_nav_title = content #>> '{settings,footer_nav_title}',
             footer_contact_title = content #>> '{settings,footer_contact_title}',
             footer_social_title = content #>> '{settings,footer_social_title}',
             footer_logo_mode = content #>> '{settings,footer_logo_mode}',
             footer_logo_path = content #>> '{settings,footer_logo_path}',
             header_style = content #>> '{settings,header_style}'
       where true;
      get diagnostics affected = row_count;
      if affected <> 1 then
        raise exception 'configurações inexistentes ou sem permissão' using errcode = '42501';
      end if;
    when 'custom' then
      select c.status into page_status from public.custom_pages c where c.id = doc.custom_page_id for update;
      if not found then
        raise exception 'página inexistente ou sem permissão' using errcode = '42501';
      end if;
      if page_status = 'archived' then
        raise exception 'página arquivada: reative antes de publicar' using errcode = 'GL423';
      end if;
      update public.custom_pages
         set eyebrow = content #>> '{page,eyebrow}',
             title = content #>> '{page,title}',
             description = content #>> '{page,description}',
             seo_title = content #>> '{page,seo_title}',
             seo_description = content #>> '{page,seo_description}',
             seo_image_path = content #>> '{page,seo_image_path}',
             status = 'published',
             published_at = now(),
             first_published_at = coalesce(first_published_at, now())
       where id = doc.custom_page_id;
      get diagnostics affected = row_count;
      if affected <> 1 then
        raise exception 'página inexistente ou sem permissão' using errcode = '42501';
      end if;
      perform public.save_custom_page_sections(doc.custom_page_id, content -> 'sections');
    else
      raise exception 'tipo de documento desconhecido' using errcode = '22023';
  end case;

  -- A revisão publicada é o retrato do que ficou gravado nas tabelas públicas.
  revision := public.editorial_add_revision(
    doc.id, 'published', public.editorial_snapshot(doc.doc_type, doc.doc_key),
    doc.published_revision_id, null, p_note
  );

  update public.editorial_documents
     set draft = null,
         draft_base_revision_id = null,
         draft_updated_at = null,
         draft_updated_by = null,
         draft_updated_by_email = null,
         version = doc.version + 1,
         published_revision_id = revision.id,
         published_at = now(),
         published_by = auth.uid(),
         published_by_email = nullif(auth.jwt() ->> 'email', '')
   where id = doc.id;

  return jsonb_build_object('id', doc.id, 'version', doc.version + 1, 'revision', revision.revision_number);
end;
$$;

-- Pontos de entrada (únicos que ligam a escrita editorial na transação) ------

create function public.save_editorial_drafts(p_items jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  item jsonb;
  result jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) not between 1 and 10 then
    raise exception 'lista de rascunhos inválida' using errcode = '22023';
  end if;
  perform set_config('geologar.editorial_write', 'on', true);
  for item in select * from jsonb_array_elements(p_items) loop
    result := result || jsonb_build_array(public.editorial_record_draft(
      (item ->> 'id')::uuid, (item ->> 'version')::integer, item -> 'content', 'draft_saved', null
    ));
  end loop;
  return result;
end;
$$;

create function public.restore_editorial_revision(p_revision_id uuid, p_expected_version integer, p_content jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target uuid;
begin
  select r.document_id into target from public.editorial_revisions r where r.id = p_revision_id;
  if target is null then
    raise exception 'revisão inexistente ou sem permissão' using errcode = '42501';
  end if;
  perform set_config('geologar.editorial_write', 'on', true);
  return public.editorial_record_draft(target, p_expected_version, p_content, 'restored', p_revision_id);
end;
$$;

create function public.discard_editorial_draft(p_document_id uuid, p_expected_version integer)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  doc public.editorial_documents;
begin
  perform set_config('geologar.editorial_write', 'on', true);
  doc := public.editorial_lock_document(p_document_id, p_expected_version);
  if doc.draft is null then
    return jsonb_build_object('id', doc.id, 'version', doc.version);
  end if;
  update public.editorial_documents
     set draft = null,
         draft_base_revision_id = null,
         draft_updated_at = null,
         draft_updated_by = null,
         draft_updated_by_email = null,
         version = doc.version + 1
   where id = doc.id;
  return jsonb_build_object('id', doc.id, 'version', doc.version + 1);
end;
$$;

-- Várias unidades numa única transação: ou tudo é publicado, ou nada.
create function public.publish_editorial_documents(p_items jsonb, p_note text)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  item jsonb;
  result jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) not between 1 and 10
     or char_length(p_note) > 300 then
    raise exception 'publicação inválida' using errcode = '22023';
  end if;
  perform set_config('geologar.editorial_write', 'on', true);
  for item in select * from jsonb_array_elements(p_items) loop
    result := result || jsonb_build_array(public.editorial_publish_one(
      (item ->> 'id')::uuid, (item ->> 'version')::integer, p_note
    ));
  end loop;
  return result;
end;
$$;

create function public.create_custom_page(p_title text, p_slug text, p_description text)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  page_id uuid;
  doc_id uuid;
  initial jsonb;
begin
  if not public.has_cms_role(array['admin', 'editor']) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  perform set_config('geologar.editorial_write', 'on', true);

  insert into public.custom_pages (slug, title, description, status, created_by)
  values (p_slug, p_title, nullif(btrim(p_description), ''), 'draft', auth.uid())
  returning id into page_id;

  initial := jsonb_build_object(
    'page', jsonb_build_object(
      'eyebrow', null, 'title', p_title, 'description', nullif(btrim(p_description), ''),
      'seo_title', null, 'seo_description', null, 'seo_image_path', null
    ),
    'sections', '[]'::jsonb
  );

  insert into public.editorial_documents (
    doc_type, doc_key, custom_page_id, draft, draft_updated_at, draft_updated_by, draft_updated_by_email, version
  )
  values ('custom', page_id::text, page_id, initial, now(), auth.uid(), nullif(auth.jwt() ->> 'email', ''), 1)
  returning id into doc_id;

  perform public.editorial_add_revision(doc_id, 'draft_saved', initial, null, null, 'Página criada');
  return page_id;
end;
$$;

-- O endereço só muda enquanto a página nunca foi publicada (evita links
-- quebrados; não há redirecionamentos nesta etapa).
create function public.update_custom_page_slug(p_page_id uuid, p_slug text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  first_published timestamptz;
begin
  if not public.has_cms_role(array['admin', 'editor']) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  perform set_config('geologar.editorial_write', 'on', true);
  select c.first_published_at into first_published from public.custom_pages c where c.id = p_page_id for update;
  if not found then
    raise exception 'página inexistente ou sem permissão' using errcode = '42501';
  end if;
  if first_published is not null then
    raise exception 'o endereço de uma página já publicada não pode mudar' using errcode = 'GL423';
  end if;
  update public.custom_pages set slug = p_slug where id = p_page_id;
end;
$$;

-- unpublish: publicada → rascunho (admin)
-- archive:   → arquivada (admin; editor só se a página nunca foi publicada)
-- unarchive: arquivada → rascunho (mesma regra de archive)
create function public.set_custom_page_status(p_page_id uuid, p_action text)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  page public.custom_pages;
  is_admin boolean := public.has_cms_role(array['admin']);
  next_status text;
begin
  if not public.has_cms_role(array['admin', 'editor']) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  perform set_config('geologar.editorial_write', 'on', true);
  select * into page from public.custom_pages c where c.id = p_page_id for update;
  if not found then
    raise exception 'página inexistente ou sem permissão' using errcode = '42501';
  end if;

  if p_action = 'unpublish' then
    if not is_admin then
      raise exception 'somente administradores despublicam páginas' using errcode = '42501';
    end if;
    if page.status <> 'published' then
      raise exception 'a página não está publicada' using errcode = 'GL423';
    end if;
    next_status := 'draft';
  elsif p_action = 'archive' then
    if not is_admin and page.first_published_at is not null then
      raise exception 'somente administradores arquivam páginas já publicadas' using errcode = '42501';
    end if;
    if page.status = 'archived' then
      raise exception 'a página já está arquivada' using errcode = 'GL423';
    end if;
    next_status := 'archived';
  elsif p_action = 'unarchive' then
    if not is_admin and page.first_published_at is not null then
      raise exception 'somente administradores reativam páginas já publicadas' using errcode = '42501';
    end if;
    if page.status <> 'archived' then
      raise exception 'a página não está arquivada' using errcode = 'GL423';
    end if;
    next_status := 'draft';
  else
    raise exception 'ação inválida' using errcode = '22023';
  end if;

  update public.custom_pages
     set status = next_status,
         archived_at = case when next_status = 'archived' then now() else null end
   where id = p_page_id;
  return next_status;
end;
$$;

-- Privilégios: nada para anon; authenticated executa (RLS e has_cms_role
-- decidem). As auxiliares que escrevem dependem da chave ligada pelos pontos
-- de entrada: chamadas diretamente, a guarda recusa a escrita (GL403).
do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.editorial_can_edit(text)',
    'public.editorial_text_object(jsonb, text[])',
    'public.editorial_item_list(jsonb, text[], integer)',
    'public.is_valid_editorial_content(text, jsonb)',
    'public.editorial_image_paths(jsonb)',
    'public.editorial_document_label(text, text)',
    'public.editorial_sections_snapshot(text, uuid)',
    'public.editorial_page_snapshot(text)',
    'public.editorial_snapshot(text, text)',
    'public.editorial_section_versions(text, uuid)',
    'public.save_custom_page_sections(uuid, jsonb)',
    'public.editorial_apply_page_content(text, jsonb)',
    'public.editorial_add_revision(uuid, text, jsonb, uuid, uuid, text)',
    'public.editorial_lock_document(uuid, integer)',
    'public.editorial_record_draft(uuid, integer, jsonb, text, uuid)',
    'public.editorial_publish_one(uuid, integer, text)',
    'public.save_editorial_drafts(jsonb)',
    'public.restore_editorial_revision(uuid, integer, jsonb)',
    'public.discard_editorial_draft(uuid, integer)',
    'public.publish_editorial_documents(jsonb, text)',
    'public.create_custom_page(text, text, text)',
    'public.update_custom_page_slug(uuid, text)',
    'public.set_custom_page_status(uuid, text)'
  ] loop
    execute format('revoke execute on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end
$$;


-- -----------------------------------------------------------------------------
-- 9. Estado inicial: o conteúdo publicado hoje vira a revisão 1 de cada
--    unidade (idempotente; não altera nem recria registros existentes).
-- -----------------------------------------------------------------------------

insert into public.editorial_documents (doc_type, doc_key)
values
  ('home', 'home'),
  ('rede', 'rede'),
  ('page', 'pesquisa'),
  ('page', 'projetos'),
  ('page', 'publicacoes'),
  ('page', 'instituicoes'),
  ('page', 'contato'),
  ('pillars', 'pillars'),
  ('navigation', 'navigation'),
  ('appearance', 'appearance'),
  ('settings', 'settings')
on conflict (doc_type, doc_key) do nothing;

insert into public.editorial_revisions (document_id, revision_number, operation, content, author_id, note)
select d.id, 1, 'published', public.editorial_snapshot(d.doc_type, d.doc_key), null,
       'Versão publicada inicial (conteúdo existente antes da Etapa 9.6)'
from public.editorial_documents d
where d.doc_type <> 'custom'
  and public.editorial_snapshot(d.doc_type, d.doc_key) is not null
  and not exists (select 1 from public.editorial_revisions r where r.document_id = d.id);

update public.editorial_documents d
   set published_revision_id = r.id,
       published_at = r.created_at
  from public.editorial_revisions r
 where r.document_id = d.id
   and r.revision_number = 1
   and d.published_revision_id is null;
