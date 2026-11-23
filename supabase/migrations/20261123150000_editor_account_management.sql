-- =============================================================================
-- GeoLogar — Gerenciamento de Editores pelo CMS (Etapa 10.5)
--
-- - admin_memberships ganha a exigência de troca da senha inicial
--   (`must_change_password` + `password_change_required_at`). Vínculos
--   existentes ficam com `false` (nenhuma mudança de comportamento).
-- - Enquanto a troca estiver pendente, a conta NÃO é considerada apta a
--   editar: has_cms_role passa a exigir `not must_change_password`, e a policy
--   da homepage (que consultava o vínculo diretamente) passa a usar
--   has_cms_role. A própria conta continua lendo o seu vínculo.
-- - admin_user_events: histórico das operações sobre contas de Editor. Só
--   administradores ativos leem; somente o service_role (Edge Function
--   admin-editor-management) insere; ninguém altera nem exclui.
-- - Vínculos continuam sem privilégio de escrita para anon/authenticated: só
--   a Edge Function (service_role), depois de validar o administrador, cria e
--   altera vínculos de Editor.
-- - Nenhuma senha, hash ou token é gravado nas tabelas do CMS.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Troca obrigatória da senha inicial
-- -----------------------------------------------------------------------------

alter table public.admin_memberships
  add column must_change_password boolean not null default false,
  add column password_change_required_at timestamptz,
  add constraint admin_memberships_password_change_check
    check (not must_change_password or password_change_required_at is not null);

comment on column public.admin_memberships.must_change_password is
  'true enquanto a conta usa a senha inicial definida pelo administrador: bloqueia toda operação do CMS até a troca.';
comment on column public.admin_memberships.password_change_required_at is
  'Quando a troca passou a ser exigida (criação ou redefinição pelo administrador). Uma troca registrada no Auth depois deste instante conclui a exigência.';

-- -----------------------------------------------------------------------------
-- 2. Papel no CMS: conta com troca pendente não edita
-- -----------------------------------------------------------------------------

create or replace function public.has_cms_role(allowed_roles text[])
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
      and not membership.must_change_password
      and membership.role = any (allowed_roles)
  );
$$;

comment on function public.has_cms_role(text[]) is
  'true quando auth.uid() tem vínculo ativo, sem troca de senha pendente, em admin_memberships com um dos papéis informados.';

drop policy "Active admins and editors can update homepage content" on public.homepage_content;
create policy "Active admins and editors can update homepage content"
  on public.homepage_content for update to authenticated
  using ((select public.has_cms_role(array['admin', 'editor'])))
  with check ((select public.has_cms_role(array['admin', 'editor'])));

-- -----------------------------------------------------------------------------
-- 3. Histórico das operações sobre contas de Editor
-- -----------------------------------------------------------------------------

create table public.admin_user_events (
  id             bigint      generated always as identity primary key,
  created_at     timestamptz not null default now(),
  actor_user_id  uuid        references auth.users (id) on delete set null,
  target_user_id uuid        references auth.users (id) on delete set null,
  target_email   text,
  event_type     text        not null,
  outcome        text        not null,
  detail         text,

  constraint admin_user_events_type_check check (event_type in (
    'editor_created',
    'editor_deactivated',
    'editor_reactivated',
    'editor_password_reset',
    'initial_password_changed'
  )),
  constraint admin_user_events_outcome_check check (outcome in ('success', 'failure')),
  constraint admin_user_events_email_length check (char_length(target_email) <= 320),
  -- Apenas códigos curtos de etapa/erro (nunca senhas, tokens ou mensagens cruas).
  constraint admin_user_events_detail_format check (detail ~ '^[a-z0-9_:-]{1,80}$')
);

comment on table public.admin_user_events is
  'Histórico das operações sobre contas de Editor (criação, desativação, reativação, redefinição e troca da senha inicial). Sem senhas nem tokens.';

create index admin_user_events_created_idx on public.admin_user_events (created_at desc);
create index admin_user_events_actor_idx on public.admin_user_events (actor_user_id, created_at desc);
create index admin_user_events_target_idx on public.admin_user_events (target_user_id);

revoke all on public.admin_user_events from public, anon, authenticated, service_role;
grant select on public.admin_user_events to authenticated;
-- Somente inserção e leitura: o histórico não é editável nem pela Edge Function.
grant select, insert on public.admin_user_events to service_role;

alter table public.admin_user_events enable row level security;

create policy "Active admins can read user management events"
  on public.admin_user_events for select to authenticated
  using ((select public.has_cms_role(array['admin'])));
