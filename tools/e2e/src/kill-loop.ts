import { execFileSync } from 'node:child_process';

/**
 * Pętla kill -9 (IMP-458, TC-SYNC-004/005): zatwierdzenie oceny (Maestro `sync/kill-submit.yaml`) →
 * natychmiastowe zabicie procesu → restart → po synchronizacji arkusz istnieje dokładnie raz w API.
 * Zależności wstrzykiwane – logika pętli testowana bez urządzenia.
 */
export interface KillLoopDeps {
  submit(iteration: number): void;
  kill(): void;
  restart(): void;
  /** Liczba arkuszy startu w API po synchronizacji (oczekiwane: 1, bez duplikatów). */
  sheetCount(iteration: number): Promise<number>;
}

export async function killLoop(iterations: number, deps: KillLoopDeps) {
  const failures: { iteration: number; sheets: number }[] = [];
  for (let i = 1; i <= iterations; i++) {
    deps.submit(i);
    deps.kill();
    deps.restart();
    const sheets = await deps.sheetCount(i);
    if (sheets !== 1) failures.push({ iteration: i, sheets });
  }
  return { iterations, failures };
}

export const androidKill = (serial: string, appId = 'app.polechamp') => ({
  kill: () => execFileSync('adb', ['-s', serial, 'shell', 'am', 'force-stop', appId]),
  restart: () => execFileSync('adb', ['-s', serial, 'shell', 'monkey', '-p', appId, '1']),
});

export const iosKill = (udid: string, appId = 'app.polechamp') => ({
  kill: () => execFileSync('xcrun', ['simctl', 'terminate', udid, appId]),
  restart: () => execFileSync('xcrun', ['simctl', 'launch', udid, appId]),
});
