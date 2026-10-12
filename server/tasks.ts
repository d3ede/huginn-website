import { Prisma, type Task } from '@prisma/client';
import { db } from './db';
import { config } from './config';
import { solver, type SolverEngine } from './providers';
import { AppError } from './errors';
import { money } from './security';

export function publicTask(task: Task, includeResult = false) {
  return {
    id: task.id,
    type: task.type,
    websiteURL: task.websiteURL,
    status: task.status.toLowerCase(),
    cost: money(task.costMicro),
    createdAt: task.createdAt,
    completedAt: task.completedAt,
    durationMs: task.durationMs,
    errorCode: task.errorCode,
    ...(includeResult && task.status === 'SUCCEEDED'
      ? { result: { token: task.resultToken } }
      : {}),
  };
}
export async function createTask(
  userId: string,
  apiKeyId: string | undefined,
  input: { websiteURL: string; websiteKey: string },
  idempotencyKey: string | undefined,
  engine: SolverEngine = solver,
) {
  if (idempotencyKey) {
    const existing = await db.task.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey } },
    });
    if (existing) {
      if (existing.websiteURL !== input.websiteURL || existing.websiteKey !== input.websiteKey)
        throw new AppError(
          409,
          'IDEMPOTENCY_CONFLICT',
          'This idempotency key was used for a different task.',
        );
      return existing;
    }
  }
  if (!engine.available)
    throw new AppError(
      503,
      'SOLVER_UNAVAILABLE',
      'Task processing is not available yet. No balance was charged.',
    );
  try {
    return await db.$transaction(async (tx) => {
      const reservedMicro = BigInt(config.TASK_PRICE_MICRO_USD);
      const changed = await tx.user.updateMany({
        where: { id: userId, balanceMicro: { gte: reservedMicro } },
        data: { balanceMicro: { decrement: reservedMicro } },
      });
      if (!changed.count)
        throw new AppError(402, 'INSUFFICIENT_BALANCE', 'Your balance is too low for this task.');
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      const task = await tx.task.create({
        data: { userId, apiKeyId, ...input, reservedMicro, idempotencyKey },
      });
      await tx.ledgerEntry.create({
        data: {
          userId,
          taskId: task.id,
          kind: 'TASK_RESERVE',
          amountMicro: -reservedMicro,
          balanceAfterMicro: user.balanceMicro,
        },
      });
      return task;
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      idempotencyKey
    )
      return createTask(userId, apiKeyId, input, idempotencyKey, engine);
    throw error;
  }
}
export async function settleTask(
  task: Task,
  result: { token: string } | null,
  errorCode = 'TASK_FAILED',
) {
  await db.$transaction(async (tx) => {
    const completedAt = new Date();
    const changed = await tx.task.updateMany({
      where: { id: task.id, status: { in: ['QUEUED', 'PROCESSING'] } },
      data: {
        status: result ? 'SUCCEEDED' : 'FAILED',
        resultToken: result?.token ?? null,
        errorCode: result ? null : errorCode,
        costMicro: result ? task.reservedMicro : 0n,
        completedAt,
        durationMs: Math.max(
          0,
          completedAt.getTime() - (task.startedAt ?? task.createdAt).getTime(),
        ),
      },
    });
    if (!changed.count || result) return;
    const user = await tx.user.update({
      where: { id: task.userId },
      data: { balanceMicro: { increment: task.reservedMicro } },
    });
    await tx.ledgerEntry.create({
      data: {
        userId: task.userId,
        taskId: task.id,
        kind: 'TASK_REFUND',
        amountMicro: task.reservedMicro,
        balanceAfterMicro: user.balanceMicro,
      },
    });
  });
}
export async function workOne(engine: SolverEngine = solver) {
  const expired = await db.task.findMany({
    where: {
      status: 'PROCESSING',
      startedAt: { lt: new Date(Date.now() - (config.TASK_TIMEOUT_SECONDS + 30) * 1000) },
    },
    take: 20,
  });
  for (const task of expired) await settleTask(task, null, 'TASK_TIMEOUT');
  const tasks = await db.$queryRaw<Task[]>`
    UPDATE "Task" SET status = 'PROCESSING', "startedAt" = (NOW() AT TIME ZONE 'UTC')
    WHERE id = (SELECT id FROM "Task" WHERE status = 'QUEUED' ORDER BY "createdAt" FOR UPDATE SKIP LOCKED LIMIT 1)
    RETURNING *`;
  const task = tasks[0];
  if (!task) return false;
  try {
    const result = await engine.solve(
      { taskId: task.id, websiteURL: task.websiteURL, websiteKey: task.websiteKey },
      AbortSignal.timeout(config.TASK_TIMEOUT_SECONDS * 1000),
    );
    await settleTask(task, result);
  } catch {
    await settleTask(task, null);
  }
  return true;
}
export function startWorker(onError: (error: unknown) => void) {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      for (let i = 0; i < 10; i++) if (!(await workOne())) break;
    } catch (error) {
      onError(error);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(() => void tick(), 1000);
  return () => clearInterval(timer);
}
