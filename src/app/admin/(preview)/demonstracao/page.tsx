import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { DemoNote, DemoPlaceholderSection, DemoStateLabel } from "@/components/demo/demo-notes";
import { AboutNetwork } from "@/components/home/about-network";
import { CooperationCta } from "@/components/home/cooperation-cta";
import { FeaturedProjects } from "@/components/home/featured-projects";
import { Hero } from "@/components/home/hero";
import { Partners } from "@/components/home/partners";
import { RecentPublications } from "@/components/home/recent-publications";
import { ResearchLines } from "@/components/home/research-lines";
import { PublicShell } from "@/components/layout/public-shell";
import { ProjectCard } from "@/components/projects/project-card";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { pillars } from "@/data/site";
import { requireAdminAccess } from "@/lib/auth/access";
import { getDraftProjectsForDemo } from "@/lib/queries/admin-demo";
import { getHomepageData, withAvailableHeroLinks } from "@/lib/queries/homepage";
import { getActiveSocialLinks, getSiteSettings } from "@/lib/queries/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Prévia de demonstração",
  robots: { index: false, follow: false },
};

/**
 * Prévia protegida da homepage para revisão com a equipe GeoLogar. Usa os
 * mesmos componentes do site público e acrescenta, só aqui, os rascunhos de
 * projeto e notas sobre o que ainda depende de validação. Exige vínculo
 * administrativo ativo (o proxy também redireciona visitantes sem sessão e
 * marca a resposta como `no-store`); o layout `/admin` aplica `noindex`.
 */
export default async function DemoPreviewPage() {
  await requireAdminAccess();

  const [{ content, researchLines, projects, publications, institutionGroups, sections }, drafts, settings, socialLinks] =
    await Promise.all([getHomepageData(), getDraftProjectsForDemo(), getSiteSettings(), getActiveSocialLinks()]);

  const linesWithImage = researchLines.filter((line) => line.image_path).length;
  const draftProjects = drafts.status === "ready" ? drafts.data : [];
  const hasContact = Boolean(settings.contact_email || settings.contact_phone || settings.address || settings.city);

  return (
    <>
      <div className="border-b border-earth/30 bg-earth-soft">
        <Container className="flex flex-col gap-3 py-3 text-body-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2">
            <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-earth" />
            <span>
              <strong className="font-semibold">Prévia de demonstração</strong> — visível só para contas do
              painel. Mostra a homepage com os rascunhos e indica o que ainda depende de validação. Nada
              aqui é publicado.
            </span>
          </p>
          <Link
            href="/admin"
            className="inline-flex min-h-10 shrink-0 items-center gap-1.5 text-label text-primary underline-offset-4 hover:underline"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Voltar ao painel
          </Link>
        </Container>
      </div>

      <PublicShell>
        <Hero content={withAvailableHeroLinks(content, sections)} eyebrow="Rede de Pesquisa em Geociências" />
        {content.hero_image_path ? (
          <DemoNote state="published">Banner com a fotografia configurada em Homepage.</DemoNote>
        ) : (
          <DemoNote state="pending">
            <strong>Banner sem fotografia</strong>: aguardando uma fotografia oficial, com direitos de uso, de
            pesquisas ou territórios da rede. O recorte do mockup tem o título e os botões gravados na imagem e
            não foi usado.
          </DemoNote>
        )}

        <AboutNetwork content={content} pillars={pillars} />
        <DemoNote state="published">
          Texto e pilares do briefing, já exibidos no site. <strong>Aprovação formal da equipe pendente.</strong>
        </DemoNote>

        <ResearchLines researchLines={researchLines} />
        <DemoNote state="published">
          {researchLines.length} linhas publicadas
          {linesWithImage > 0 &&
            `; ${linesWithImage} com imagem provisória recortada do mockup (baixa resolução), a substituir por fotografias oficiais`}
          . <strong>Descrições pendentes de aprovação.</strong>
        </DemoNote>

        <FeaturedProjects projects={projects} />
        {draftProjects.length > 0 ? (
          <section aria-labelledby="demo-projetos-title" className="section-y">
            <Container>
              <SectionHeading
                id="demo-projetos-title"
                eyebrow="Projetos"
                title="Pesquisa com resultados"
                description="Rascunhos citados na referência visual. Situação, coordenação, período e resultados aguardam confirmação da equipe."
              />
              <ul className="mt-12 grid gap-6 lg:grid-cols-3">
                {draftProjects.map((project) => (
                  <li key={project.slug} className="flex flex-col gap-3">
                    <DemoStateLabel state="draft" />
                    <ProjectCard project={project} />
                  </li>
                ))}
              </ul>
            </Container>
          </section>
        ) : (
          projects.length === 0 && (
            <DemoPlaceholderSection id="demo-projetos" eyebrow="Projetos" title="Pesquisa com resultados">
              <p>
                {drafts.status === "error"
                  ? "Não foi possível carregar os rascunhos de projeto. Recarregue a página."
                  : "Nenhum projeto cadastrado. Os projetos publicados e marcados como destaque aparecem aqui."}
              </p>
            </DemoPlaceholderSection>
          )
        )}
        <DemoNote state={projects.length > 0 ? "published" : draftProjects.length > 0 ? "draft" : "pending"}>
          {projects.length > 0
            ? `${projects.length} projeto(s) em destaque publicados. `
            : "Nenhum projeto publicado: a seção não aparece no site. "}
          {draftProjects.length > 0 &&
            "Os cards de rascunho não têm link: a página do projeto só existe depois da publicação."}
        </DemoNote>

        {publications.length > 0 ? (
          <RecentPublications publications={publications} />
        ) : (
          <DemoPlaceholderSection id="demo-publicacoes" eyebrow="Publicações" title="Conhecimento publicado">
            <p>
              As publicações serão cadastradas pela equipe GeoLogar em <strong>Publicações</strong> (título,
              autores, veículo, ano, DOI ou link). As três referências do mockup não foram importadas: precisam ser
              conferidas antes. Enquanto não houver publicação publicada, a seção não aparece no site.
            </p>
          </DemoPlaceholderSection>
        )}

        {institutionGroups.length > 0 ? (
          <Partners groups={institutionGroups} />
        ) : (
          <DemoPlaceholderSection id="demo-instituicoes" eyebrow="Instituições" title="Instituições que conectam a rede">
            <p>
              Vínculos, categorias e logotipos oficiais aguardam confirmação. Categorias sugeridas pelo briefing:
              universidades e instituições de pesquisa; apoio institucional e financiamento; parceiros
              empresariais; cooperação internacional. Os logotipos recortados do mockup não foram usados (cortados
              ou com letras deformadas). Enquanto não houver instituição publicada, a seção não aparece no site.
            </p>
          </DemoPlaceholderSection>
        )}

        <CooperationCta content={content} />
        <DemoNote state={hasContact || socialLinks.length > 0 ? "published" : "pending"}>
          {hasContact || socialLinks.length > 0
            ? "Rodapé com os contatos e redes sociais cadastrados em Configurações."
            : "Rodapé sem contatos nem redes sociais: e-mail, localização e perfis oficiais ainda não foram informados (Configurações e Redes sociais)."}
        </DemoNote>
      </PublicShell>
    </>
  );
}
