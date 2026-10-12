import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
if (process.env.NODE_ENV === 'production')
  throw new Error('Integration tests are forbidden in production.');
if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL in .env first.');
// A fresh schema keeps test tasks invisible to the running application worker.
const schema = `integration_${randomUUID().replaceAll('-', '')}`;
const url = new URL(process.env.TEST_DATABASE_URL || process.env.DATABASE_URL);
url.searchParams.set('schema', schema);
const env = { ...process.env, DATABASE_URL: url.toString(), NODE_ENV: 'test', DEMO_MODE: 'false' };
const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { env, stdio: 'inherit', windowsHide: true });
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`Test command exited with ${code}`)),
    );
  });
}
let failed = false;
try {
  await run(['node_modules/prisma/build/index.js', 'migrate', 'deploy']);
  await run(['node_modules/tsx/dist/cli.mjs', '--test', 'tests/integration/api.test.ts']);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  failed = true;
} finally {
  // Identifier is generated above from a UUID; no user input is interpolated.
  await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await db.$disconnect();
}
process.exitCode = failed ? 1 : 0;
