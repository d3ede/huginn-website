import { db } from '../server/db';
import { config } from '../server/config';
import { hashPassword } from '../server/security';
if (config.NODE_ENV === 'production' || config.DEMO_MODE !== 'true')
  throw new Error('Seed requires non-production NODE_ENV and explicit DEMO_MODE=true.');
const password = process.env.DEMO_PASSWORD ?? '';
if (password.length < 8) throw new Error('Set DEMO_PASSWORD locally to at least 8 characters.');
const email = 'demo@huginn.local';
try {
  if (await db.user.findUnique({ where: { email } })) {
    console.log('Demo account already exists; no data changed.');
  } else {
    await db.$transaction(
      async (tx) => {
        const now = new Date();
        const accountCreatedAt = new Date(now);
        accountCreatedAt.setUTCHours(0, 0, 0, 0);
        accountCreatedAt.setUTCDate(accountCreatedAt.getUTCDate() - 31);
        const user = await tx.user.create({
          data: {
            email,
            name: 'Alex',
            passwordHash: await hashPassword(password),
            balanceMicro: 25_000_000n,
            createdAt: accountCreatedAt,
          },
        });
        await tx.ledgerEntry.create({
          data: {
            userId: user.id,
            kind: 'DEV_CREDIT',
            amountMicro: 25_000_000n,
            balanceAfterMicro: 25_000_000n,
            createdAt: accountCreatedAt,
          },
        });
        let balance = 25_000_000n;
        for (let day = 29; day >= 0; day--) {
          const count = 2 + ((day * 7) % 13);
          for (let i = 0; i < count; i++) {
            const date = new Date(now);
            date.setUTCHours(9 + Math.floor(i / 2), (i % 2) * 26, 0, 0);
            date.setUTCDate(date.getUTCDate() - day);
            if (day === 0) date.setTime(now.getTime() - (count - i) * 300000 - 60000);
            const durationMs = 2400 + ((day * 137 + i * 211) % 4300);
            const success = (day + i) % 7 !== 0;
            const price = BigInt(config.TASK_PRICE_MICRO_USD);
            const task = await tx.task.create({
              data: {
                userId: user.id,
                websiteURL: 'https://example.com',
                websiteKey: 'DEVELOPMENT_SAMPLE_ONLY',
                reservedMicro: price,
                costMicro: success ? price : 0n,
                status: success ? 'SUCCEEDED' : 'FAILED',
                errorCode: success ? null : 'DEV_SAMPLE_FAILURE',
                durationMs,
                createdAt: date,
                startedAt: date,
                completedAt: new Date(date.getTime() + durationMs),
              },
            });
            balance -= price;
            await tx.ledgerEntry.create({
              data: {
                userId: user.id,
                taskId: task.id,
                kind: 'TASK_RESERVE',
                amountMicro: -price,
                balanceAfterMicro: balance,
                createdAt: date,
              },
            });
            if (!success) {
              balance += price;
              await tx.ledgerEntry.create({
                data: {
                  userId: user.id,
                  taskId: task.id,
                  kind: 'TASK_REFUND',
                  amountMicro: price,
                  balanceAfterMicro: balance,
                  createdAt: new Date(date.getTime() + durationMs),
                },
              });
            }
          }
        }
        await tx.user.update({ where: { id: user.id }, data: { balanceMicro: balance } });
      },
      { timeout: 30000 },
    );
    console.log(
      'Explicit development sample created. Sign in as demo@huginn.local with your DEMO_PASSWORD.',
    );
  }
} finally {
  await db.$disconnect();
}
