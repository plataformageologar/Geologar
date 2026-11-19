-- =============================================================================
-- Etapa 8.5: rascunhos de projeto sem situação definida
--
-- Projetos ainda não confirmados pela equipe (por exemplo, os três projetos
-- citados no mockup da homepage) podem ser preparados como rascunho sem que
-- seja preciso escolher uma situação ("Em andamento"/"Concluído") apenas para
-- satisfazer o banco. A situação continua obrigatória para publicar.
--
-- - `project_status` passa a aceitar null;
-- - `projects_status_check` não muda: null já passa no CHECK e qualquer valor
--   preenchido continua limitado a 'ongoing'/'completed';
-- - `projects_published_status` exige a situação em projetos publicados.
--
-- `save_project` não muda: repassa `p_project_status` como recebido.
-- Nenhum registro existente é alterado (todos têm situação preenchida).
-- =============================================================================

alter table public.projects
  alter column project_status drop not null;

alter table public.projects
  add constraint projects_published_status
    check (not is_published or project_status is not null);

comment on column public.projects.project_status is
  'Situação do projeto (ongoing/completed). Opcional em rascunhos; obrigatória para publicar.';
