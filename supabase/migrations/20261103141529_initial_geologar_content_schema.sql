-- =============================================================================
-- GeoLogar — schema inicial de conteúdo institucional
--
-- Seções:
--   1. Funções compartilhadas
--   2. Configurações do site e homepage (singletons)
--   3. Linhas de pesquisa, projetos e publicações
--   4. Relações N:N
--   5. Instituições e redes sociais
--   6. Índices
--   7. Triggers
--   8. Privilégios
--   9. Row Level Security
--
-- Regras gerais:
--   - Conteúdo editorial só é público quando is_published = true.
--   - Nenhuma escrita é liberada para anon/authenticated nesta etapa; a
--     administração do conteúdo virá com autenticação e CMS.
--   - Slugs: minúsculos, separados por hífen, únicos por tabela.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Funções compartilhadas
-- -----------------------------------------------------------------------------

-- Atualiza updated_at em qualquer tabela que possua a coluna.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Preenche published_at na primeira publicação, caso não tenha sido informado.
create function public.set_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_published and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;


-- -----------------------------------------------------------------------------
-- 2. Configurações do site e homepage (singletons)
-- -----------------------------------------------------------------------------

create table public.site_settings (
  id                 uuid primary key default gen_random_uuid(),
  site_name          text not null,
  institutional_name text,
  tagline            text,
  short_description  text,
  contact_email      text,
  contact_phone      text,
  address            text,
  city               text,
  state              text,
  country            text,
  logo_path          text,
  favicon_path       text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint site_settings_contact_email_format
    check (contact_email is null or contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

-- Garante no máximo um registro.
create unique index site_settings_singleton on public.site_settings ((true));

comment on table public.site_settings is
  'Configurações institucionais gerais do portal (registro único).';


create table public.homepage_content (
  id                          uuid primary key default gen_random_uuid(),

  hero_title                  text,
  hero_description            text,
  hero_image_path             text,
  hero_image_alt              text,
  hero_primary_cta_label      text,
  hero_primary_cta_href       text,
  hero_secondary_cta_label    text,
  hero_secondary_cta_href     text,

  about_title                 text,
  about_description           text,

  cooperation_title           text,
  cooperation_description     text,
  cooperation_cta_label       text,
  cooperation_cta_href        text,

  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),

  constraint homepage_content_hero_image_alt
    check (hero_image_path is null or hero_image_alt is not null)
);

-- Garante no máximo um registro.
create unique index homepage_content_singleton on public.homepage_content ((true));

comment on table public.homepage_content is
  'Conteúdo editorial dos blocos fixos da homepage (registro único).';


-- -----------------------------------------------------------------------------
-- 3. Linhas de pesquisa, projetos e publicações
-- -----------------------------------------------------------------------------

create table public.research_lines (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  slug              text not null,
  short_description text,
  description       text,
  image_path        text,
  image_alt         text,
  sort_order        integer not null default 0,
  is_featured       boolean not null default false,
  is_published      boolean not null default false,
  published_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint research_lines_slug_key unique (slug),
  constraint research_lines_slug_format
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint research_lines_image_alt
    check (image_path is null or image_alt is not null)
);

comment on table public.research_lines is 'Linhas de pesquisa da rede.';


create table public.projects (
  id                     uuid primary key default gen_random_uuid(),
  title                  text not null,
  slug                   text not null,
  short_description      text,
  description            text,
  image_path             text,
  image_alt              text,

  project_status         text not null,
  start_date             date,
  end_date               date,

  coordination           text,
  funding                text,
  result_or_contribution text,

  external_url           text,

  sort_order             integer not null default 0,
  is_featured            boolean not null default false,
  is_published           boolean not null default false,
  published_at           timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  constraint projects_slug_key unique (slug),
  constraint projects_slug_format
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint projects_image_alt
    check (image_path is null or image_alt is not null),
  -- Novos status: alterar apenas esta constraint.
  constraint projects_status_check
    check (project_status in ('ongoing', 'completed')),
  constraint projects_dates_order
    check (end_date is null or start_date is null or end_date >= start_date),
  constraint projects_external_url_format
    check (external_url is null or external_url ~* '^https?://')
);

comment on table public.projects is 'Projetos de pesquisa da rede.';


create table public.publications (
  id                uuid primary key default gen_random_uuid(),
  -- Título no idioma original da publicação.
  title             text not null,
  slug              text not null,

  -- Autores no formato de citação, separados por "; " (ex.: "Silva, A.; Souza, B.").
  authors           text not null,
  publication_venue text,
  publication_year  smallint,

  -- DOI sem prefixo de URL (ex.: 10.1234/abcd.5678).
  doi               text,
  external_url      text,

  abstract          text,
  citation          text,

  sort_order        integer not null default 0,
  is_featured       boolean not null default false,
  is_published      boolean not null default false,
  published_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint publications_slug_key unique (slug),
  constraint publications_slug_format
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint publications_year_range
    check (publication_year between 1800 and 2100),
  constraint publications_doi_format
    check (doi ~ '^10\.[0-9]{4,9}/\S+$'),
  constraint publications_external_url_format
    check (external_url is null or external_url ~* '^https?://')
);

-- DOIs não diferenciam maiúsculas/minúsculas.
create unique index publications_doi_key on public.publications (lower(doi));

comment on table public.publications is 'Publicações científicas da rede.';


-- -----------------------------------------------------------------------------
-- 4. Relações N:N
--    ON DELETE CASCADE remove apenas o vínculo, nunca a entidade relacionada.
-- -----------------------------------------------------------------------------

create table public.project_research_lines (
  project_id       uuid not null references public.projects (id) on delete cascade,
  research_line_id uuid not null references public.research_lines (id) on delete cascade,
  created_at       timestamptz not null default now(),

  primary key (project_id, research_line_id)
);

comment on table public.project_research_lines is 'Vínculo N:N entre projetos e linhas de pesquisa.';


create table public.publication_projects (
  publication_id uuid not null references public.publications (id) on delete cascade,
  project_id     uuid not null references public.projects (id) on delete cascade,
  created_at     timestamptz not null default now(),

  primary key (publication_id, project_id)
);

comment on table public.publication_projects is 'Vínculo N:N entre publicações e projetos.';


create table public.publication_research_lines (
  publication_id   uuid not null references public.publications (id) on delete cascade,
  research_line_id uuid not null references public.research_lines (id) on delete cascade,
  created_at       timestamptz not null default now(),

  primary key (publication_id, research_line_id)
);

comment on table public.publication_research_lines is
  'Vínculo N:N direto entre publicações e linhas de pesquisa (independente de projeto).';


-- -----------------------------------------------------------------------------
-- 5. Instituições e redes sociais
-- -----------------------------------------------------------------------------

create table public.institution_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null,
  description text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint institution_categories_name_key unique (name),
  constraint institution_categories_slug_key unique (slug),
  constraint institution_categories_slug_format
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

comment on table public.institution_categories is 'Categorias de instituições parceiras.';


create table public.institutions (
  id           uuid primary key default gen_random_uuid(),
  -- RESTRICT: uma categoria só pode ser removida depois de esvaziada.
  category_id  uuid not null references public.institution_categories (id) on delete restrict,

  name         text not null,
  acronym      text,
  description  text,

  logo_path    text,
  logo_alt     text,

  website_url  text,

  city         text,
  state        text,
  country      text,

  sort_order   integer not null default 0,
  is_featured  boolean not null default false,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint institutions_logo_alt
    check (logo_path is null or logo_alt is not null),
  constraint institutions_website_url_format
    check (website_url is null or website_url ~* '^https?://')
);

comment on table public.institutions is 'Instituições parceiras da rede.';


create table public.social_links (
  id         uuid primary key default gen_random_uuid(),
  -- Identificador da plataforma em minúsculas (ex.: instagram, youtube, linkedin).
  platform   text not null,
  label      text,
  url        text not null,
  sort_order integer not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint social_links_url_key unique (url),
  constraint social_links_platform_format
    check (platform ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint social_links_url_format
    check (url ~* '^https?://')
);

comment on table public.social_links is 'Links das redes sociais institucionais.';


-- -----------------------------------------------------------------------------
-- 6. Índices
--    Slugs e chaves primárias já são indexados pelas constraints UNIQUE/PK.
-- -----------------------------------------------------------------------------

-- Listagens públicas ordenadas e destaques da homepage.
create index research_lines_published_order_idx
  on public.research_lines (sort_order) where is_published;
create index research_lines_featured_order_idx
  on public.research_lines (sort_order) where is_published and is_featured;

create index projects_published_order_idx
  on public.projects (sort_order) where is_published;
create index projects_featured_order_idx
  on public.projects (sort_order) where is_published and is_featured;

create index publications_published_order_idx
  on public.publications (sort_order) where is_published;
create index publications_featured_order_idx
  on public.publications (sort_order) where is_published and is_featured;
create index publications_published_year_idx
  on public.publications (publication_year desc) where is_published;

create index institutions_category_id_idx
  on public.institutions (category_id);
create index institutions_published_order_idx
  on public.institutions (sort_order) where is_published;
create index institutions_featured_order_idx
  on public.institutions (sort_order) where is_published and is_featured;

-- Lado inverso das relações N:N (o primeiro lado é coberto pela PK).
create index project_research_lines_research_line_id_idx
  on public.project_research_lines (research_line_id);
create index publication_projects_project_id_idx
  on public.publication_projects (project_id);
create index publication_research_lines_research_line_id_idx
  on public.publication_research_lines (research_line_id);


-- -----------------------------------------------------------------------------
-- 7. Triggers
-- -----------------------------------------------------------------------------

create trigger set_updated_at before update on public.site_settings
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.homepage_content
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.research_lines
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.projects
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.publications
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.institution_categories
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.institutions
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.social_links
  for each row execute function public.set_updated_at();

create trigger set_published_at before insert or update on public.research_lines
  for each row execute function public.set_published_at();
create trigger set_published_at before insert or update on public.projects
  for each row execute function public.set_published_at();
create trigger set_published_at before insert or update on public.publications
  for each row execute function public.set_published_at();
create trigger set_published_at before insert or update on public.institutions
  for each row execute function public.set_published_at();


-- -----------------------------------------------------------------------------
-- 8. Privilégios
--    Explícitos para não depender da exposição automática do Data API.
--    anon/authenticated: somente leitura (filtrada por RLS).
-- -----------------------------------------------------------------------------

revoke all on
  public.site_settings,
  public.homepage_content,
  public.research_lines,
  public.projects,
  public.publications,
  public.project_research_lines,
  public.publication_projects,
  public.publication_research_lines,
  public.institution_categories,
  public.institutions,
  public.social_links
from anon, authenticated;

grant select on
  public.site_settings,
  public.homepage_content,
  public.research_lines,
  public.projects,
  public.publications,
  public.project_research_lines,
  public.publication_projects,
  public.publication_research_lines,
  public.institution_categories,
  public.institutions,
  public.social_links
to anon, authenticated;

grant all on
  public.site_settings,
  public.homepage_content,
  public.research_lines,
  public.projects,
  public.publications,
  public.project_research_lines,
  public.publication_projects,
  public.publication_research_lines,
  public.institution_categories,
  public.institutions,
  public.social_links
to service_role;

-- Funções de trigger não devem ser chamadas diretamente.
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.set_published_at() from public, anon, authenticated;


-- -----------------------------------------------------------------------------
-- 9. Row Level Security
--    Apenas políticas de SELECT. Sem políticas de escrita: INSERT/UPDATE/DELETE
--    ficam bloqueados para anon e authenticated.
-- -----------------------------------------------------------------------------

alter table public.site_settings              enable row level security;
alter table public.homepage_content           enable row level security;
alter table public.research_lines             enable row level security;
alter table public.projects                   enable row level security;
alter table public.publications               enable row level security;
alter table public.project_research_lines     enable row level security;
alter table public.publication_projects       enable row level security;
alter table public.publication_research_lines enable row level security;
alter table public.institution_categories     enable row level security;
alter table public.institutions               enable row level security;
alter table public.social_links               enable row level security;

-- Configuração institucional: pública.
create policy "Public can read site settings"
  on public.site_settings for select to anon, authenticated
  using (true);

create policy "Public can read homepage content"
  on public.homepage_content for select to anon, authenticated
  using (true);

create policy "Public can read institution categories"
  on public.institution_categories for select to anon, authenticated
  using (true);

-- Conteúdo editorial: somente publicado.
create policy "Public can read published research lines"
  on public.research_lines for select to anon, authenticated
  using (is_published);

create policy "Public can read published projects"
  on public.projects for select to anon, authenticated
  using (is_published);

create policy "Public can read published publications"
  on public.publications for select to anon, authenticated
  using (is_published);

create policy "Public can read published institutions"
  on public.institutions for select to anon, authenticated
  using (is_published);

create policy "Public can read active social links"
  on public.social_links for select to anon, authenticated
  using (is_active);

-- Vínculos: visíveis apenas quando os dois lados estão publicados.
create policy "Public can read links between published projects and research lines"
  on public.project_research_lines for select to anon, authenticated
  using (
    exists (select 1 from public.projects p
            where p.id = project_id and p.is_published)
    and exists (select 1 from public.research_lines r
                where r.id = research_line_id and r.is_published)
  );

create policy "Public can read links between published publications and projects"
  on public.publication_projects for select to anon, authenticated
  using (
    exists (select 1 from public.publications pub
            where pub.id = publication_id and pub.is_published)
    and exists (select 1 from public.projects p
                where p.id = project_id and p.is_published)
  );

create policy "Public can read links between published publications and research lines"
  on public.publication_research_lines for select to anon, authenticated
  using (
    exists (select 1 from public.publications pub
            where pub.id = publication_id and pub.is_published)
    and exists (select 1 from public.research_lines r
                where r.id = research_line_id and r.is_published)
  );


-- -----------------------------------------------------------------------------
-- Dados iniciais confirmados
-- -----------------------------------------------------------------------------

insert into public.site_settings (site_name, institutional_name)
values (
  'GeoLogar',
  'Rede de Pesquisa em Geociências — Recursos Naturais e Sustentabilidade'
);
