/** `fetch` z limitem czasu (IMP-214 krok 5): po `ms` żądanie przerywane → błąd `TIMEOUT`. */
export function fetchWithTimeout(
  ms: number,
  base: typeof globalThis.fetch = (i, init) => globalThis.fetch(i, init),
) {
  return (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const controller = new AbortController();
    const outer = init?.signal ?? (input instanceof Request ? input.signal : undefined);
    outer?.addEventListener('abort', () => controller.abort(outer.reason));
    const timer = setTimeout(() => controller.abort(new DOMException('timeout', 'TimeoutError')), ms);
    return base(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
  };
}
