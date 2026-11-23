import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { NewPageForm } from "@/components/admin/editorial/new-page-form";
import { requireAdminAccess } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nova página",
};

export default async function NewCustomPagePage() {
  await requireAdminAccess();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Link href="/admin/paginas" className="inline-flex min-h-11 items-center gap-2 self-start text-label text-primary">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Voltar para Páginas
        </Link>
        <h1 className="text-h1">Nova página</h1>
        <p className="text-body text-muted-foreground">
          A página é criada como rascunho, fora do site público. Na tela seguinte você adiciona os blocos (texto,
          imagem com texto, chamada, galeria e logos), visualiza e publica.
        </p>
      </div>
      <NewPageForm />
    </div>
  );
}
