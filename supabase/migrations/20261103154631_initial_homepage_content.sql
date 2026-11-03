-- =============================================================================
-- GeoLogar — conteúdo inicial da homepage
--
-- Textos do briefing da homepage (aprovados para a V1 do portal). A partir
-- daqui, alterações de conteúdo devem ser feitas pelo CMS, não por migrations.
-- =============================================================================

insert into public.homepage_content (
  hero_title,
  hero_description,
  hero_primary_cta_label,
  hero_primary_cta_href,
  hero_secondary_cta_label,
  hero_secondary_cta_href,
  about_title,
  about_description,
  cooperation_title,
  cooperation_description,
  cooperation_cta_label
) values (
  'Geociências conectando território, ciência e sociedade',
  'A GeoLogar conecta pesquisadores e instituições para compreender o território, valorizar os recursos naturais e desenvolver soluções sustentáveis.',
  'Explore nossas pesquisas',
  '/#pesquisa',
  'Conheça a rede',
  '/#a-rede',
  'Uma rede para produzir e compartilhar conhecimento',
  'A GeoLogar é uma rede interdisciplinar dedicada à produção, integração e divulgação do conhecimento em Geociências. Reúne pesquisadores, estudantes e instituições para desenvolver pesquisas, formar pessoas e ampliar a cooperação em recursos naturais e sustentabilidade.',
  'Vamos conectar conhecimento e novas possibilidades',
  'Entre em contato para conhecer a rede, propor projetos e explorar oportunidades de cooperação em Geociências e sustentabilidade.',
  -- Sem href: o botão só aparece quando houver canal oficial de contato.
  'Fale com a GeoLogar'
);

-- published_at é preenchido pelo trigger set_published_at.
insert into public.research_lines
  (title, slug, short_description, sort_order, is_featured, is_published)
values
  ('Geologia e Geodiversidade', 'geologia-e-geodiversidade',
   'Estudos sobre os materiais, processos e diversidade geológica dos territórios.',
   10, true, true),
  ('Recursos Minerais', 'recursos-minerais',
   'Pesquisa sobre recursos minerais, seu aproveitamento e uso responsável.',
   20, true, true),
  ('Geologia Ambiental', 'geologia-ambiental',
   'Investigação das relações entre processos geológicos, ambiente e sociedade.',
   30, true, true),
  ('Sustentabilidade e Economia Circular', 'sustentabilidade-e-economia-circular',
   'Desenvolvimento de soluções para uso eficiente de recursos e valorização de resíduos.',
   40, true, true),
  ('Patrimônio Geológico', 'patrimonio-geologico',
   'Identificação, valorização e conservação de locais de interesse geológico.',
   50, true, true),
  ('Geotecnologias e Geoprocessamento', 'geotecnologias-e-geoprocessamento',
   'Aplicação de ferramentas de análise espacial ao estudo e à gestão do território.',
   60, true, true);
