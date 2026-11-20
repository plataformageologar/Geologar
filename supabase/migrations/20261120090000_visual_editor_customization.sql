-- =============================================================================
-- GeoLogar — Personalização do site e editor visual (Etapa 9.5)
--
-- Conteúdo que até aqui estava fixo no código passa para o banco, com uma
-- única fonte de verdade para o CMS tradicional e para o editor visual:
--
--   site_pillars      pilares da rede (antes em src/data/site.ts)
--   site_navigation   links do cabeçalho e do rodapé (antes em src/data/site.ts)
--   page_sections     ordem, visibilidade e textos das seções da homepage e de
--                     /rede, mais blocos controlados (texto, imagem + texto,
--                     chamada, galeria, logotipos)
--   page_content      título, introdução e metadados das páginas internas
--   site_appearance   aparência (cores, fundo, botões, cantos, tipografia,
--                     cards) a partir de opções controladas
--   site_settings     + rodapé (descrição, títulos das colunas, logotipo,
--                     texto complementar) e estilo do cabeçalho
--
-- Matriz de escrita (vínculo ATIVO em admin_memberships via has_cms_role):
--   admin + editor   site_pillars, page_sections, page_content
--   admin            site_navigation, site_appearance, site_settings (já era)
-- Leitura pública: somente itens visíveis; a equipe lê tudo.
--
-- Listas (pilares, navegação, seções) são gravadas por funções atômicas
-- SECURITY INVOKER (sujeitas a RLS e GRANTs) que detectam edição simultânea
-- comparando os pares (id, updated_at) carregados com os atuais (GL409).
-- Configurações de seção (JSONB) são validadas no banco: chaves permitidas
-- por tipo, tipos, tamanhos e valores fechados — sem HTML, CSS ou componentes
-- desconhecidos. Sem SECURITY DEFINER, sem USING (true) para escrita.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Funções de validação
-- -----------------------------------------------------------------------------

-- Destino de link editável (mesma regra de validateHref no TypeScript):
-- caminho interno "/..." (sem "//" nem "/\") ou URL http(s) com domínio e sem
-- usuário/senha. Sem espaços nem caracteres de controle.
create function public.is_valid_site_href(value text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select value is null or (
    char_length(value) between 1 and 300
    and value !~ '[[:cntrl:][:space:]\\]'
    and (
      value ~ '^/([^/]|$)'
      or value ~* '^https?://[a-z0-9-]+(\.[a-z0-9-]+)+(:[0-9]{1,5})?([/?#].*)?$'
    )
  );
$$;

-- Texto simples opcional com limite de caracteres.
create function public.is_short_text(value jsonb, max_length integer)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(value) = 'string' and char_length(value #>> '{}') <= max_length;
$$;

-- Configurações de uma seção: somente as chaves previstas para o tipo, cada
-- uma com tipo, tamanho e valores fechados.
create function public.is_valid_section_settings(p_type text, p_settings jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  allowed text[];
  key text;
  value jsonb;
  item jsonb;
begin
  if p_settings is null or jsonb_typeof(p_settings) <> 'object' then
    return false;
  end if;
  if octet_length(p_settings::text) > 20000 then
    return false;
  end if;

  allowed := case p_type
    when 'hero' then array['eyebrow', 'layout', 'image_position', 'overlay', 'show_primary_cta', 'show_secondary_cta']
    when 'about' then array['eyebrow', 'cta_label', 'cta_href', 'background', 'show_pillars']
    when 'pillars' then array['eyebrow', 'title', 'description', 'background']
    when 'research' then array['eyebrow', 'title', 'description', 'cta_label', 'cta_href', 'limit', 'columns', 'background']
    when 'projects' then array['eyebrow', 'title', 'description', 'cta_label', 'cta_href', 'limit', 'columns', 'background']
    when 'publications' then array['eyebrow', 'title', 'description', 'cta_label', 'cta_href', 'limit', 'background']
    when 'institutions' then array['eyebrow', 'title', 'description', 'cta_label', 'cta_href', 'background']
    when 'cooperation' then array['background']
    when 'text' then array['eyebrow', 'title', 'description', 'cta_label', 'cta_href', 'align', 'background']
    when 'image_text' then array['eyebrow', 'title', 'description', 'cta_label', 'cta_href', 'image_path', 'image_alt', 'image_side', 'background']
    when 'cta' then array['title', 'description', 'cta_label', 'cta_href', 'background']
    when 'gallery' then array['title', 'description', 'images', 'columns', 'background']
    when 'logos' then array['title', 'description', 'institution_ids', 'background']
    else null
  end;
  if allowed is null then
    return false;
  end if;

  for key, value in select * from jsonb_each(p_settings) loop
    if not key = any (allowed) then
      return false;
    end if;

    if not (case key
      when 'eyebrow' then public.is_short_text(value, 60)
      when 'title' then public.is_short_text(value, 160)
      when 'description' then public.is_short_text(value, 2000)
      when 'cta_label' then public.is_short_text(value, 60)
      when 'cta_href' then jsonb_typeof(value) = 'string' and public.is_valid_site_href(value #>> '{}')
      when 'image_alt' then public.is_short_text(value, 200)
      when 'image_path' then jsonb_typeof(value) = 'string' and public.is_valid_image_reference(value #>> '{}')
      when 'show_primary_cta' then jsonb_typeof(value) = 'boolean'
      when 'show_secondary_cta' then jsonb_typeof(value) = 'boolean'
      when 'show_pillars' then jsonb_typeof(value) = 'boolean'
      when 'limit' then jsonb_typeof(value) = 'number' and (value #>> '{}') in ('1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12')
      when 'columns' then jsonb_typeof(value) = 'number' and (value #>> '{}') in ('2', '3', '4')
      when 'layout' then (value #>> '{}') in ('default', 'centered', 'split') and jsonb_typeof(value) = 'string'
      when 'image_position' then (value #>> '{}') in ('center', 'top', 'bottom', 'left', 'right') and jsonb_typeof(value) = 'string'
      when 'overlay' then (value #>> '{}') in ('light', 'medium', 'strong') and jsonb_typeof(value) = 'string'
      when 'background' then (value #>> '{}') in ('default', 'surface', 'muted', 'deep', 'primary') and jsonb_typeof(value) = 'string'
      when 'align' then (value #>> '{}') in ('left', 'center') and jsonb_typeof(value) = 'string'
      when 'image_side' then (value #>> '{}') in ('left', 'right') and jsonb_typeof(value) = 'string'
      when 'images' then jsonb_typeof(value) = 'array' and jsonb_array_length(value) <= 12
      when 'institution_ids' then jsonb_typeof(value) = 'array' and jsonb_array_length(value) <= 24
      else false
    end) then
      return false;
    end if;

    if key = 'images' then
      for item in select * from jsonb_array_elements(value) loop
        if jsonb_typeof(item) <> 'object'
           or exists (select 1 from jsonb_object_keys(item) k where k not in ('path', 'alt'))
           or jsonb_typeof(item -> 'path') is distinct from 'string'
           or not public.is_valid_image_reference(item ->> 'path')
           or not public.is_short_text(coalesce(item -> 'alt', '""'::jsonb), 200) then
          return false;
        end if;
      end loop;
    elsif key = 'institution_ids' then
      for item in select * from jsonb_array_elements(value) loop
        if jsonb_typeof(item) <> 'string'
           or (item #>> '{}') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
          return false;
        end if;
      end loop;
    end if;
  end loop;

  return true;
end;
$$;

-- Imagens da biblioteca referenciadas pelas configurações de uma seção.
create function public.section_image_paths(p_settings jsonb)
returns setof text
language sql
immutable
set search_path = ''
as $$
  select p_settings ->> 'image_path' where p_settings ->> 'image_path' is not null
  union
  select image ->> 'path'
  from jsonb_array_elements(
    case when jsonb_typeof(p_settings -> 'images') = 'array' then p_settings -> 'images' else '[]'::jsonb end
  ) as image
  where image ->> 'path' is not null;
$$;


-- -----------------------------------------------------------------------------
-- 2. Pilares da rede
-- -----------------------------------------------------------------------------

create table public.site_pillars (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  icon        text not null default 'microscope',
  sort_order  integer not null default 0,
  is_visible  boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint site_pillars_title_not_blank check (btrim(title) <> '' and char_length(title) <= 60),
  constraint site_pillars_description_length check (char_length(description) <= 300),
  constraint site_pillars_icon check (icon in (
    'microscope', 'graduation-cap', 'mountain', 'handshake', 'globe', 'leaf',
    'gem', 'layers', 'map', 'users', 'book-open', 'flask'
  )),
  constraint site_pillars_sort_order_nonnegative check (sort_order >= 0)
);

comment on table public.site_pillars is 'Pilares de atuação da rede (homepage e /rede).';


-- -----------------------------------------------------------------------------
-- 3. Navegação do cabeçalho e do rodapé
--    O acesso à área restrita não faz parte desta tabela (fica no código), para
--    que nenhuma alteração do menu impeça o acesso à administração.
-- -----------------------------------------------------------------------------

create table public.site_navigation (
  id              uuid primary key default gen_random_uuid(),
  location        text not null,
  label           text not null,
  href            text not null,
  open_in_new_tab boolean not null default false,
  sort_order      integer not null default 0,
  is_visible      boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint site_navigation_location check (location in ('header', 'footer')),
  constraint site_navigation_label_not_blank check (btrim(label) <> '' and char_length(label) <= 40),
  constraint site_navigation_href_format check (public.is_valid_site_href(href)),
  constraint site_navigation_sort_order_nonnegative check (sort_order >= 0)
);

create index site_navigation_location_order on public.site_navigation (location, sort_order);

comment on table public.site_navigation is 'Links editáveis do cabeçalho e do rodapé.';


-- -----------------------------------------------------------------------------
-- 4. Seções e blocos das páginas
-- -----------------------------------------------------------------------------

create table public.page_sections (
  id           uuid primary key default gen_random_uuid(),
  page_key     text not null,
  section_type text not null,
  sort_order   integer not null default 0,
  is_visible   boolean not null default true,
  settings     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint page_sections_page_key check (page_key in ('home', 'rede')),
  constraint page_sections_type check (section_type in (
    'hero', 'about', 'pillars', 'research', 'projects', 'publications', 'institutions', 'cooperation',
    'text', 'image_text', 'cta', 'gallery', 'logos'
  )),
  constraint page_sections_settings_valid check (public.is_valid_section_settings(section_type, settings)),
  constraint page_sections_sort_order_nonnegative check (sort_order >= 0)
);

-- Seções nativas: uma de cada tipo por página (blocos podem se repetir).
create unique index page_sections_builtin_unique
  on public.page_sections (page_key, section_type)
  where section_type in ('hero', 'about', 'pillars', 'research', 'projects', 'publications', 'institutions', 'cooperation');

create index page_sections_page_order on public.page_sections (page_key, sort_order);

comment on table public.page_sections is
  'Ordem, visibilidade e configurações das seções (nativas e blocos controlados) da homepage e de /rede.';


-- -----------------------------------------------------------------------------
-- 5. Textos e metadados das páginas internas
-- -----------------------------------------------------------------------------

create table public.page_content (
  page_key        text primary key,
  eyebrow         text,
  title           text,
  description     text,
  seo_title       text,
  seo_description text,
  seo_image_path  text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint page_content_page_key check (page_key in ('rede', 'pesquisa', 'projetos', 'publicacoes', 'instituicoes', 'contato')),
  constraint page_content_eyebrow_length check (char_length(eyebrow) <= 60),
  constraint page_content_title_length check (btrim(title) <> '' and char_length(title) <= 160),
  constraint page_content_description_length check (char_length(description) <= 1000),
  constraint page_content_seo_title_length check (char_length(seo_title) <= 70),
  constraint page_content_seo_description_length check (char_length(seo_description) <= 200),
  constraint page_content_seo_image_path_format check (public.is_valid_image_reference(seo_image_path))
);

comment on table public.page_content is 'Título, introdução e metadados editáveis das páginas internas.';


-- -----------------------------------------------------------------------------
-- 6. Aparência (registro único)
--    Cores em hexadecimal (#rrggbb) e opções fechadas: nenhum CSS livre.
--    `null` mantém o valor padrão do design system.
-- -----------------------------------------------------------------------------

create table public.site_appearance (
  id                 uuid primary key default gen_random_uuid(),
  primary_color      text,
  secondary_color    text,
  accent_color       text,
  section_background text not null default 'sand',
  button_shape       text not null default 'pill',
  corner_style       text not null default 'rounded',
  heading_font       text not null default 'serif',
  card_style         text not null default 'bordered',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint site_appearance_primary_color check (primary_color ~ '^#[0-9a-f]{6}$'),
  constraint site_appearance_secondary_color check (secondary_color ~ '^#[0-9a-f]{6}$'),
  constraint site_appearance_accent_color check (accent_color ~ '^#[0-9a-f]{6}$'),
  constraint site_appearance_section_background check (section_background in ('sand', 'white', 'stone')),
  constraint site_appearance_button_shape check (button_shape in ('pill', 'rounded', 'square')),
  constraint site_appearance_corner_style check (corner_style in ('rounded', 'soft', 'straight')),
  constraint site_appearance_heading_font check (heading_font in ('serif', 'sans')),
  constraint site_appearance_card_style check (card_style in ('bordered', 'elevated', 'flat'))
);

create unique index site_appearance_singleton on public.site_appearance ((true));

comment on table public.site_appearance is 'Aparência do site a partir de opções controladas (registro único).';


-- -----------------------------------------------------------------------------
-- 7. Rodapé e cabeçalho em site_settings (mesmo registro dos contatos)
-- -----------------------------------------------------------------------------

alter table public.site_settings
  add column footer_description   text,
  add column footer_note          text,
  add column footer_nav_title     text,
  add column footer_contact_title text,
  add column footer_social_title  text,
  add column footer_logo_mode     text not null default 'official',
  add column footer_logo_path     text,
  add column header_style         text not null default 'solid',
  add constraint site_settings_footer_description_length check (char_length(footer_description) <= 500),
  add constraint site_settings_footer_note_length check (char_length(footer_note) <= 300),
  add constraint site_settings_footer_titles_length check (
    char_length(footer_nav_title) <= 40
    and char_length(footer_contact_title) <= 40
    and char_length(footer_social_title) <= 40
  ),
  add constraint site_settings_footer_logo_mode check (footer_logo_mode in ('official', 'institutional', 'custom')),
  add constraint site_settings_footer_logo_path_format check (public.is_valid_image_reference(footer_logo_path)),
  add constraint site_settings_footer_logo_custom check (footer_logo_mode <> 'custom' or footer_logo_path is not null),
  add constraint site_settings_header_style check (header_style in ('solid', 'translucent'));


-- -----------------------------------------------------------------------------
-- 8. updated_at e referências de mídia
-- -----------------------------------------------------------------------------

create trigger set_updated_at before update on public.site_pillars
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.site_navigation
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.page_sections
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.page_content
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.site_appearance
  for each row execute function public.set_updated_at();

-- Logotipo do rodapé passa a ser verificado como os demais (lista de colunas
-- do trigger existente ampliada).
drop trigger site_settings_media_references on public.site_settings;
create trigger site_settings_media_references
  before insert or update of logo_path, favicon_path, footer_logo_path on public.site_settings
  for each row execute function public.check_media_references('logo_path', 'favicon_path', 'footer_logo_path');

create trigger page_content_media_references
  before insert or update of seo_image_path on public.page_content
  for each row execute function public.check_media_references('seo_image_path');

-- Imagens dentro das configurações das seções: cada referência nova da
-- biblioteca é travada e precisa existir (GL422), como nas demais tabelas.
create function public.check_section_media_references()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  image_name text;
begin
  for image_name in
    select path from public.section_image_paths(new.settings) as path
    except
    select path from public.section_image_paths(
      case when tg_op = 'UPDATE' then old.settings else '{}'::jsonb end
    ) as path
  loop
    if public.is_media_object_name(image_name) then
      perform public.lock_media_object(image_name);
      if not exists (
        select 1 from storage.objects o
        where o.bucket_id = 'geologar-media' and o.name = image_name
      ) then
        raise exception 'imagem inexistente na biblioteca: %', image_name
          using errcode = 'GL422';
      end if;
    end if;
  end loop;
  return new;
end;
$$;

revoke execute on function public.check_section_media_references() from public, anon, authenticated;

create trigger page_sections_media_references
  before insert or update of settings on public.page_sections
  for each row execute function public.check_section_media_references();

-- Onde um objeto da biblioteca é usado: inclui rodapé, metadados das páginas
-- e imagens de blocos, para que nenhum arquivo em uso seja excluído.
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
  select 'page-section', s.id,
    'Bloco da página ' || case s.page_key when 'home' then 'inicial' else s.page_key end
  from public.page_sections s
  where exists (select 1 from public.section_image_paths(s.settings) as path where path = p_name);
$$;


-- -----------------------------------------------------------------------------
-- 9. RLS e privilégios
-- -----------------------------------------------------------------------------

alter table public.site_pillars enable row level security;
alter table public.site_navigation enable row level security;
alter table public.page_sections enable row level security;
alter table public.page_content enable row level security;
alter table public.site_appearance enable row level security;

-- Privilégios explícitos (sem depender da exposição automática do Data API):
-- leitura para todos (filtrada por RLS) e escrita por coluna, abaixo.
revoke all on public.site_pillars, public.site_navigation, public.page_sections,
  public.page_content, public.site_appearance from anon, authenticated;

grant select on public.site_pillars, public.site_navigation, public.page_sections,
  public.page_content, public.site_appearance to anon, authenticated;

-- Leitura pública: só o que está visível. A equipe lê tudo.
create policy "Public can read visible pillars"
  on public.site_pillars for select to anon, authenticated
  using (is_visible);
create policy "CMS staff can read all pillars"
  on public.site_pillars for select to authenticated
  using ((select public.has_cms_role(array['admin', 'editor'])));

create policy "Public can read visible navigation"
  on public.site_navigation for select to anon, authenticated
  using (is_visible);
create policy "CMS staff can read all navigation"
  on public.site_navigation for select to authenticated
  using ((select public.has_cms_role(array['admin', 'editor'])));

create policy "Public can read visible page sections"
  on public.page_sections for select to anon, authenticated
  using (is_visible);
create policy "CMS staff can read all page sections"
  on public.page_sections for select to authenticated
  using ((select public.has_cms_role(array['admin', 'editor'])));

create policy "Public can read page content"
  on public.page_content for select to anon, authenticated
  using (true);

create policy "Public can read site appearance"
  on public.site_appearance for select to anon, authenticated
  using (true);

-- Pilares: admin + editor (conteúdo editorial).
grant insert (title, description, icon, sort_order, is_visible) on public.site_pillars to authenticated;
grant update (title, description, icon, sort_order, is_visible) on public.site_pillars to authenticated;
grant delete on public.site_pillars to authenticated;

create policy "CMS staff can create pillars"
  on public.site_pillars for insert to authenticated
  with check ((select public.has_cms_role(array['admin', 'editor'])));
create policy "CMS staff can update pillars"
  on public.site_pillars for update to authenticated
  using ((select public.has_cms_role(array['admin', 'editor'])))
  with check ((select public.has_cms_role(array['admin', 'editor'])));
create policy "CMS staff can delete pillars"
  on public.site_pillars for delete to authenticated
  using ((select public.has_cms_role(array['admin', 'editor'])));

-- Navegação: somente admin (estrutura global do site).
grant insert (location, label, href, open_in_new_tab, sort_order, is_visible) on public.site_navigation to authenticated;
grant update (label, href, open_in_new_tab, sort_order, is_visible) on public.site_navigation to authenticated;
grant delete on public.site_navigation to authenticated;

create policy "Admins can create navigation"
  on public.site_navigation for insert to authenticated
  with check ((select public.has_cms_role(array['admin'])));
create policy "Admins can update navigation"
  on public.site_navigation for update to authenticated
  using ((select public.has_cms_role(array['admin'])))
  with check ((select public.has_cms_role(array['admin'])));
create policy "Admins can delete navigation"
  on public.site_navigation for delete to authenticated
  using ((select public.has_cms_role(array['admin'])));

-- Seções: admin + editor. Seções nativas não são criadas nem excluídas pelo
-- CMS (só ocultadas); blocos podem ser criados e excluídos.
grant insert (page_key, section_type, sort_order, is_visible, settings) on public.page_sections to authenticated;
grant update (sort_order, is_visible, settings) on public.page_sections to authenticated;
grant delete on public.page_sections to authenticated;

create policy "CMS staff can create page blocks"
  on public.page_sections for insert to authenticated
  with check (
    (select public.has_cms_role(array['admin', 'editor']))
    and section_type in ('text', 'image_text', 'cta', 'gallery', 'logos')
  );
create policy "CMS staff can update page sections"
  on public.page_sections for update to authenticated
  using ((select public.has_cms_role(array['admin', 'editor'])))
  with check ((select public.has_cms_role(array['admin', 'editor'])));
create policy "CMS staff can delete page blocks"
  on public.page_sections for delete to authenticated
  using (
    (select public.has_cms_role(array['admin', 'editor']))
    and section_type in ('text', 'image_text', 'cta', 'gallery', 'logos')
  );

-- Textos das páginas: admin + editor, somente UPDATE dos registros existentes.
grant update (eyebrow, title, description, seo_title, seo_description, seo_image_path)
  on public.page_content to authenticated;

create policy "CMS staff can update page content"
  on public.page_content for update to authenticated
  using ((select public.has_cms_role(array['admin', 'editor'])))
  with check ((select public.has_cms_role(array['admin', 'editor'])));

-- Aparência: somente admin, somente UPDATE do registro existente.
grant update (
  primary_color, secondary_color, accent_color, section_background,
  button_shape, corner_style, heading_font, card_style
) on public.site_appearance to authenticated;

create policy "Admins can update site appearance"
  on public.site_appearance for update to authenticated
  using ((select public.has_cms_role(array['admin'])))
  with check ((select public.has_cms_role(array['admin'])));

-- Rodapé e cabeçalho: colunas novas do registro já protegido (admin).
grant update (
  footer_description, footer_note, footer_nav_title, footer_contact_title,
  footer_social_title, footer_logo_mode, footer_logo_path, header_style
) on public.site_settings to authenticated;


-- -----------------------------------------------------------------------------
-- 10. Gravação atômica das listas
--
-- p_expected: [{"id": ..., "updated_at": ...}] como carregados pelo usuário.
-- p_items: lista na ordem desejada (sort_order = posição). Itens sem "id" são
-- criados; ids ausentes da lista são excluídos. Qualquer erro desfaz tudo:
--   GL409  a lista mudou desde o carregamento (outra pessoa salvou)
--   42501  sem permissão (inclusive quando o RLS filtra linhas em silêncio)
--   22023  item inválido; 23514 constraint violada.
-- -----------------------------------------------------------------------------

create function public.assert_list_unchanged(p_current jsonb, p_expected jsonb)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if jsonb_typeof(p_expected) is distinct from 'array' then
    raise exception 'lista esperada inválida' using errcode = '22023';
  end if;
  if exists (
    (select (e ->> 'id')::uuid, (e ->> 'updated_at')::timestamptz from jsonb_array_elements(p_current) e
     except
     select (e ->> 'id')::uuid, (e ->> 'updated_at')::timestamptz from jsonb_array_elements(p_expected) e)
    union all
    (select (e ->> 'id')::uuid, (e ->> 'updated_at')::timestamptz from jsonb_array_elements(p_expected) e
     except
     select (e ->> 'id')::uuid, (e ->> 'updated_at')::timestamptz from jsonb_array_elements(p_current) e)
  ) then
    raise exception 'a lista foi alterada por outra pessoa' using errcode = 'GL409';
  end if;
end;
$$;

create function public.save_site_pillars(p_expected jsonb, p_items jsonb)
returns setof public.site_pillars
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
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) > 12 then
    raise exception 'lista de pilares inválida' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('geologar-site-pillars', 0));
  perform public.assert_list_unchanged(
    coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'updated_at', p.updated_at)) from public.site_pillars p), '[]'::jsonb),
    p_expected
  );

  for item in select * from jsonb_array_elements(p_items) loop
    if jsonb_typeof(item) <> 'object' then
      raise exception 'pilar inválido' using errcode = '22023';
    end if;
    item_id := nullif(item ->> 'id', '')::uuid;
    if item_id is null then
      insert into public.site_pillars (title, description, icon, sort_order, is_visible)
      values (item ->> 'title', item ->> 'description', item ->> 'icon', item_position, coalesce((item ->> 'is_visible')::boolean, true))
      returning id into item_id;
    else
      update public.site_pillars
         set title = item ->> 'title',
             description = item ->> 'description',
             icon = item ->> 'icon',
             sort_order = item_position,
             is_visible = coalesce((item ->> 'is_visible')::boolean, true)
       where id = item_id;
      get diagnostics affected = row_count;
      if affected <> 1 then
        raise exception 'pilar inexistente ou sem permissão' using errcode = '42501';
      end if;
    end if;
    kept := kept || item_id;
    item_position := item_position + 1;
  end loop;

  delete from public.site_pillars where not (id = any (kept));
  if exists (select 1 from public.site_pillars where not (id = any (kept))) then
    raise exception 'sem permissão para excluir' using errcode = '42501';
  end if;

  return query select * from public.site_pillars order by sort_order, created_at;
end;
$$;

create function public.save_site_navigation(p_location text, p_expected jsonb, p_items jsonb)
returns setof public.site_navigation
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
  if not public.has_cms_role(array['admin']) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  if p_location not in ('header', 'footer')
     or jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) > 20 then
    raise exception 'menu inválido' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('geologar-site-navigation:' || p_location, 0));
  perform public.assert_list_unchanged(
    coalesce((select jsonb_agg(jsonb_build_object('id', n.id, 'updated_at', n.updated_at))
              from public.site_navigation n where n.location = p_location), '[]'::jsonb),
    p_expected
  );

  for item in select * from jsonb_array_elements(p_items) loop
    if jsonb_typeof(item) <> 'object' then
      raise exception 'link inválido' using errcode = '22023';
    end if;
    item_id := nullif(item ->> 'id', '')::uuid;
    if item_id is null then
      insert into public.site_navigation (location, label, href, open_in_new_tab, sort_order, is_visible)
      values (
        p_location, item ->> 'label', item ->> 'href',
        coalesce((item ->> 'open_in_new_tab')::boolean, false), item_position,
        coalesce((item ->> 'is_visible')::boolean, true)
      )
      returning id into item_id;
    else
      update public.site_navigation
         set label = item ->> 'label',
             href = item ->> 'href',
             open_in_new_tab = coalesce((item ->> 'open_in_new_tab')::boolean, false),
             sort_order = item_position,
             is_visible = coalesce((item ->> 'is_visible')::boolean, true)
       where id = item_id and location = p_location;
      get diagnostics affected = row_count;
      if affected <> 1 then
        raise exception 'link inexistente ou sem permissão' using errcode = '42501';
      end if;
    end if;
    kept := kept || item_id;
    item_position := item_position + 1;
  end loop;

  delete from public.site_navigation where location = p_location and not (id = any (kept));
  if exists (select 1 from public.site_navigation where location = p_location and not (id = any (kept))) then
    raise exception 'sem permissão para excluir' using errcode = '42501';
  end if;

  return query select * from public.site_navigation where location = p_location order by sort_order, created_at;
end;
$$;

create function public.save_page_sections(p_page_key text, p_expected jsonb, p_items jsonb)
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
  if p_page_key not in ('home', 'rede')
     or jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) > 40 then
    raise exception 'lista de seções inválida' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('geologar-page-sections:' || p_page_key, 0));
  perform public.assert_list_unchanged(
    coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'updated_at', s.updated_at))
              from public.page_sections s where s.page_key = p_page_key), '[]'::jsonb),
    p_expected
  );

  for item in select * from jsonb_array_elements(p_items) loop
    if jsonb_typeof(item) <> 'object' or jsonb_typeof(item -> 'settings') is distinct from 'object' then
      raise exception 'seção inválida' using errcode = '22023';
    end if;
    item_id := nullif(item ->> 'id', '')::uuid;
    if item_id is null then
      insert into public.page_sections (page_key, section_type, sort_order, is_visible, settings)
      values (p_page_key, item ->> 'section_type', item_position,
              coalesce((item ->> 'is_visible')::boolean, true), item -> 'settings')
      returning id into item_id;
    else
      -- O tipo de uma seção existente não muda.
      update public.page_sections
         set sort_order = item_position,
             is_visible = coalesce((item ->> 'is_visible')::boolean, true),
             settings = item -> 'settings'
       where id = item_id
         and page_key = p_page_key
         and section_type = item ->> 'section_type';
      get diagnostics affected = row_count;
      if affected <> 1 then
        raise exception 'seção inexistente ou sem permissão' using errcode = '42501';
      end if;
    end if;
    kept := kept || item_id;
    item_position := item_position + 1;
  end loop;

  delete from public.page_sections where page_key = p_page_key and not (id = any (kept));
  if exists (select 1 from public.page_sections where page_key = p_page_key and not (id = any (kept))) then
    raise exception 'seções nativas não podem ser excluídas' using errcode = '42501';
  end if;

  return query select * from public.page_sections where page_key = p_page_key order by sort_order, created_at;
end;
$$;

revoke execute on function public.assert_list_unchanged(jsonb, jsonb) from public, anon;
revoke execute on function public.save_site_pillars(jsonb, jsonb) from public, anon;
revoke execute on function public.save_site_navigation(text, jsonb, jsonb) from public, anon;
revoke execute on function public.save_page_sections(text, jsonb, jsonb) from public, anon;
grant execute on function public.assert_list_unchanged(jsonb, jsonb) to authenticated;
grant execute on function public.save_site_pillars(jsonb, jsonb) to authenticated;
grant execute on function public.save_site_navigation(text, jsonb, jsonb) to authenticated;
grant execute on function public.save_page_sections(text, jsonb, jsonb) to authenticated;


-- -----------------------------------------------------------------------------
-- 11. Conteúdo inicial: os valores que estavam no código (idempotente)
-- -----------------------------------------------------------------------------

insert into public.site_pillars (title, description, icon, sort_order)
select v.title, v.description, v.icon, v.sort_order
from (values
  ('Pesquisa', 'Desenvolvimento de estudos e projetos científicos.', 'microscope', 0),
  ('Formação', 'Integração entre pesquisa, ensino e formação acadêmica.', 'graduation-cap', 1),
  ('Território', 'Conhecimento da geodiversidade, dos recursos naturais e do patrimônio geológico.', 'mountain', 2),
  ('Cooperação', 'Articulação entre instituições e parceiros nacionais e internacionais.', 'handshake', 3)
) as v (title, description, icon, sort_order)
where not exists (select 1 from public.site_pillars);

insert into public.site_navigation (location, label, href, sort_order)
select v.location, v.label, v.href, v.sort_order
from (values
  ('header', 'Início', '/', 0),
  ('header', 'A Rede', '/rede', 1),
  ('header', 'Pesquisa', '/pesquisa', 2),
  ('header', 'Projetos', '/projetos', 3),
  ('header', 'Publicações', '/publicacoes', 4),
  ('header', 'Contato', '/contato', 5),
  ('footer', 'Início', '/', 0),
  ('footer', 'A Rede', '/rede', 1),
  ('footer', 'Pesquisa', '/pesquisa', 2),
  ('footer', 'Projetos', '/projetos', 3),
  ('footer', 'Publicações', '/publicacoes', 4),
  ('footer', 'Instituições', '/instituicoes', 5),
  ('footer', 'Contato', '/contato', 6)
) as v (location, label, href, sort_order)
where not exists (select 1 from public.site_navigation n where n.location = v.location);

insert into public.page_sections (page_key, section_type, sort_order, settings)
values
  ('home', 'hero', 0, '{"eyebrow": "Rede de Pesquisa em Geociências", "layout": "default", "image_position": "right", "overlay": "medium"}'),
  ('home', 'about', 1, '{"eyebrow": "A Rede", "cta_label": "Saiba mais sobre a rede", "cta_href": "/rede", "show_pillars": true}'),
  ('home', 'research', 2, '{"eyebrow": "Pesquisa", "title": "Nossas linhas de pesquisa", "cta_label": "Ver todas as linhas", "cta_href": "/pesquisa", "limit": 6, "columns": 3, "background": "muted"}'),
  ('home', 'projects', 3, '{"eyebrow": "Projetos", "title": "Pesquisa com resultados", "cta_label": "Ver todos os projetos", "cta_href": "/projetos", "limit": 3, "columns": 3}'),
  ('home', 'publications', 4, '{"eyebrow": "Publicações", "title": "Conhecimento publicado", "cta_label": "Ver todas as publicações", "cta_href": "/publicacoes", "limit": 5, "background": "surface"}'),
  ('home', 'institutions', 5, '{"eyebrow": "Instituições", "title": "Instituições que conectam a rede", "cta_label": "Conheça nossas instituições parceiras", "cta_href": "/instituicoes"}'),
  ('home', 'cooperation', 6, '{"background": "primary"}'),
  ('rede', 'pillars', 0, '{"eyebrow": "Atuação", "title": "Pilares da rede"}'),
  ('rede', 'research', 1, '{"eyebrow": "Pesquisa", "title": "Linhas de pesquisa", "cta_label": "Ver todas as linhas", "cta_href": "/pesquisa", "background": "muted"}'),
  ('rede', 'cooperation', 2, '{"background": "primary"}')
on conflict (page_key, section_type)
  where section_type in ('hero', 'about', 'pillars', 'research', 'projects', 'publications', 'institutions', 'cooperation')
  do nothing;

-- /rede e /contato usam por padrão os textos da homepage (apresentação da rede
-- e chamada para cooperação): título/descrição nulos mantêm esse vínculo.
insert into public.page_content (page_key, eyebrow, title, description, seo_title, seo_description)
values
  ('rede', 'A Rede', null, null, 'A Rede', null),
  ('pesquisa', 'Pesquisa', 'Linhas de pesquisa',
   'Conheça as linhas de pesquisa da rede e os projetos e publicações associados a cada uma.',
   'Pesquisa', 'Linhas de pesquisa da GeoLogar, com os projetos e as publicações associados a cada uma.'),
  ('projetos', 'Projetos', 'Projetos de pesquisa',
   'Conheça os projetos da rede, seus objetivos e resultados.',
   'Projetos', 'Projetos de pesquisa desenvolvidos pela GeoLogar e seus resultados.'),
  ('publicacoes', 'Publicações', 'Publicações',
   'Produção científica da rede, organizada por ano de publicação.',
   'Publicações', 'Artigos, livros e demais publicações científicas da GeoLogar.'),
  ('instituicoes', 'Instituições', 'Instituições',
   'Instituições e parceiros que integram ou colaboram com a rede.',
   'Instituições', 'Instituições e parceiros que integram ou colaboram com a GeoLogar.'),
  ('contato', 'Contato', 'Entre em contato com a GeoLogar', null,
   'Contato', 'Fale com a GeoLogar: formulário e canais oficiais de contato.')
on conflict (page_key) do nothing;

insert into public.site_appearance (section_background)
select 'sand'
where not exists (select 1 from public.site_appearance);
