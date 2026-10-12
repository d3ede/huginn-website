import { buildApp } from './app';
import { config } from './config';
import { db } from './db';
import { startWorker } from './tasks';
const app = await buildApp();
await db.$connect();
await app.listen({ host: config.API_HOST, port: config.API_PORT });
const stopWorker = startWorker((error) =>
  app.log.error({ error: String(error) }, 'Worker operation failed'),
);
const cleanup = setInterval(() => {
  void db.session
    .deleteMany({ where: { expiresAt: { lt: new Date() } } })
    .catch(() => app.log.error('Session cleanup failed'));
  void db.task
    .updateMany({
      where: { completedAt: { lt: new Date(Date.now() - 86400000) }, resultToken: { not: null } },
      data: { resultToken: null },
    })
    .catch(() => app.log.error('Result cleanup failed'));
}, 60000);
async function stop() {
  stopWorker();
  clearInterval(cleanup);
  await app.close();
  await db.$disconnect();
  process.exit(0);
}
process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());
