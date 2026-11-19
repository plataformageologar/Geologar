import { isLocalImagePath, isMediaObjectName } from "./config";

/**
 * Referência de imagem enviada por um formulário do CMS. Aceita:
 * - vazio (sem imagem);
 * - o valor atual do registro, sem alteração (inclusive arquivos locais
 *   antigos de public/);
 * - um objeto da biblioteca (`uploads/<uuid>.<ext>`).
 * O banco confirma, por trigger, que o objeto existe (erro GL422).
 */
export function parseImageReference(
  raw: string,
  current: string | null,
): { value: string | null; error?: string } {
  const value = raw.trim();
  if (value === "") return { value: null };
  if (current !== null && value === current) {
    return isMediaObjectName(value) || isLocalImagePath(value)
      ? { value }
      : { value: null, error: "A imagem atual tem um endereço inválido. Selecione outra imagem da biblioteca." };
  }
  if (isMediaObjectName(value)) return { value };
  return { value: null, error: "Selecione uma imagem da biblioteca de mídia." };
}

/** Mensagem para uma imagem que deixou de existir (GL422). */
export const MEDIA_MISSING_MESSAGE =
  "A imagem selecionada não está mais na biblioteca (pode ter sido excluída). Escolha outra imagem.";
