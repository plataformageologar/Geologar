import { NextResponse, type NextRequest } from "next/server";

import { getAdminAccess } from "@/lib/auth/access";
import { editorHref } from "@/lib/site/editor-pages";

/**
 * Verificação leve para o botão "Editar esta página" do site público.
 * Responde só se a página atual pode ser aberta no editor visual por esta
 * sessão — sem papel, e-mail ou qualquer outro dado da conta — e nunca é
 * guardada em cache.
 */
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" };

export async function GET(request: NextRequest) {
  const href = editorHref(request.nextUrl.searchParams.get("pagina") ?? "");
  let canEdit = false;
  try {
    canEdit = href !== null && (await getAdminAccess()).status === "authorized";
  } catch {
    canEdit = false;
  }
  return NextResponse.json(canEdit ? { canEdit, href } : { canEdit: false }, { headers: NO_STORE });
}
