import type { ReactNode } from "react";

type ContainerProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Limita a largura do conteúdo e aplica o espaçamento lateral padrão.
 */
export function Container({ children, className = "" }: ContainerProps) {
  return (
    <div className={`mx-auto w-full max-w-5xl px-6 ${className}`}>
      {children}
    </div>
  );
}
