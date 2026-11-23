-- =============================================================================
-- GeoLogar — Guarda do fluxo editorial (Etapa 9.6)
--
-- Depois desta migration, anon/authenticated só alteram o conteúdo editorial
-- (tabelas publicadas, páginas personalizadas, rascunhos e revisões) pelas
-- funções do fluxo (save_editorial_drafts, publish_editorial_documents,
-- restore_editorial_revision, discard_editorial_draft, create_custom_page,
-- update_custom_page_slug, set_custom_page_status), que ligam
-- `geologar.editorial_write` apenas durante a própria transação. Qualquer
-- outro caminho (UPDATE direto pelo Data API, funções antigas de gravação de
-- listas) é recusado com GL403. Migrations e manutenção (postgres) não são
-- afetadas.
-- =============================================================================

create function public.editorial_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated')
     and coalesce(current_setting('geologar.editorial_write', true), '') <> 'on' then
    raise exception 'o conteúdo editorial só muda pelo fluxo de rascunho e publicação'
      using errcode = 'GL403';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke execute on function public.editorial_guard() from public, anon, authenticated;

create trigger editorial_guard before insert or update or delete on public.homepage_content
  for each row execute function public.editorial_guard();
create trigger editorial_guard before insert or update or delete on public.page_sections
  for each row execute function public.editorial_guard();
create trigger editorial_guard before insert or update or delete on public.site_pillars
  for each row execute function public.editorial_guard();
create trigger editorial_guard before insert or update or delete on public.page_content
  for each row execute function public.editorial_guard();
create trigger editorial_guard before insert or update or delete on public.site_navigation
  for each row execute function public.editorial_guard();
create trigger editorial_guard before insert or update or delete on public.site_appearance
  for each row execute function public.editorial_guard();
create trigger editorial_guard before insert or update or delete on public.site_settings
  for each row execute function public.editorial_guard();
create trigger editorial_guard before insert or update or delete on public.custom_pages
  for each row execute function public.editorial_guard();
create trigger editorial_guard before insert or update or delete on public.editorial_documents
  for each row execute function public.editorial_guard();
create trigger editorial_guard before insert or update or delete on public.editorial_revisions
  for each row execute function public.editorial_guard();


