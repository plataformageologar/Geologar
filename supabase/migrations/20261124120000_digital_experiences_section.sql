-- =============================================================================
-- GeoLogar — Seção "Experiências digitais" (Etapa 10.6)
--
-- Novo tipo de seção `experiences`, somente na página inicial: título,
-- sobretítulo, descrição, fundo, colunas (2 ou 3) e uma lista de até 12
-- experiências (cards com link externo HTTPS, imagem da biblioteca,
-- disponibilidade e visibilidade próprias). Reaproveita page_sections e o
-- fluxo editorial da Etapa 9.6 (rascunho → publicação → histórico); não há
-- tabelas, RPCs nem publicação paralelas.
--
-- Como os blocos, a seção pode ser adicionada e excluída pelo fluxo
-- editorial (admin e editor): revisões antigas, sem a seção, continuam
-- válidas e restauráveis (restaurar uma delas e publicar remove a seção).
-- Há no máximo uma por página.
--
-- Conteúdo inicial: a seção é adicionada ao RASCUNHO da página inicial (logo
-- depois do banner), preservando um rascunho existente, com uma revisão
-- registrada no histórico. O site público só muda quando alguém da equipe
-- publicar a página inicial pelo painel. Revisões antigas não são alteradas.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Validação
-- -----------------------------------------------------------------------------

-- Endereço de uma experiência: somente https://, com domínio, sem usuário/senha,
-- espaços ou caracteres de controle. Nunca é acessado pelo servidor (sem SSRF).
create function public.is_valid_experience_url(value text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select value is not null
    and char_length(value) between 12 and 300
    and value !~ '[[:cntrl:][:space:]\\]'
    and value ~* '^https://[a-z0-9-]+(\.[a-z0-9-]+)+(:[0-9]{1,5})?([/?#].*)?$';
$$;

-- Lista de experiências: objetos com chaves conhecidas, id UUID único,
-- textos com limite, disponibilidade fechada e URL exigida quando disponível.
create function public.is_valid_experience_list(p_value jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  item jsonb;
  key text;
  value jsonb;
  ids text[] := '{}';
begin
  if jsonb_typeof(p_value) is distinct from 'array' or jsonb_array_length(p_value) > 12 then
    return false;
  end if;

  for item in select * from jsonb_array_elements(p_value) loop
    if jsonb_typeof(item) <> 'object'
       or jsonb_typeof(item -> 'id') is distinct from 'string'
       or (item ->> 'id') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or (item ->> 'id') = any (ids)
       or jsonb_typeof(item -> 'title') is distinct from 'string'
       or btrim(item ->> 'title') = ''
       or jsonb_typeof(item -> 'availability') is distinct from 'string'
       or (item ->> 'availability') not in ('available', 'coming_soon', 'unavailable')
       or jsonb_typeof(item -> 'is_visible') is distinct from 'boolean'
       or jsonb_typeof(item -> 'open_in_new_tab') is distinct from 'boolean'
       or ((item ->> 'availability') = 'available' and not (item ? 'external_url')) then
      return false;
    end if;
    ids := ids || (item ->> 'id');

    for key, value in select * from jsonb_each(item) loop
      if not (case key
        when 'id' then true
        when 'availability' then true
        when 'is_visible' then true
        when 'open_in_new_tab' then true
        when 'title' then public.is_short_text(value, 120)
        when 'label' then public.is_short_text(value, 60)
        when 'description' then public.is_short_text(value, 400)
        when 'image_path' then jsonb_typeof(value) = 'string' and public.is_valid_image_reference(value #>> '{}')
        when 'image_alt' then public.is_short_text(value, 200)
        when 'external_url' then jsonb_typeof(value) = 'string' and public.is_valid_experience_url(value #>> '{}')
        when 'button_label' then public.is_short_text(value, 40)
        when 'unavailable_label' then public.is_short_text(value, 40)
        else false
      end) then
        return false;
      end if;
    end loop;
  end loop;

  return true;
end;
$$;

-- Configurações das seções: mesmas regras de antes, mais o tipo `experiences`.
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
      when 'layout' then (value #>> '{}') in ('default', 'centered', 'split') and jsonb_typeof(value) = 'string'
      when 'image_position' then (value #>> '{}') in ('center', 'top', 'bottom', 'left', 'right') and jsonb_typeof(value) = 'string'
      when 'overlay' then (value #>> '{}') in ('light', 'medium', 'strong') and jsonb_typeof(value) = 'string'
      when 'background' then (value #>> '{}') in ('default', 'surface', 'muted', 'deep', 'primary') and jsonb_typeof(value) = 'string'
      when 'align' then (value #>> '{}') in ('left', 'center') and jsonb_typeof(value) = 'string'
      when 'image_side' then (value #>> '{}') in ('left', 'right') and jsonb_typeof(value) = 'string'
      when 'images' then jsonb_typeof(value) = 'array' and jsonb_array_length(value) <= 12
      when 'institution_ids' then jsonb_typeof(value) = 'array' and jsonb_array_length(value) <= 24
      when 'experiences' then public.is_valid_experience_list(value)
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

-- Imagens da biblioteca citadas pelas configurações (inclui as experiências):
-- trava/verificação de existência (GL422) e media_usage passam a enxergá-las.
create or replace function public.section_image_paths(p_settings jsonb)
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
  where image ->> 'path' is not null
  union
  select experience ->> 'image_path'
  from jsonb_array_elements(
    case when jsonb_typeof(p_settings -> 'experiences') = 'array' then p_settings -> 'experiences' else '[]'::jsonb end
  ) as experience
  where jsonb_typeof(experience) = 'object' and experience ->> 'image_path' is not null;
$$;

-- Conteúdo editorial: a seção de experiências só existe na página inicial,
-- no máximo uma. Demais regras inalteradas.
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


-- -----------------------------------------------------------------------------
-- 2. page_sections: tipo novo, só na página inicial, uma por página
-- -----------------------------------------------------------------------------

alter table public.page_sections drop constraint page_sections_type;
alter table public.page_sections add constraint page_sections_type check (section_type in (
  'hero', 'about', 'pillars', 'research', 'projects', 'publications', 'institutions', 'cooperation',
  'text', 'image_text', 'cta', 'gallery', 'logos', 'experiences'
));

alter table public.page_sections add constraint page_sections_experiences_home
  check (section_type <> 'experiences' or page_key = 'home');

create unique index page_sections_experiences_unique
  on public.page_sections (page_key)
  where section_type = 'experiences';

-- Como os blocos, a seção é criada e excluída pelo fluxo editorial
-- (admin e editor ativos, sem troca de senha pendente).
drop policy "CMS staff can create page blocks" on public.page_sections;
create policy "CMS staff can create page blocks"
  on public.page_sections for insert to authenticated
  with check (
    (select public.has_cms_role(array['admin', 'editor']))
    and section_type in ('text', 'image_text', 'cta', 'gallery', 'logos', 'experiences')
  );

drop policy "CMS staff can delete page blocks" on public.page_sections;
create policy "CMS staff can delete page blocks"
  on public.page_sections for delete to authenticated
  using (
    (select public.has_cms_role(array['admin', 'editor']))
    and section_type in ('text', 'image_text', 'cta', 'gallery', 'logos', 'experiences')
  );


-- -----------------------------------------------------------------------------
-- 3. Conteúdo inicial: rascunho da página inicial (sem publicar)
--
-- Bege Bahia (experiência 360° da AeonVR, endereço conferido em 24/11/2026)
-- e um card provisório "Em breve", sem link. A capa do Bege Bahia é uma
-- vista em perspectiva de um panorama real da pedreira, do próprio projeto,
-- servida pelo site; pode ser trocada pela biblioteca de mídia.
-- -----------------------------------------------------------------------------

do $$
declare
  doc public.editorial_documents;
  base jsonb;
  hero_position integer;
  new_section jsonb;
  result jsonb;
begin
  select * into doc from public.editorial_documents where doc_type = 'home' and doc_key = 'home' for update;
  if not found then
    raise notice 'Etapa 10.6: documento editorial da página inicial inexistente; nada a preparar.';
    return;
  end if;

  -- Rascunho existente é preservado; sem rascunho, parte da versão publicada.
  base := coalesce(doc.draft, public.editorial_snapshot('home', 'home'));
  if base is null or jsonb_typeof(base -> 'sections') is distinct from 'array' then
    raise notice 'Etapa 10.6: conteúdo da página inicial indisponível; nada a preparar.';
    return;
  end if;
  if exists (select 1 from jsonb_array_elements(base -> 'sections') s where s ->> 'section_type' = 'experiences')
     or exists (select 1 from public.page_sections s where s.section_type = 'experiences') then
    return;
  end if;

  new_section := jsonb_build_object(
    'id', null,
    'section_type', 'experiences',
    'is_visible', true,
    'settings', jsonb_build_object(
      'eyebrow', 'Divulgação científica',
      'title', 'Explore as geociências de perto',
      'description', 'Conheça nossas experiências digitais e descubra o patrimônio geológico, os recursos naturais e as geociências de maneira interativa e imersiva.',
      'background', 'muted',
      'columns', 2,
      'experiences', jsonb_build_array(
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'title', 'Bege Bahia',
          'label', 'Experiência imersiva 360°',
          'description', 'Explore a cadeia produtiva do mármore Bege Bahia por meio de uma experiência virtual em 360°, acompanhando as etapas de extração e beneficiamento da rocha ornamental.',
          'image_path', '/images/experiencias/bege-bahia-pedreira.webp',
          'image_alt', 'Pedreira de mármore Bege Bahia em Ourolândia (BA): bancadas de rocha clara cortadas em degraus e blocos extraídos sob céu nublado.',
          'external_url', 'https://bernardo-aeonvr.github.io/Geologar-2/',
          'button_label', 'Iniciar experiência',
          'unavailable_label', 'Em breve',
          'availability', 'available',
          'is_visible', true,
          'open_in_new_tab', true
        ),
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'title', 'Nova experiência GeoLogar',
          'label', 'Experiência interativa',
          'description', 'Mais uma maneira de explorar o conhecimento geocientífico por meio de recursos digitais.',
          'button_label', 'Iniciar experiência',
          'unavailable_label', 'Em breve',
          'availability', 'coming_soon',
          'is_visible', true,
          'open_in_new_tab', true
        )
      )
    )
  );

  select s.position - 1 into hero_position
  from jsonb_array_elements(base -> 'sections') with ordinality as s (item, position)
  where s.item ->> 'section_type' = 'hero'
  limit 1;

  result := jsonb_set(
    base,
    '{sections}',
    case
      when hero_position is null then jsonb_build_array(new_section) || (base -> 'sections')
      else jsonb_insert(base -> 'sections', array[hero_position::text], new_section, true)
    end
  );

  if not public.is_valid_editorial_content('home', result) then
    raise exception 'Etapa 10.6: conteúdo inicial inválido' using errcode = '22023';
  end if;

  perform public.editorial_add_revision(
    doc.id, 'draft_saved', result, doc.published_revision_id, null,
    'Etapa 10.6: seção Experiências digitais (conteúdo inicial, aguardando publicação)'
  );

  -- A versão sobe: quem estiver com a página aberta recebe aviso de conflito
  -- em vez de sobrescrever este rascunho sem perceber.
  update public.editorial_documents
     set draft = result,
         draft_base_revision_id = doc.published_revision_id,
         draft_updated_at = now(),
         draft_updated_by = null,
         draft_updated_by_email = null,
         version = doc.version + 1
   where id = doc.id;
end;
$$;
