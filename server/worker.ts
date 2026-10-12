import { db } from './db';
import { startWorker } from './tasks';

await db.$connect();
const stopWorker = startWorker(() => console.error('Platform worker operation failed'));
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await stopWorker();
  await db.$disconnect();
}
process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());
