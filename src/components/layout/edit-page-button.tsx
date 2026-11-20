"use client";

import { PencilLine } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { EDITOR_HINT_COOKIE } from "@/lib/auth/editor-hint";

/**
 * "Editar esta página": aparece só para quem tem sessão administrativa com
 * vínculo ativo (verificado no servidor). Visitantes não fazem nenhuma
 * requisição extra — sem o indicador de sessão, nada é consultado — e o
 * código do editor visual nunca é carregado no site público.
 */
export function EditPageButton() {
  const pathname = usePathname();
  const [target, setTarget] = useState<{ path: string; href: string } | null>(null);

  useEffect(() => {
    // Dentro do editor visual (pré-visualização em iframe) o botão não aparece.
    if (window.self !== window.top) return;
    if (!document.cookie.split("; ").some((cookie) => cookie === `${EDITOR_HINT_COOKIE}=1`)) return;
    const controller = new AbortController();
    fetch(`/api/editor-access?pagina=${encodeURIComponent(pathname)}`, {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((result: { canEdit?: unknown; href?: unknown } | null) => {
        if (result?.canEdit === true && typeof result.href === "string" && result.href.startsWith("/admin/editor?")) {
          setTarget({ path: pathname, href: result.href });
        } else {
          setTarget(null);
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [pathname]);

  if (!target || target.path !== pathname) return null;

  return (
    <a
      href={target.href}
      className="fixed right-4 bottom-4 z-50 inline-flex min-h-12 items-center gap-2 rounded-full bg-deep px-5 text-label text-deep-foreground shadow-[0_12px_32px_-12px_rgb(15_37_55/0.6)] transition-colors hover:bg-primary focus-visible:outline-ring sm:right-6 sm:bottom-6"
    >
      <PencilLine aria-hidden="true" className="size-4" />
      Editar esta página
    </a>
  );
}
