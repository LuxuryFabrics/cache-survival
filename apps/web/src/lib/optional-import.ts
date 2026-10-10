/** Runtime import that Vite/Rollup will not try to resolve at build time. */
export async function optionalImport<T = unknown>(specifier: string): Promise<T | null> {
  try {
    const importer = new Function("s", "return import(s)") as (s: string) => Promise<T>;
    return await importer(specifier);
  } catch {
    return null;
  }
}
