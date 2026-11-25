"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";

import { InstitutionLogo } from "@/components/institutions/institution-logo";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { ProjectCard } from "@/components/projects/project-card";
import { PublicationItem } from "@/components/publications/publication-item";
import { ResearchLineCard } from "@/components/research/research-line-card";
import { researchLineIcon, researchLineTint } from "@/components/research/research-line-icons";
import { renderSection, SectionPair, sectionHasContent, type SectionsData } from "@/components/site/page-sections";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { resolveImageSrc } from "@/lib/queries/shared";
import { SECTION_ANCHORS, withAvailableHeroLinks } from "@/lib/site/anchors";
import { appearanceCss, DEFAULT_APPEARANCE } from "@/lib/site/appearance";
import { groupSections } from "@/lib/site/section-pairs";
import {
  draftHomepageContent,
  draftNavigation,
  draftPillars,
  draftSiteSettings,
  EDITOR_MESSAGE,
  editorKey,
  sectionTarget,
  targetLabel,
  type CanvasState,
  type EditorTarget,
  type FromCanvasMessage,
  type RecordRef,
} from "@/lib/site/editor-document";
import { resolvePageHeader, type PageContentKey, type PageContentValues } from "@/lib/site/page-content";
import { isRemovableSection, SECTION_LABELS, type SectionDraft } from "@/lib/site/sections";
import type { HomepageContent } from "@/types/content";

/**
 * Tela do editor visual (dentro do iframe). Renderiza os componentes públicos
 * a partir do rascunho recebido do editor; cliques selecionam elementos e
 * nunca navegam. Só aceita mensagens da janela pai na mesma origem.
 */

const CANVAS_CSS = `
[data-edit-target]{position:relative;cursor:pointer}
[data-edit-target]::after{content:"";position:absolute;inset:0;pointer-events:none;z-index:45;transition:outline-color .12s}
[data-edit-target]:hover::after{outline:2px dashed #1f6fb2;outline-offset:-3px;box-shadow:inset 0 0 0 3px rgb(255 255 255/.85)}
[data-edit-target][data-selected]::after{outline:3px solid #1f6fb2;outline-offset:-3px;box-shadow:inset 0 0 0 5px rgb(255 255 255/.9)}
[data-edit-target] a,[data-edit-target] button{cursor:pointer}
`;

function post(message: FromCanvasMessage) {
  window.parent.postMessage(message, window.location.origin);
}

function recordFrom(element: Element, sectionType: string | null): RecordRef | null {
  const experience = element.closest("[data-experience-id]")?.getAttribute("data-experience-id");
  if (experience) return { kind: "experience", id: experience };

  const anchor = element.closest("a");
  const href = anchor?.getAttribute("href") ?? "";
  const detail = /^\/(projetos|pesquisa)\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(href);
  if (detail) return { kind: detail[1] === "projetos" ? "project" : "research-line", slug: detail[2] };

  const item = element.closest("li");
  if (!item) return null;
  if (sectionType === "publications" || sectionType === "publicacoes") {
    const title = item.querySelector("h2, h3, h4")?.textContent?.trim();
    return title ? { kind: "publication", title: title.slice(0, 300) } : null;
  }
  if (sectionType === "institutions" || sectionType === "logos" || sectionType === "instituicoes") {
    const title = (item.querySelector("img")?.getAttribute("alt") || item.textContent || "").trim();
    return title ? { kind: "institution", title: title.slice(0, 300) } : null;
  }
  return null;
}

function Target({
  id,
  label,
  type,
  selected,
  hidden,
  className,
  children,
}: {
  id: EditorTarget;
  label: string;
  type?: string;
  selected: boolean;
  hidden?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div data-edit-target={id} data-edit-type={type} data-selected={selected || undefined} className={className}>
      {(selected || hidden) && (
        <span className="pointer-events-none absolute top-3 left-3 z-50 flex flex-wrap gap-1.5">
          {selected && (
            <span className="rounded-md bg-[#1f6fb2] px-2 py-1 text-caption font-semibold text-white shadow ring-2 ring-white">
              {label}
            </span>
          )}
          {hidden && (
            <span className="rounded-md border border-border bg-surface px-2 py-1 text-caption font-semibold text-foreground shadow">
              Oculta no site
            </span>
          )}
        </span>
      )}
      <div className={hidden ? "opacity-45 grayscale" : undefined}>{children}</div>
    </div>
  );
}

function Placeholder({ title, text }: { title: string; text: string }) {
  return (
    <Container className="py-8">
      <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border bg-surface/60 p-8 text-center">
        <p className="text-label">{title}</p>
        <p className="max-w-xl text-body-sm text-muted-foreground">{text}</p>
      </div>
    </Container>
  );
}

function pageHeaderProps(
  key: PageContentKey | "custom",
  values: PageContentValues | null,
  homepage: HomepageContent,
  label: string,
) {
  const value = (field: "eyebrow" | "title" | "description") => values?.[field]?.trim() || null;
  // Página personalizada: o título é obrigatório e não há texto padrão.
  if (key === "custom") {
    return { eyebrow: value("eyebrow") ?? undefined, title: value("title") ?? label, description: value("description") };
  }
  return resolvePageHeader(key, { eyebrow: value("eyebrow"), title: value("title"), description: value("description") }, homepage);
}

function ListBody({ state }: { state: CanvasState }) {
  const { page, render } = state;
  if (page.kind !== "list") return null;
  const note = (
    <p className="mb-6 rounded-xl border border-dashed border-border bg-surface px-4 py-3 text-body-sm text-muted-foreground">
      Pré-visualização simplificada: a lista vem dos registros publicados e é editada nos módulos do CMS. Filtros e
      paginação aparecem só no site.
    </p>
  );
  switch (page.key) {
    case "pesquisa":
      return (
        <Container className="section-y" data-edit-type="pesquisa">
          {note}
          {render.researchLines.length ? (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {render.researchLines.map((line, index) => (
                <li key={line.slug}>
                  <ResearchLineCard
                    researchLine={line}
                    icon={researchLineIcon(line.slug)}
                    tint={researchLineTint(index)}
                    href={`/pesquisa/${line.slug}`}
                    headingLevel="h2"
                  />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Nenhuma linha de pesquisa publicada no momento." />
          )}
        </Container>
      );
    case "projetos":
      return (
        <Container className="section-y">
          {note}
          {render.projects.length ? (
            <ul className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
              {render.projects.map((project) => (
                <li key={project.slug}>
                  <ProjectCard project={project} href={`/projetos/${project.slug}`} headingLevel="h2" />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Nenhum projeto publicado no momento." />
          )}
        </Container>
      );
    case "publicacoes":
      return (
        <Container className="section-y">
          {note}
          {render.publications.length ? (
            <ul className="divide-y divide-border border-b border-border">
              {render.publications.map((publication) => (
                <li key={publication.slug}>
                  <PublicationItem publication={publication} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Nenhuma publicação disponível no momento." />
          )}
        </Container>
      );
    case "instituicoes":
      return (
        <Container className="section-y">
          {note}
          {render.institutionGroups.length ? (
            <div className="flex flex-col gap-10">
              {render.institutionGroups.map((group) => (
                <div key={group.category.slug} className="flex flex-col gap-4">
                  <h2 className="text-h3">{group.category.name}</h2>
                  <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {group.institutions.map((institution) => (
                      <li key={institution.id}>
                        <InstitutionLogo institution={institution} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Nenhuma instituição publicada no momento." />
          )}
        </Container>
      );
  }
}

function CanvasContent({ state }: { state: CanvasState }) {
  const { page, draft, render, selected, sectionPage } = state;
  const settings = draftSiteSettings(draft.settings);
  const pillars = draftPillars(draft.pillars);
  const homepage = draftHomepageContent(draft.homepage);
  const data: SectionsData = { ...render, homepage, pillars };
  const sections: SectionDraft[] = draft.sections ?? [];

  // Mesma regra do site: CTAs do banner para seções ausentes não aparecem.
  const anchors = new Set<string>();
  if (sectionPage === "home") {
    for (const section of sections) {
      const anchor = SECTION_ANCHORS[section.section_type];
      if (anchor && section.is_visible && sectionHasContent("home", { ...section }, data)) anchors.add(anchor);
    }
  }
  const sectionData = sectionPage === "home" ? { ...data, homepage: withAvailableHeroLinks(homepage, anchors) } : data;
  const isSelected = (target: EditorTarget) => selected === target;

  const pageKey: PageContentKey | "custom" | null =
    page.kind === "rede" ? "rede" : page.kind === "list" ? page.key : page.kind === "custom" ? "custom" : null;

  return (
    <>
      <style>{CANVAS_CSS}</style>
      <style>{appearanceCss(draft.appearance ?? DEFAULT_APPEARANCE)}</style>
      <Target
        id="header"
        label="Cabeçalho"
        selected={isSelected("header")}
        className="sticky top-0 z-40 lg:top-[calc(var(--header-top-height)*-1)]"
      >
        <Header
          navigation={draftNavigation(draft.navHeader)}
          siteName={settings.site_name}
          institutionalName={settings.institutional_name}
          logoSrc={resolveImageSrc(settings.logo_path)}
          headerStyle={settings.header_style}
        />
      </Target>

      <main id="conteudo" className="flex-1">
        {pageKey && (
          <Target id="page-header" label="Título da página" selected={isSelected("page-header")}>
            <PageHeader
              breadcrumb={[{ label: "Início", href: "/" }, { label: page.label }]}
              {...pageHeaderProps(pageKey, draft.pageContent, homepage, page.label)}
            />
          </Target>
        )}

        {sectionPage &&
          groupSections(
            sections,
            (section) => section.is_visible && sectionHasContent(sectionPage, section, sectionData, true),
          ).map((unit) => {
            const renderTarget = (section: (typeof sections)[number], paired: boolean) => {
              const target = sectionTarget(section.key);
              const label = targetLabel(target, sections);
              const hasContent = sectionHasContent(sectionPage, section, sectionData, true);
              return (
                <Target
                  id={target}
                  label={label}
                  type={section.section_type}
                  selected={isSelected(target)}
                  hidden={!section.is_visible}
                  className={paired ? "relative min-w-0" : undefined}
                >
                  {hasContent ? (
                    renderSection(sectionPage, section, sectionData, true, paired)
                  ) : (
                    <Placeholder
                      title={`${SECTION_LABELS[section.section_type]} sem conteúdo`}
                      text={
                        isRemovableSection(section.section_type)
                          ? "Preencha o bloco no painel. Enquanto estiver vazio, ele não aparece no site."
                          : "Não há conteúdo publicado para esta seção. Ela não aparece no site até que haja."
                      }
                    />
                  )}
                </Target>
              );
            };
            return unit.kind === "pair" ? (
              <SectionPair
                key={`${unit.left.key}+${unit.right.key}`}
                settings={unit.left.settings}
                left={renderTarget(unit.left, true)}
                right={renderTarget(unit.right, true)}
              />
            ) : (
              <Fragment key={unit.section.key}>{renderTarget(unit.section, false)}</Fragment>
            );
          })}

        {page.kind === "list" && <ListBody state={state} />}
      </main>

      <Target id="footer" label="Rodapé" selected={isSelected("footer")}>
        <Footer
          settings={settings}
          navigation={draftNavigation(draft.navFooter)}
          usefulLinks={draftNavigation(draft.navUseful)}
          socialLinks={render.socialLinks}
          editing
        />
      </Target>
    </>
  );
}

export function EditorCanvas() {
  const [state, setState] = useState<CanvasState | null>(null);
  const lastScrolled = useRef<string | null>(null);

  // Recebe o estado do editor (mesma origem e janela pai apenas). Avisa que
  // está pronta até receber o primeiro estado (o editor pode carregar depois).
  useEffect(() => {
    if (window.parent === window) return;
    let received = false;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      const message = event.data as { source?: unknown; type?: unknown; state?: CanvasState } | null;
      if (!message || message.source !== EDITOR_MESSAGE || message.type !== "state" || !message.state) return;
      received = true;
      setState(message.state);
    };
    window.addEventListener("message", onMessage);
    const announce = () => {
      if (!received) post({ source: EDITOR_MESSAGE, type: "ready" });
    };
    announce();
    const timer = window.setInterval(() => {
      if (received) window.clearInterval(timer);
      else announce();
    }, 400);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("message", onMessage);
    };
  }, []);

  // Cliques selecionam; nenhum link, botão ou formulário funciona na tela.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const element = event.target instanceof Element ? event.target : null;
      event.preventDefault();
      event.stopPropagation();
      const target = element?.closest("[data-edit-target]");
      const id = target?.getAttribute("data-edit-target");
      if (!element || !target || !id) return;
      const type = target.getAttribute("data-edit-type") ?? element.closest("[data-edit-type]")?.getAttribute("data-edit-type") ?? null;
      post({ source: EDITOR_MESSAGE, type: "select", target: id as EditorTarget, record: recordFrom(element, type) });
    };
    const block = (event: Event) => event.preventDefault();
    // Atalhos (desfazer, refazer, salvar, Esc) seguem para o editor.
    const onKey = (event: KeyboardEvent) => {
      const key = editorKey(event);
      if (!key) return;
      event.preventDefault();
      post({ source: EDITOR_MESSAGE, type: "key", key });
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("auxclick", block, true);
    document.addEventListener("submit", block, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("auxclick", block, true);
      document.removeEventListener("submit", block, true);
    };
  }, []);

  // Seleção feita pelo painel: rola até o elemento.
  useEffect(() => {
    if (!state?.scroll || !state.selected) return;
    if (lastScrolled.current === state.selected) return;
    lastScrolled.current = state.selected;
    document
      .querySelector(`[data-edit-target="${CSS.escape(state.selected)}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [state]);

  useEffect(() => {
    if (!state?.scroll) lastScrolled.current = null;
  }, [state]);

  if (!state) {
    return (
      <p className="m-auto p-8 text-body-sm text-muted-foreground" role="status">
        Carregando a página…
      </p>
    );
  }
  return <CanvasContent state={state} />;
}
