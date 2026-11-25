"use client";

import { ArrowLeft, ExternalLink, Plus } from "lucide-react";
import { useState, type ReactNode } from "react";

import { moveItem, newKey } from "@/lib/site/lists";
import {
  sectionTarget,
  targetLabel,
  targetSectionKey,
  type DraftSlice,
  type EditorDocument,
  type EditorDraft,
  type EditorErrors,
  type EditorTarget,
  type RecordRef,
} from "@/lib/site/editor-document";
import { PAGE_CONTENT_LABELS } from "@/lib/site/page-content";
import {
  addableSectionTypes,
  BLOCK_DESCRIPTIONS,
  isBlockType,
  isRemovableSection,
  newBlockSettings,
  SECTION_LABELS,
  SECTIONS_MAX,
  type AddableSectionType,
  type SectionDraft,
} from "@/lib/site/sections";
import { cn } from "@/lib/utils/cn";

import { Field, FormMessage, Select } from "../form-controls";
import { AppearanceFields } from "../site/appearance-fields";
import { HiddenBadge, ItemToolbar } from "../site/list-controls";
import { NavigationFields } from "../site/navigation-fields";
import { PageContentFields } from "../site/page-content-fields";
import { PillarsFields } from "../site/pillars-fields";
import { SectionSettingsFields } from "../site/section-settings-fields";
import { CONTENT_NOTES } from "../site/sections-fields";
import { FooterSettingsFields, HeaderSettingsFields, HomepageGroupFields } from "./editor-fields";

/**
 * Painel de propriedades do editor visual: mostra os campos do elemento
 * selecionado (ou a estrutura da página) com os mesmos componentes das
 * telas do CMS. Todas as mudanças vão para o rascunho; nada é gravado aqui.
 */

export type PanelProps = {
  doc: EditorDocument;
  draft: EditorDraft;
  saved: EditorDraft;
  errors: EditorErrors;
  selected: EditorTarget | null;
  record: RecordRef | null;
  disabled: boolean;
  onChange: <S extends DraftSlice>(slice: S, value: EditorDraft[S], group: string) => void;
  onSelect: (target: EditorTarget | null) => void;
  headingRef: React.Ref<HTMLHeadingElement>;
};

const ADMIN_ONLY = "Somente administradores alteram esta parte do site. Você pode visualizar o resultado aqui.";

function CmsLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className="inline-flex min-h-11 items-center gap-2 text-label text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
    >
      {children}
      <ExternalLink aria-hidden="true" className="size-4" />
      <span className="sr-only">(abre em nova aba)</span>
    </a>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-border pt-5">
      <h3 className="text-label uppercase tracking-[0.08em] text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

/** Link do CMS para o elemento selecionado (ou a página). */
export function cmsHrefFor(doc: EditorDocument, target: EditorTarget | null, sections: SectionDraft[] | null) {
  // Página personalizada: tudo dela fica na tela da própria página.
  const customHref = doc.customPage ? `/admin/paginas/${doc.customPage.id}` : null;
  if (target === "header") return doc.role === "admin" ? "/admin/navegacao" : "/admin/configuracoes";
  if (target === "footer") return "/admin/configuracoes";
  if (target === "appearance") return "/admin/aparencia";
  if (target === "page-header" && doc.pageContentKey) {
    return customHref ?? `/admin/textos-das-paginas?pagina=${doc.pageContentKey}`;
  }
  const key = targetSectionKey(target);
  const section = key ? sections?.find((item) => item.key === key) : undefined;
  if (section) {
    if (["hero", "about", "cooperation"].includes(section.section_type)) return "/admin/homepage";
    if (section.section_type === "pillars") return "/admin/pilares";
    if (section.section_type === "experiences") return "/admin/experiencias";
    return customHref ?? `/admin/secoes?pagina=${doc.sectionPage ?? "home"}`;
  }
  if (doc.detail) return doc.detail.editHref;
  if (doc.page.kind === "home") return "/admin/homepage";
  if (doc.page.kind === "rede") return "/admin/secoes?pagina=rede";
  if (customHref) return customHref;
  if (doc.pageContentKey) return `/admin/textos-das-paginas?pagina=${doc.pageContentKey}`;
  return "/admin";
}

function recordLink(doc: EditorDocument, record: RecordRef): { label: string; href: string } | null {
  switch (record.kind) {
    case "project": {
      const id = doc.records.projects[record.slug];
      return id ? { label: "Editar este projeto no CMS", href: `/admin/projetos/${id}/editar` } : null;
    }
    case "research-line": {
      const id = doc.records.researchLines[record.slug];
      return id ? { label: "Editar esta linha de pesquisa no CMS", href: `/admin/linhas-de-pesquisa/${id}/editar` } : null;
    }
    case "publication":
      return {
        label: "Encontrar esta publicação no CMS",
        href: `/admin/publicacoes?busca=${encodeURIComponent(record.title.slice(0, 100))}`,
      };
    case "institution":
      return {
        label: "Encontrar esta instituição no CMS",
        href: `/admin/instituicoes?busca=${encodeURIComponent(record.title.slice(0, 100))}`,
      };
    case "experience":
      // Editada no próprio painel (o card clicado abre na lista abaixo).
      return null;
  }
}

function AddBlock({
  props,
  sections,
}: {
  props: PanelProps;
  sections: SectionDraft[];
}) {
  const [chosen, setType] = useState<AddableSectionType>("text");
  const addable = addableSectionTypes(props.doc.sectionPage ?? "home", sections);
  const type = addable.includes(chosen) ? chosen : addable[0];
  const full = sections.length >= SECTIONS_MAX;
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-border p-4">
      <Field id="editor-novo-bloco" label="Adicionar bloco" hint={BLOCK_DESCRIPTIONS[type]}>
        <Select
          id="editor-novo-bloco"
          value={type}
          disabled={props.disabled}
          aria-describedby="editor-novo-bloco-hint"
          onChange={(event) => {
            const option = addable.find((item) => item === event.target.value);
            if (option) setType(option);
          }}
        >
          {addable.map((option) => (
            <option key={option} value={option}>
              {SECTION_LABELS[option]}
            </option>
          ))}
        </Select>
      </Field>
      <button
        type="button"
        disabled={props.disabled || full}
        onClick={() => {
          const key = newKey(type === "experiences" ? "experiencias" : "bloco");
          const section: SectionDraft = { id: null, key, section_type: type, is_visible: true, settings: newBlockSettings(type) };
          // Experiências entram logo abaixo do banner (quando há banner).
          const heroIndex = type === "experiences" ? sections.findIndex((item) => item.section_type === "hero") : -1;
          props.onChange(
            "sections",
            heroIndex >= 0
              ? [...sections.slice(0, heroIndex + 1), section, ...sections.slice(heroIndex + 1)]
              : [...sections, section],
            `add:${key}`,
          );
          props.onSelect(sectionTarget(key));
        }}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-label text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
      >
        <Plus aria-hidden="true" className="size-4" />
        {type === "experiences" ? "Adicionar abaixo do banner" : "Adicionar no fim da página"}
      </button>
      {full && <p className="text-caption text-muted-foreground">A página atingiu o limite de {SECTIONS_MAX} seções.</p>}
    </div>
  );
}

function StructureView(props: PanelProps) {
  const { doc, draft, onSelect, errors } = props;
  const sections = draft.sections ?? [];
  const item = (target: EditorTarget, label: string, extra?: ReactNode, invalid?: boolean) => (
    <li key={target}>
      <button
        type="button"
        onClick={() => onSelect(target)}
        className={cn(
          "flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border bg-surface px-3 py-2 text-left text-body-sm hover:border-primary/50",
          invalid ? "border-danger" : "border-border",
        )}
      >
        <span className="font-semibold">{label}</span>
        <span className="flex items-center gap-2">
          {invalid && <span className="text-caption font-semibold text-danger">Revisar</span>}
          {extra}
        </span>
      </button>
    </li>
  );

  if (doc.detail !== null || doc.page.kind === "project" || doc.page.kind === "research-line") {
    return (
      <div className="flex flex-col gap-4">
        {doc.detail ? (
          <>
            <p className="text-body-sm">
              <strong className="font-semibold">{doc.detail.title}</strong>
              {doc.detail.published ? " está publicado." : " é um rascunho (não aparece no site)."}
            </p>
            <p className="text-body-sm text-muted-foreground">
              O conteúdo desta página (textos, imagens, vínculos e publicação) é editado no formulário do registro, com
              validação completa e histórico de publicação.
            </p>
            <CmsLink href={doc.detail.editHref}>Editar no CMS</CmsLink>
          </>
        ) : (
          <FormMessage tone="warning">Registro não encontrado. Ele pode ter sido excluído ou o endereço mudou.</FormMessage>
        )}
        <p className="text-caption text-muted-foreground">
          Cabeçalho, rodapé e aparência são editados abrindo a página inicial no editor.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-body-sm text-muted-foreground">
        Clique em um elemento da página ou escolha abaixo. As mudanças aparecem na tela na hora e só valem no site depois de
        salvar.
      </p>
      <ol className="flex flex-col gap-2">
        {item("header", "Cabeçalho", undefined, Boolean(errors.navHeader))}
        {doc.pageContentKey && item("page-header", "Título da página", undefined, Boolean(errors.pageContent))}
        {sections.map((section) =>
          item(
            sectionTarget(section.key),
            targetLabel(sectionTarget(section.key), sections) +
              (isRemovableSection(section.section_type) && section.settings.title ? `: ${section.settings.title}` : ""),
            !section.is_visible ? <HiddenBadge /> : undefined,
            Boolean(errors.sections?.[section.key]),
          ),
        )}
        {item("footer", "Rodapé", undefined, Boolean(errors.navFooter || errors.navUseful))}
      </ol>
      {doc.editable.sections && <AddBlock props={props} sections={sections} />}
      {doc.role === "admin" && (
        <button
          type="button"
          onClick={() => onSelect("appearance")}
          className={cn(
            "inline-flex min-h-11 items-center justify-center rounded-xl border px-4 text-label hover:border-primary/50",
            errors.appearance ? "border-danger" : "border-border",
          )}
        >
          Aparência do site (cores, botões e fontes)
        </button>
      )}
    </div>
  );
}

function SectionView({ props, section, index }: { props: PanelProps; section: SectionDraft; index: number }) {
  const { doc, draft, errors, disabled, onChange, onSelect, record } = props;
  const sections = draft.sections ?? [];
  const label = SECTION_LABELS[section.section_type];
  const editable = doc.editable.sections;
  const updateSection = (patch: Partial<SectionDraft>, group: string) =>
    onChange(
      "sections",
      sections.map((item) => (item.key === section.key ? { ...item, ...patch } : item)),
      `${section.key}:${group}`,
    );
  const homepageGroup =
    section.section_type === "hero" || section.section_type === "about" || section.section_type === "cooperation"
      ? section.section_type
      : null;
  const note = CONTENT_NOTES[section.section_type];
  const link = record ? recordLink(doc, record) : null;

  return (
    <div className="flex flex-col gap-5">
      {!section.is_visible && (
        <FormMessage tone="info">Esta seção está oculta: aparece aqui esmaecida, mas não no site.</FormMessage>
      )}
      {editable && (
        <ItemToolbar
          label={label}
          index={index}
          count={sections.length}
          disabled={disabled}
          onMove={(offset) => onChange("sections", moveItem(sections, index, offset), `${section.key}:move`)}
          visible={section.is_visible}
          onToggleVisible={() => updateSection({ is_visible: !section.is_visible }, "visible")}
          onDuplicate={
            isBlockType(section.section_type) && sections.length < SECTIONS_MAX
              ? () => {
                  const key = newKey("bloco");
                  const copy = { ...section, id: null, key, settings: structuredClone(section.settings) };
                  onChange("sections", [...sections.slice(0, index + 1), copy, ...sections.slice(index + 1)], `dup:${key}`);
                  onSelect(sectionTarget(key));
                }
              : undefined
          }
          onRemove={
            isRemovableSection(section.section_type)
              ? () => {
                  onChange(
                    "sections",
                    sections.filter((item) => item.key !== section.key),
                    `remove:${section.key}`,
                  );
                  onSelect(null);
                }
              : undefined
          }
          removeWarning={
            section.section_type === "experiences"
              ? "Excluir a seção e todas as experiências? Imagens continuam na biblioteca."
              : "Excluir o bloco? Imagens continuam na biblioteca."
          }
        />
      )}

      {link && (
        <div className="flex flex-col gap-1 rounded-xl border border-primary/30 bg-primary-soft p-4">
          <p className="text-body-sm">Você clicou em um registro. O conteúdo dele é editado no CMS:</p>
          <CmsLink href={link.href}>{link.label}</CmsLink>
        </div>
      )}

      {homepageGroup && draft.homepage && (
        <Group title="Conteúdo">
          {!doc.editable.homepage && <FormMessage tone="warning">Não foi possível carregar os textos da homepage.</FormMessage>}
          <HomepageGroupFields
            group={homepageGroup}
            values={draft.homepage}
            onChange={(values) => onChange("homepage", values, `homepage:${homepageGroup}`)}
            errors={errors.homepage}
            disabled={disabled || !doc.editable.homepage}
          />
        </Group>
      )}

      {(section.section_type === "about" || section.section_type === "pillars") && draft.pillars && (
        <Group title="Pilares da rede">
          <p className="text-caption text-muted-foreground">Os mesmos pilares aparecem na página inicial e em A Rede.</p>
          <PillarsFields
            items={draft.pillars}
            onChange={(items) => onChange("pillars", items, "pillars")}
            errors={errors.pillars}
            disabled={disabled || !doc.editable.pillars}
          />
        </Group>
      )}

      {note && !homepageGroup && section.section_type !== "pillars" && (
        <p className="text-body-sm text-muted-foreground">
          {note.text} <CmsLink href={note.href}>Gerenciar registros</CmsLink>
        </p>
      )}

      {editable && (
        <Group
          title={
            isBlockType(section.section_type)
              ? "Bloco"
              : section.section_type === "experiences"
                ? "Seção e experiências"
                : "Apresentação da seção"
          }
        >
          <SectionSettingsFields
            idPrefix={`editor-${section.key}`}
            type={section.section_type}
            settings={section.settings}
            onChange={(settings) => updateSection({ settings }, "settings")}
            errors={errors.sections?.[section.key]}
            disabled={disabled}
            canUpload
            institutions={doc.institutionOptions}
            focusExperienceId={record?.kind === "experience" ? record.id : null}
          />
        </Group>
      )}
    </div>
  );
}

export function PropertiesPanel(props: PanelProps) {
  const { doc, draft, saved, errors, selected, disabled, onChange, onSelect, headingRef } = props;
  const sections = draft.sections ?? [];
  const key = targetSectionKey(selected);
  const sectionIndex = key ? sections.findIndex((item) => item.key === key) : -1;
  const section = sectionIndex >= 0 ? sections[sectionIndex] : null;
  const title = selected
    ? section && isRemovableSection(section.section_type) && section.settings.title
      ? `${SECTION_LABELS[section.section_type]}: ${section.settings.title}`
      : targetLabel(selected, sections)
    : doc.page.kind === "project" || doc.page.kind === "research-line"
      ? doc.page.label
      : "Estrutura da página";

  let body: ReactNode;
  if (!selected) body = <StructureView {...props} />;
  else if (section) body = <SectionView props={props} section={section} index={sectionIndex} />;
  else if (selected === "header") {
    body =
      doc.editable.settings && draft.settings ? (
        <div className="flex flex-col gap-5">
          <HeaderSettingsFields
            values={draft.settings}
            saved={saved.settings}
            onChange={(values) => onChange("settings", values, "settings:header")}
            errors={errors.settings}
            disabled={disabled}
          />
          {draft.navHeader && doc.editable.navHeader && (
            <Group title="Menu principal">
              <NavigationFields
                location="header"
                items={draft.navHeader}
                onChange={(items) => onChange("navHeader", items, "navHeader")}
                errors={errors.navHeader}
                disabled={disabled}
              />
            </Group>
          )}
        </div>
      ) : (
        <FormMessage tone="info">{ADMIN_ONLY}</FormMessage>
      );
  } else if (selected === "footer") {
    body =
      doc.editable.settings && draft.settings ? (
        <div className="flex flex-col gap-5">
          <FooterSettingsFields
            values={draft.settings}
            saved={saved.settings}
            onChange={(values) => onChange("settings", values, "settings:footer")}
            errors={errors.settings}
            disabled={disabled}
          />
          {draft.navFooter && doc.editable.navFooter && (
            <Group title="Links do rodapé">
              <NavigationFields
                location="footer"
                items={draft.navFooter}
                onChange={(items) => onChange("navFooter", items, "navFooter")}
                errors={errors.navFooter}
                disabled={disabled}
              />
            </Group>
          )}
          {draft.navUseful && doc.editable.navUseful && (
            <Group title="Links úteis">
              <NavigationFields
                location="useful"
                items={draft.navUseful}
                onChange={(items) => onChange("navUseful", items, "navUseful")}
                errors={errors.navUseful}
                disabled={disabled}
              />
            </Group>
          )}
          <Group title="Redes sociais">
            <p className="text-body-sm text-muted-foreground">
              Os perfis exibidos no rodapé são gerenciados em <CmsLink href="/admin/redes-sociais">Redes sociais</CmsLink>
            </p>
          </Group>
        </div>
      ) : (
        <FormMessage tone="info">{ADMIN_ONLY}</FormMessage>
      );
  } else if (selected === "page-header" && doc.pageContentKey) {
    body =
      draft.pageContent && doc.editable.pageContent ? (
        <PageContentFields
          page={doc.pageContentKey}
          values={draft.pageContent}
          onChange={(values) => onChange("pageContent", values, "pageContent")}
          errors={errors.pageContent}
          disabled={disabled}
          canUpload
        />
      ) : (
        <FormMessage tone="warning">
          Os textos de {doc.pageContentKey === "custom" ? doc.page.label : PAGE_CONTENT_LABELS[doc.pageContentKey].label} não
          puderam ser carregados. Recarregue a página.
        </FormMessage>
      );
  } else if (selected === "appearance") {
    body =
      doc.editable.appearance && draft.appearance ? (
        <div className="flex flex-col gap-4">
          <FormMessage tone="info">Vale para todo o site depois de publicar. Confira em mais de uma página antes.</FormMessage>
          <AppearanceFields
            values={draft.appearance}
            onChange={(values) => onChange("appearance", values, "appearance")}
            errors={errors.appearance}
            disabled={disabled}
          />
        </div>
      ) : (
        <FormMessage tone="info">{ADMIN_ONLY}</FormMessage>
      );
  } else {
    body = <FormMessage tone="info">O elemento selecionado não existe mais.</FormMessage>;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        {selected && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="inline-flex min-h-11 w-fit items-center gap-2 text-label text-primary"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Estrutura da página
          </button>
        )}
        <h2 ref={headingRef} tabIndex={-1} className="text-h4 font-sans focus:outline-none">
          {title}
        </h2>
        {selected && (
          <CmsLink href={cmsHrefFor(doc, selected, sections)}>Abrir no CMS</CmsLink>
        )}
      </div>
      {body}
    </div>
  );
}
