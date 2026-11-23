import { Archive, CheckCircle2, PencilLine } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { CustomPageStatus } from "@/lib/queries/editorial";

/** Situação da página personalizada (texto + ícone; a cor não é a única pista). */
export function CustomPageStatusBadge({ status }: { status: CustomPageStatus }) {
  if (status === "published") {
    return (
      <Badge tone="green">
        <CheckCircle2 aria-hidden="true" className="size-3.5" />
        Publicada
      </Badge>
    );
  }
  if (status === "archived") {
    return (
      <Badge tone="neutral">
        <Archive aria-hidden="true" className="size-3.5" />
        Arquivada
      </Badge>
    );
  }
  return (
    <Badge tone="earth">
      <PencilLine aria-hidden="true" className="size-3.5" />
      Não publicada
    </Badge>
  );
}
