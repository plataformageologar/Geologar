-- =============================================================================
-- GeoLogar — autorização da área administrativa (Etapa 6)
--
-- Autenticação (quem é o usuário) fica no Supabase Auth. Esta tabela define a
-- autorização (quem pode administrar o portal): uma conta autenticada só
-- acessa /admin se tiver aqui um vínculo ativo.
--
-- - Vínculos são criados e alterados apenas por operação privilegiada (SQL
--   Editor do painel / service_role). Não há cadastro público nem criação
--   automática no primeiro login.
-- - Cada usuário autenticado lê somente o próprio vínculo; ninguém altera
--   vínculos pela API (sem privilégios nem policies de escrita), o que
--   impede a autoelevação de papel.
-- - `user_metadata` (editável pelo próprio usuário) não é usado para
--   autorização.
-- - Nenhuma permissão de escrita é concedida nas tabelas de conteúdo: as
--   policies por operação e por papel serão criadas na etapa do CMS.
-- =============================================================================

create table public.admin_memberships (
  user_id    uuid        primary key references auth.users (id) on delete cascade,
  role       text        not null,
  is_active  boolean     not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_memberships_role_check
    check (role in ('admin', 'editor'))
);

comment on table public.admin_memberships is
  'Autorização da área administrativa: papel (admin/editor) e situação de cada conta do Supabase Auth.';
comment on column public.admin_memberships.role is
  'admin: gestão completa do conteúdo e das permissões; editor: gestão editorial (regras definidas na etapa do CMS).';
comment on column public.admin_memberships.is_active is
  'false bloqueia o acesso à área administrativa sem excluir a conta.';

-- A chave primária (user_id) já atende à consulta do próprio vínculo; este
-- índice apoia listagens futuras de vínculos ativos por papel.
create index admin_memberships_active_role_idx
  on public.admin_memberships (role)
  where is_active;

create trigger set_updated_at before update on public.admin_memberships
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Privilégios e RLS
-- -----------------------------------------------------------------------------

revoke all on public.admin_memberships from public, anon, authenticated;
grant select on public.admin_memberships to authenticated;
grant all on public.admin_memberships to service_role;

alter table public.admin_memberships enable row level security;

-- Somente o próprio vínculo (necessário para verificar o acesso). Vínculos
-- inativos continuam legíveis pelo dono para que a interface informe o
-- bloqueio; o acesso é negado pela aplicação.
create policy "Users can read their own admin membership"
  on public.admin_memberships for select to authenticated
  using ((select auth.uid()) = user_id);
