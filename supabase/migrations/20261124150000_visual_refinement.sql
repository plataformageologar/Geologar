-- =============================================================================
-- Etapa 10.7: refinamento visual (referência do cliente).
--
-- Aparência (site_appearance, unidade editorial `appearance`):
--   * dark_color: tom escuro do rodapé, das faixas e do banner sem foto
--     (#rrggbb ou nulo = padrão do design system);
--   * section_style: 'spacious' (padrão) ou 'compact' (seções mais próximas e
--     títulos institucionais);
--   * section_background aceita 'cream' (fundo creme e superfícies claras).
-- Seções:
--   * hero.layout aceita 'brand' (nome em destaque sobre a fotografia);
--   * research.display: 'cards' (padrão) ou 'photos' (cards fotográficos);
--   * projects.side_by_side: projetos ao lado das publicações recentes.
--
-- Revisões antigas continuam válidas e restauráveis: os campos novos são
-- opcionais no conteúdo e, ausentes, voltam ao padrão ao publicar.
-- Nenhum dado é alterado e nada é publicado por esta migration.
-- =============================================================================

alter table public.site_appearance
  add column dark_color text,
  add column section_style text not null default 'spacious';

alter table public.site_appearance
  add constraint site_appearance_dark_color check (dark_color ~ '^#[0-9a-f]{6}$'),
  add constraint site_appearance_section_style check (section_style in ('spacious', 'compact')),
  drop constraint site_appearance_section_background,
  add constraint site_appearance_section_background check (section_background in ('sand', 'white', 'stone', 'cream'));

comment on column public.site_appearance.dark_color is 'Tom escuro (rodapé, faixas, banner sem foto); nulo = padrão.';
comment on column public.site_appearance.section_style is 'Densidade das seções públicas: spacious ou compact.';

-- Gravação só pelo fluxo editorial (editorial_guard), como as demais colunas.
grant update (dark_color, section_style) on public.site_appearance to authenticated;

-- Validação das configurações das seções (novas opções de layout).
create or replace function public.is_valid_section_settings(p_type text, p_settings jsonb)
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
  -- Experiências: até 12 cards com textos próprios (limite maior só para elas).
  if octet_length(p_settings::text) > (case when p_type = 'experiences' then 60000 else 20000 end) then
    return false;
  end if;

  allowed := case p_type
    when 'hero' then array['eyebrow', 'layout', 'image_position', 'overlay', 'show_primary_cta', 'show_secondary_cta']
    when 'about' then array['eyebrow', 'cta_label', 'cta_href', 'background', 'show_pillars']
    when 'pillars' then array['eyebrow', 'title', 'description', 'background']
    when 'research' then array['eyebrow', 'title', 'description', 'cta_label', 'cta_href', 'limit', 'columns', 'background', 'display']
    when 'projects' then array['eyebrow', 'title', 'description', 'cta_label', 'cta_href', 'limit', 'columns', 'background', 'side_by_side']
    when 'publications' then array['eyebrow', 'title', 'description', 'cta_label', 'cta_href', 'limit', 'background']
    when 'institutions' then array['eyebrow', 'title', 'description', 'cta_label', 'cta_href', 'background']
    when 'cooperation' then array['background']
    when 'text' then array['eyebrow', 'title', 'description', 'cta_label', 'cta_href', 'align', 'background']
    when 'image_text' then array['eyebrow', 'title', 'description', 'cta_label', 'cta_href', 'image_path', 'image_alt', 'image_side', 'background']
    when 'cta' then array['title', 'description', 'cta_label', 'cta_href', 'background']
    when 'gallery' then array['title', 'description', 'images', 'columns', 'background']
    when 'logos' then array['title', 'description', 'institution_ids', 'background']
    when 'experiences' then array['eyebrow', 'title', 'description', 'background', 'columns', 'experiences']
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
      when 'layout' then (value #>> '{}') in ('default', 'centered', 'split', 'brand') and jsonb_typeof(value) = 'string'
      when 'image_position' then (value #>> '{}') in ('center', 'top', 'bottom', 'left', 'right') and jsonb_typeof(value) = 'string'
      when 'overlay' then (value #>> '{}') in ('light', 'medium', 'strong') and jsonb_typeof(value) = 'string'
      when 'background' then (value #>> '{}') in ('default', 'surface', 'muted', 'deep', 'primary') and jsonb_typeof(value) = 'string'
      when 'align' then (value #>> '{}') in ('left', 'center') and jsonb_typeof(value) = 'string'
      when 'image_side' then (value #>> '{}') in ('left', 'right') and jsonb_typeof(value) = 'string'
      when 'images' then jsonb_typeof(value) = 'array' and jsonb_array_length(value) <= 12
      when 'institution_ids' then jsonb_typeof(value) = 'array' and jsonb_array_length(value) <= 24
      when 'experiences' then public.is_valid_experience_list(value)
      when 'display' then (value #>> '{}') in ('cards', 'photos') and jsonb_typeof(value) = 'string'
      when 'side_by_side' then jsonb_typeof(value) = 'boolean'
      else false
    end) then
      return false;
    end if;

    -- Experiências: 2 ou 3 colunas em telas largas.
    if p_type = 'experiences' and key = 'columns' and (value #>> '{}') not in ('2', '3') then
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

-- Conteúdo das unidades: aparência com os campos novos (opcionais).
create or replace function public.is_valid_editorial_content(p_doc_type text, p_content jsonb)
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
    'button_shape', 'corner_style', 'heading_font', 'card_style', 'dark_color', 'section_style'
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
         or (p_doc_type = 'custom' and item ->> 'section_type' not in ('text', 'image_text', 'cta', 'gallery', 'logos'))
         or (p_doc_type <> 'home' and item ->> 'section_type' = 'experiences') then
        return false;
      end if;
    end loop;
    -- Uma única seção de experiências por página (Etapa 10.6).
    if (select count(*) from jsonb_array_elements(p_content -> 'sections') s
        where s ->> 'section_type' = 'experiences') > 1 then
      return false;
    end if;
  end if;

  return true;
end;
$$;

-- Retrato da versão publicada: inclui os campos novos da aparência.
create or replace function public.editorial_snapshot(p_doc_type text, p_doc_key text)
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
        'heading_font', a.heading_font, 'card_style', a.card_style,
        'dark_color', a.dark_color, 'section_style', a.section_style
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

-- Publicação: aplica os campos novos (com padrão para versões antigas).
create or replace function public.editorial_publish_one(p_document_id uuid, p_expected_version integer, p_note text)
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
             card_style = content #>> '{appearance,card_style}',
             -- Etapa 10.7: versões antigas não têm estes campos (padrão).
             dark_color = content #>> '{appearance,dark_color}',
             section_style = coalesce(content #>> '{appearance,section_style}', 'spacious')
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
