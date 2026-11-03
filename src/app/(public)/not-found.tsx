import type { Metadata } from "next";

import { NotFoundContent } from "@/components/layout/not-found-content";

export const metadata: Metadata = {
  title: "Página não encontrada",
};

/** `notFound()` nas páginas públicas: renderizada dentro do layout público. */
export default function NotFound() {
  return <NotFoundContent />;
}
