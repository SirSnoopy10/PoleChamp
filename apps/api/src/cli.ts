import { migrate } from './db/migrate.js';

/**
 * Polecenia operatora (IMP-100 krok 2, TL-38): `node dist/cli.js migrate`.
 * `MIGRATION_DATABASE_URL` – połączenie roli `pc_migrator` (w produkcji z Secrets Manager).
 */
const commands: Record<string, () => Promise<void>> = {
  async migrate() {
    const url = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
    if (!url) throw new Error('Brak MIGRATION_DATABASE_URL');
    const applied = await migrate(url, {
      rolePasswords: { pc_app: process.env.PC_APP_PASSWORD },
      log: (m) => console.log(m),
    });
    console.log(applied.length ? `Zastosowano: ${applied.join(', ')}` : 'Baza aktualna.');
  },
};

const [name = 'help'] = process.argv.slice(2);
const command = commands[name];
if (!command) {
  console.error(`Nieznane polecenie „${name}”. Dostępne: ${Object.keys(commands).join(', ')}`);
  process.exit(2);
}
await command();
