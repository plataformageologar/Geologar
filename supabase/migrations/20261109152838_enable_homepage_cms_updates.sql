-- =============================================================================
-- GeoLogar — edição da homepage pelo CMS (Etapa 7.1)
--
-- Libera somente o UPDATE dos campos editoriais de `homepage_content` para
-- contas com vínculo ativo de administrador ou editor.
--
-- - Privilégio por coluna: `id`, `created_at`, `updated_at` (mantido pelo
--   trigger set_updated_at) e `hero_image_path` (imagens ficam para a etapa
--   do Storage) continuam somente leitura.
-- - Sem INSERT nem DELETE: o registro único (homepage_content_singleton) é
--   apenas atualizado.
-- - A policy consulta `admin_memberships` com os privilégios do próprio
--   usuário; o RLS daquela tabela já permite ler o próprio vínculo, então não
--   é necessária função SECURITY DEFINER.
-- - Desativar ou remover o vínculo bloqueia a escrita imediatamente.
-- - Nenhuma outra tabela recebe permissão de escrita nesta etapa.
-- =============================================================================

grant update (
  hero_title,
  hero_description,
  hero_image_alt,
  hero_primary_cta_label,
  hero_primary_cta_href,
  hero_secondary_cta_label,
  hero_secondary_cta_href,
  about_title,
  about_description,
  cooperation_title,
  cooperation_description,
  cooperation_cta_label,
  cooperation_cta_href
) on public.homepage_content to authenticated;

create policy "Active admins and editors can update homepage content"
  on public.homepage_content for update to authenticated
  using (
    exists (
      select 1
      from public.admin_memberships as membership
      where membership.user_id = (select auth.uid())
        and membership.is_active
        and membership.role in ('admin', 'editor')
    )
  )
  with check (
    exists (
      select 1
      from public.admin_memberships as membership
      where membership.user_id = (select auth.uid())
        and membership.is_active
        and membership.role in ('admin', 'editor')
    )
  );
