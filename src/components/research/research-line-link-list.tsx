import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { ResearchLineLink } from "@/types/content";

/** Lista compacta de links para as páginas das linhas de pesquisa. */
export function ResearchLineLinkList({ lines }: { lines: ResearchLineLink[] }) {
  return (
    <ul className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
      {lines.map((line) => (
        <li key={line.slug} className="border-t border-border">
          <Link
            href={`/pesquisa/${line.slug}`}
            className="group flex min-h-14 items-center justify-between gap-3 py-2 text-body font-semibold text-foreground hover:text-primary"
          >
            <span className="underline decoration-transparent underline-offset-4 group-hover:decoration-current">
              {line.title}
            </span>
            <ArrowRight
              aria-hidden="true"
              className="size-4 shrink-0 text-primary transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
