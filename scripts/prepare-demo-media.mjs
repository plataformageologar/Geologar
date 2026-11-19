// Gera os recortes provisórios usados na demonstração (Etapa 8.5) a partir do
// pacote "GeoLogar_Imagens_e_Logos_PNG" (recortes do mockup da homepage).
//
// Uso:
//   node scripts/prepare-demo-media.mjs <pasta "Imagens" do pacote> <pasta de saída>
//
// Somente corte: remove o título do mockup gravado na parte inferior de cada
// imagem e uma margem de 6 px com bordas/cantos arredondados da captura. Não há
// redimensionamento, filtro nem correção de cor. A saída fica FORA do
// repositório e é enviada pela biblioteca de mídia (/admin/midias); ver
// docs/initial-content-manifest.md. Executar de novo gera arquivos idênticos.
//
// `sharp` é instalado com o Next.js (otimização de imagens); não é uma
// dependência nova do projeto.
import { mkdir } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

/** Arquivo de origem → área preservada (pixels do PNG de origem). */
const CROPS = [
  // Linhas de pesquisa (465 × 363 aprox.): título nas ~130 px inferiores.
  { file: "Linha_geologia_geodiversidade.png", bottom: 232 },
  { file: "Linha_recursos_minerais.png", bottom: 232 },
  { file: "Linha_geologia_ambiental.png", bottom: 232 },
  { file: "Linha_sustentabilidade_economia_circular.png", bottom: 232 },
  { file: "Linha_patrimonio_geologico.png", bottom: 232 },
  { file: "Linha_geotecnologias_geoprocessamento.png", bottom: 232 },
  // Projetos (516 × 351 aprox.): faixa branca com o nome a partir de ~280 px.
  { file: "Projeto_DETEC_BEGE.png", bottom: 276 },
  { file: "Projeto_ACV_fluxo_massas.png", bottom: 276 },
  { file: "Projeto_EXPOGEO_VIRTUAL.png", bottom: 276 },
];

const MARGIN = 6;

const [source, output] = process.argv.slice(2);
if (!source || !output) {
  console.error("Uso: node scripts/prepare-demo-media.mjs <pasta Imagens> <pasta de saída>");
  process.exit(1);
}

await mkdir(output, { recursive: true });

for (const { file, bottom } of CROPS) {
  const input = path.join(source, file);
  const { width } = await sharp(input).metadata();
  if (!width) throw new Error(`Não foi possível ler ${file}`);
  const region = { left: MARGIN, top: MARGIN, width: width - 2 * MARGIN, height: bottom - MARGIN };
  const target = path.join(output, file.replace(/\.png$/, "_recorte.png"));
  await sharp(input).extract(region).png({ compressionLevel: 9 }).toFile(target);
  console.log(`${file} → ${path.basename(target)} (${region.width}×${region.height})`);
}
