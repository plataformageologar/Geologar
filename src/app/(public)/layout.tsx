import { PublicShell } from "@/components/layout/public-shell";

/** Layout do site público (cabeçalho e rodapé institucionais). */
export default function PublicLayout({ children }: LayoutProps<"/">) {
  return <PublicShell>{children}</PublicShell>;
}
