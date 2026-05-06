/** Splitting is CommonJS; webpack exposes it as module namespace or default. */
export async function loadSplitting(): Promise<(opts: unknown) => void> {
  const mod = await import('splitting');
  return (
    (mod as { default?: (opts: unknown) => void }).default ??
    (mod as unknown as (opts: unknown) => void)
  );
}
