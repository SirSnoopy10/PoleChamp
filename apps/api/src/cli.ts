import 'reflect-metadata';
import { parseArgs } from 'node:util';
import { pino } from 'pino';
import { OperatorCommands } from './cli/operator.js';
import { loadEnv } from './config/env.js';
import { migrate } from './db/migrate.js';

/**
 * Polecenia operatora (IMP-100 krok 2, IMP-178, TL-38): `node dist/cli.js <polecenie> [opcje]`,
 * w chmurze jako jednorazowe zadanie ECS (`tools/scripts/run-cli.sh`). Runbook: `ops/runbooks/operator-cli.md`.
 * `MIGRATION_DATABASE_URL` – połączenie roli `pc_migrator` (w produkcji z Secrets Manager).
 */
const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    operator: { type: 'string' },
    'owner-email': { type: 'string' },
    email: { type: 'string' },
    'athlete-id': { type: 'string' },
    disable: { type: 'boolean' },
    enable: { type: 'boolean' },
    'dry-run': { type: 'boolean' },
  },
});
const [name = 'help', arg = ''] = positionals;
const operator = values.operator ?? '';

async function withOperator<T>(fn: (ops: OperatorCommands) => Promise<T>): Promise<void> {
  const ops = await OperatorCommands.create(loadEnv(), pino({ level: 'info' }));
  try {
    console.log(JSON.stringify(await fn(ops), null, 2));
  } finally {
    await ops.close();
  }
}

const commands: Record<string, () => Promise<void>> = {
  async migrate() {
    const url = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
    if (!url) throw new Error('Brak MIGRATION_DATABASE_URL');
    const applied = await migrate(url, {
      rolePasswords: {
        pc_app: process.env.PC_APP_PASSWORD,
        pc_retention: process.env.PC_RETENTION_PASSWORD,
      },
      log: (m) => console.log(m),
    });
    console.log(applied.length ? `Zastosowano: ${applied.join(', ')}` : 'Baza aktualna.');
  },
  /** `review-tournament:create --owner-email <konto recenzenta> --operator <id>` (TL-40). */
  'review-tournament:create': () =>
    withOperator((ops) => ops.reviewTournament(operator, values['owner-email'] ?? '')),
  /** `tournament:offline-login <tournamentId> --disable|--enable --operator <id>`. */
  'tournament:offline-login': () =>
    withOperator((ops) => {
      if (values.disable === values.enable) throw new Error('Podaj --disable albo --enable');
      return ops.setOfflineLogin(operator, arg, values.enable === true);
    }),
  /** `person:export --email <e-mail> | --athlete-id <id> --operator <id>` (NFR-507). */
  'person:export': () =>
    withOperator((ops) =>
      ops.exportPerson(operator, { email: values.email, athleteId: values['athlete-id'] }),
    ),
  /** `account:unlock <e-mail> --operator <id>`. */
  'account:unlock': () => withOperator((ops) => ops.unlockAccount(operator, arg)),
  /** `retention:run [--dry-run] --operator <id>`. */
  'retention:run': () => withOperator((ops) => ops.runRetention(operator, values['dry-run'] === true)),
};

const command = commands[name];
if (!command) {
  console.error(`Nieznane polecenie „${name}”. Dostępne: ${Object.keys(commands).join(', ')}`);
  process.exit(2);
}
await command();
