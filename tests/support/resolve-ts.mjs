// Alias `@/` do tsconfig → `src/` (mesma convenção do Next.js).
const SRC = new URL("../../src/", import.meta.url);

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const target = new URL(specifier.slice(2), SRC).href;
    if (!/\.[cm]?[jt]sx?$/.test(specifier)) {
      try {
        return await nextResolve(`${target}.ts`, context);
      } catch {
        // segue para a resolução padrão
      }
    }
    return nextResolve(target, context);
  }
  const relative = specifier.startsWith("./") || specifier.startsWith("../");
  if (relative && !/\.[cm]?[jt]sx?$/.test(specifier)) {
    try {
      return await nextResolve(`${specifier}.ts`, context);
    } catch {
      // segue para a resolução padrão
    }
  }
  return nextResolve(specifier, context);
}
