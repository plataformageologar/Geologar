import type { Metadata } from "next";

import { EditorCanvas } from "@/components/admin/editor/editor-canvas";
import { requireAdminAccess } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tela do editor visual",
};

/**
 * Tela do editor visual (aberta somente dentro do editor, em iframe da mesma
 * origem). Não busca conteúdo: recebe o rascunho do editor por mensagem e
 * renderiza os componentes públicos do site com ele.
 */
export default async function EditorCanvasPage() {
  await requireAdminAccess();
  return <EditorCanvas />;
}
