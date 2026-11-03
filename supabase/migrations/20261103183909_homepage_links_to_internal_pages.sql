-- =============================================================================
-- GeoLogar — links da homepage para as páginas internas (Etapa 5)
--
-- Com as páginas /pesquisa, /rede e /contato publicadas, os CTAs da homepage
-- deixam de apontar para âncoras da própria homepage. Cada campo só é
-- alterado se ainda tiver o valor original da migration de conteúdo inicial:
-- links personalizados ou externos cadastrados depois são preservados.
-- =============================================================================

update public.homepage_content
set hero_primary_cta_href = '/pesquisa'
where hero_primary_cta_href = '/#pesquisa';

update public.homepage_content
set hero_secondary_cta_href = '/rede'
where hero_secondary_cta_href = '/#a-rede';

-- O botão "Fale com a GeoLogar" ficava oculto por não ter destino real.
update public.homepage_content
set cooperation_cta_href = '/contato'
where cooperation_cta_href is null
  and cooperation_cta_label = 'Fale com a GeoLogar';
