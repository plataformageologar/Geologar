import { cn } from "@/lib/utils/cn";

/**
 * Texto longo vindo do banco: linhas em branco separam parágrafos e quebras
 * simples são preservadas. Não interpreta HTML.
 */
export function RichText({ text, className }: { text: string; className?: string }) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <div className={cn("flex max-w-[68ch] flex-col gap-4 text-body-lg", className)}>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="whitespace-pre-line break-words">
          {paragraph}
        </p>
      ))}
    </div>
  );
}
