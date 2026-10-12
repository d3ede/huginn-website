import EmbeddedPostgres from 'embedded-postgres';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
// Local development only. Never use this fixed local password on a public server.
const databaseDir = resolve('.local/postgres');
const postgres = new EmbeddedPostgres({
  databaseDir,
  user: 'huginn',
  password: 'huginn_local_only',
  port: 54329,
  persistent: true,
  authMethod: 'scram-sha-256',
  postgresFlags: ['-h', '127.0.0.1', '-c', 'timezone=UTC'],
  onLog: (message) => {
    if (/ready to accept/.test(String(message))) console.log('PostgreSQL ready on 127.0.0.1:54329');
  },
});
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await postgres.stop();
  process.exit(0);
}
process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());
try {
  if (!existsSync(resolve(databaseDir, 'PG_VERSION'))) await postgres.initialise();
  await postgres.start();
  const client = postgres.getPgClient('postgres', '127.0.0.1');
  await client.connect();
  const result = await client.query("SELECT 1 FROM pg_database WHERE datname = 'huginn'");
  if (!result.rowCount) await client.query('CREATE DATABASE huginn');
  await client.end();
  console.log('Local database: huginn. Keep this terminal open. Ctrl+C stops PostgreSQL.');
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  await postgres.stop().catch(() => {});
  process.exit(1);
}
setInterval(() => {}, 60000);
