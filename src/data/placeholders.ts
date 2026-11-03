/**
 * Conteúdo PROVISÓRIO, apenas para avaliar o layout no ambiente de revisão.
 * Os textos são genéricos de propósito e não representam projetos,
 * publicações ou instituições reais.
 *
 * Exibido somente em desenvolvimento ou com SHOW_CONTENT_PLACEHOLDERS=true;
 * em produção as seções recebem listas vazias.
 */
import type {
  InstitutionGroup,
  ProjectSummary,
  PublicationSummary,
} from "@/types/content";

export const showContentPlaceholders =
  process.env.NODE_ENV === "development" ||
  process.env.SHOW_CONTENT_PLACEHOLDERS === "true";

const placeholderProjects: ProjectSummary[] = [
  {
    slug: "projeto-exemplo-1",
    title: "Título do projeto em destaque",
    short_description:
      "Descrição curta e compreensível do projeto, com o objetivo e o contexto da pesquisa.",
    image_path: null,
    image_alt: null,
    project_status: "ongoing",
    result_or_contribution:
      "Resultado, contribuição ou objetivo concreto do projeto.",
  },
  {
    slug: "projeto-exemplo-2",
    title: "Título de um projeto com nome mais longo para testar quebras de linha",
    short_description:
      "Descrição curta do projeto. Este texto é um exemplo para avaliação do layout.",
    image_path: null,
    image_alt: null,
    project_status: "completed",
    result_or_contribution:
      "Principal resultado documentado do projeto concluído.",
  },
  {
    slug: "projeto-exemplo-3",
    title: "Título do projeto",
    short_description:
      "Descrição curta do projeto, apresentando o tema em linguagem acessível.",
    image_path: null,
    image_alt: null,
    project_status: "ongoing",
    result_or_contribution: null,
  },
];

const placeholderPublications: PublicationSummary[] = [
  {
    slug: "publicacao-exemplo-1",
    title:
      "Título completo da publicação no idioma original, com extensão semelhante à de um artigo científico",
    authors: "Sobrenome, A.; Sobrenome, B.; Sobrenome, C.",
    publication_venue: "Nome do periódico",
    publication_year: 2026,
    doi: null,
    external_url: null,
  },
  {
    slug: "publicacao-exemplo-2",
    title: "Título completo da publicação no idioma original",
    authors: "Sobrenome, A.; Sobrenome, D.",
    publication_venue: "Nome do periódico ou evento",
    publication_year: 2025,
    doi: null,
    external_url: null,
  },
  {
    slug: "publicacao-exemplo-3",
    title:
      "Título de publicação com subtítulo: exemplo para avaliar a leitura de títulos longos em diferentes larguras de tela",
    authors: "Sobrenome, E.",
    publication_venue: "Nome do periódico",
    publication_year: 2025,
    doi: null,
    external_url: null,
  },
];

const placeholderInstitution = (id: string) => ({
  id,
  name: "Instituição parceira",
  acronym: null,
  logo_path: null,
  logo_alt: null,
  website_url: null,
});

// Categorias previstas no planejamento; ainda não validadas formalmente.
const placeholderInstitutionGroups: InstitutionGroup[] = [
  {
    category: {
      slug: "universidades-e-instituicoes-de-pesquisa",
      name: "Universidades e instituições de pesquisa",
    },
    institutions: ["u1", "u2", "u3", "u4", "u5", "u6"].map(placeholderInstitution),
  },
  {
    category: {
      slug: "apoio-institucional-e-financiamento",
      name: "Apoio institucional e financiamento",
    },
    institutions: ["a1", "a2", "a3"].map(placeholderInstitution),
  },
  {
    category: { slug: "parceiros-empresariais", name: "Parceiros empresariais" },
    institutions: ["e1", "e2"].map(placeholderInstitution),
  },
  {
    category: {
      slug: "cooperacao-internacional",
      name: "Cooperação internacional",
    },
    institutions: ["i1", "i2", "i3"].map(placeholderInstitution),
  },
];

export const featuredProjects = showContentPlaceholders ? placeholderProjects : [];
export const recentPublications = showContentPlaceholders
  ? placeholderPublications
  : [];
export const institutionGroups = showContentPlaceholders
  ? placeholderInstitutionGroups
  : [];
