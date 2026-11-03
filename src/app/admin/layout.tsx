import type { Metadata } from "next";

// Área administrativa: fora dos mecanismos de busca e com título próprio.
// Cada página define o próprio cache (`dynamic`); o proxy marca as respostas
// como `private, no-store`.
export const metadata: Metadata = {
  title: { default: "Administração", template: "%s | Administração GeoLogar" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return children;
}
