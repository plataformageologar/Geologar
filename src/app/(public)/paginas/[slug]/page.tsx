import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageSections } from "@/components/site/page-sections";
import { PageHeader } from "@/components/ui/page-header";
import { getSectionsData } from "@/lib/queries/homepage";
import { getPublishedCustomPage } from "@/lib/queries/editorial";
import { isValidSlug, resolveImageSrc } from "@/lib/queries/shared";

export const dynamic = "force-dynamic";

/**
 * Página personalizada publicada (Etapa 9.6). Lida pelo cliente anônimo: só
 * páginas com status "published" existem aqui; rascunhos, páginas arquivadas
 * e endereços desconhecidos dão 404. Rascunhos nunca são consultados.
 */

async function loadPage(params: Promise<{ slug: string }>) {
  const { slug } = await params;
  if (!isValidSlug(slug) || slug.length > 100) return null;
  return getPublishedCustomPage(slug);
}

export async function generateMetadata({ params }: PageProps<"/paginas/[slug]">): Promise<Metadata> {
  const page = await loadPage(params);
  if (!page) return {};
  const title = page.content.seo_title ?? page.content.title ?? "Página";
  const description = page.content.seo_description ?? page.content.description ?? undefined;
  const image = resolveImageSrc(page.content.seo_image_path);
  return {
    title,
    description,
    alternates: { canonical: `/paginas/${page.slug}` },
    ...(image ? { openGraph: { title, description, images: [{ url: image }] } } : {}),
  };
}

export default async function CustomPage({ params }: PageProps<"/paginas/[slug]">) {
  const page = await loadPage(params);
  if (!page) notFound();

  // Blocos de página personalizada não usam linhas de pesquisa (limite mínimo).
  const data = await getSectionsData({ researchLineLimit: 1 });
  const title = page.content.title ?? "Página";

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: "Início", href: "/" }, { label: title }]}
        eyebrow={page.content.eyebrow ?? undefined}
        title={title}
        description={page.content.description}
      />
      <PageSections
        page="custom"
        sections={page.sections.map((section) => ({ ...section, key: section.id, is_visible: true }))}
        data={data}
      />
    </>
  );
}
