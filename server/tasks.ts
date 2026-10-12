import { Prisma, type Task } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { db } from './db';
import { config } from './config';
import { solver, type SolverEngine, type SolverResult } from './providers';
import { SolverFailure } from './solver-client';
import { AppError } from './errors';
import { money } from './security';
import {
  taskDefinition,
  taskDefinitions,
  parseSolverTask,
  type SolverTask,
} from './solver-protocol';
import { getBillingSettings, taskProducts } from './billing-settings';

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
      ? {
          result: {
            token: task.resultToken,
            serverAcceptance: task.serverAcceptance,
            userAgent: task.resultUserAgent,
            respKey: task.resultRespKey,
          },
        }
      : {}),
  };
}
export async function createTask(
  userId: string,
  apiKeyId: string | undefined,
  input: { type?: string; websiteURL: string; websiteKey: string; solverTask?: SolverTask },
  idempotencyKey: string | undefined,
  engine: SolverEngine = solver,
) {
  const productId = input.solverTask
    ? taskDefinition(input.solverTask.type)?.id
    : (input.type ?? 'hcaptcha');
  if (idempotencyKey) {
    const existing = await db.task.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey } },
    });
    if (existing) {
      if (
        existing.websiteURL !== input.websiteURL ||
        existing.websiteKey !== input.websiteKey ||
        existing.type !== productId
      )
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
      'Task processing is temporarily unavailable. No balance was charged.',
    );
  const pricing = await getBillingSettings();
  const product = taskProducts(pricing).find((entry) => entry.id === productId);
  if (!product?.enabled || !product.supported)
    throw new AppError(400, 'ERROR_TASK_NOT_SUPPORTED', 'This task type is unavailable.');
  const definition = taskDefinitions.find((entry) => entry.id === product.id)!;
  const solverTask =
    input.solverTask ??
    definition.schema.parse({
      type: definition.basicType,
      websiteURL: input.websiteURL,
      websiteKey: input.websiteKey,
    });
  try {
    return await db.$transaction(async (tx) => {
      // A concurrent revocation must complete before or after this reservation.
      if (apiKeyId) {
        const active = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "ApiKey"
          WHERE id = ${apiKeyId}::uuid AND "userId" = ${userId}::uuid AND "revokedAt" IS NULL FOR SHARE`;
        if (!active.length)
          throw new AppError(401, 'INVALID_API_KEY', 'The API key is invalid or revoked.');
      }
      const reservedMicro = BigInt(product.priceMicro);
      const changed = await tx.user.updateMany({
        where: { id: userId, balanceMicro: { gte: reservedMicro } },
        data: { balanceMicro: { decrement: reservedMicro } },
      });
      if (!changed.count)
        throw new AppError(402, 'INSUFFICIENT_BALANCE', 'Your balance is too low for this task.');
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      const task = await tx.task.create({
        data: {
          userId,
          apiKeyId,
          ...input,
          type: product.id,
          solverTask: solverTask as Prisma.InputJsonValue,
          reservedMicro,
          idempotencyKey,
        },
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
    // The competing request may have consumed the last available reservation.
    if (idempotencyKey && error instanceof AppError && error.code === 'INSUFFICIENT_BALANCE') {
      const existing = await db.task.findUnique({
        where: { userId_idempotencyKey: { userId, idempotencyKey } },
      });
      if (existing) return createTask(userId, apiKeyId, input, idempotencyKey, engine);
    }
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
  result: SolverResult | null,
  errorCode = 'TASK_FAILED',
  leaseId?: string,
) {
  if (result && !result.token.trim()) throw new Error('Solver returned an empty token');
  await db.$transaction(async (tx) => {
    const completedAt = new Date();
    const changed = await tx.task.updateMany({
      where: {
        id: task.id,
        status: { in: ['QUEUED', 'PROCESSING'] },
        ...(leaseId ? { leaseId } : {}),
      },
      data: {
        status: result ? 'SUCCEEDED' : 'FAILED',
        resultToken: result?.token ?? null,
        serverAcceptance: result?.serverAcceptance ?? null,
        resultUserAgent: result?.userAgent ?? null,
        resultRespKey: result?.respKey ?? null,
        leaseId: null,
        leaseUntil: null,
        errorCode: result ? null : errorCode,
        solverTask: Prisma.DbNull,
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
export async function workOne(engine: SolverEngine = solver, shutdown?: AbortSignal) {
  if (!engine.available || shutdown?.aborted) return false;
  const leaseId = randomUUID();
  const tasks = await db.$queryRaw<Task[]>`
    UPDATE "Task" SET status = 'PROCESSING',
      "startedAt" = COALESCE("startedAt", NOW() AT TIME ZONE 'UTC'),
      "leaseId" = ${leaseId}::uuid, "leaseUntil" = (NOW() AT TIME ZONE 'UTC') + INTERVAL '30 seconds'
    WHERE id = (SELECT id FROM "Task" WHERE status = 'QUEUED'
      OR (status = 'PROCESSING' AND ("leaseUntil" IS NULL OR "leaseUntil" < (NOW() AT TIME ZONE 'UTC')))
      ORDER BY "createdAt" FOR UPDATE SKIP LOCKED LIMIT 1)
    RETURNING *`;
  const task = tasks[0];
  if (!task) return false;
  const remaining = task.startedAt!.getTime() + config.TASK_TIMEOUT_SECONDS * 1000 - Date.now();
  if (remaining <= 0) {
    await settleTask(task, null, 'TASK_TIMEOUT', leaseId);
    return true;
  }
  const leaseLost = new AbortController();
  let renewing = false;
  const heartbeat = setInterval(() => {
    if (renewing) return;
    renewing = true;
    void db.task
      .updateMany({
        where: { id: task.id, leaseId, status: 'PROCESSING' },
        data: { leaseUntil: new Date(Date.now() + 30000) },
      })
      .then((r) => {
        if (!r.count) leaseLost.abort();
      })
      .catch(() => leaseLost.abort())
      .finally(() => {
        renewing = false;
      });
  }, 10000);
  const deadline = AbortSignal.timeout(Math.ceil(remaining));
  try {
    const result = await engine.solve(
      {
        taskId: task.id,
        websiteURL: task.websiteURL,
        websiteKey: task.websiteKey,
        ...(task.solverTask ? { task: parseSolverTask(task.solverTask) } : {}),
      },
      AbortSignal.any([deadline, leaseLost.signal, ...(shutdown ? [shutdown] : [])]),
    );
    if (!shutdown?.aborted && !leaseLost.signal.aborted) {
      await settleTask(task, deadline.aborted ? null : result, 'TASK_TIMEOUT', leaseId);
    }
  } catch (error) {
    if (!shutdown?.aborted && !leaseLost.signal.aborted)
      await settleTask(
        task,
        null,
        deadline.aborted
          ? 'TASK_TIMEOUT'
          : error instanceof SolverFailure
            ? error.code
            : 'TASK_FAILED',
        leaseId,
      );
  } finally {
    clearInterval(heartbeat);
    // Shutdown releases ownership; the next worker resumes the same solver ID.
    await db.task.updateMany({
      where: { id: task.id, leaseId, status: 'PROCESSING' },
      data: { leaseId: null, leaseUntil: new Date() },
    });
  }
  return true;
}
export function startWorker(onError: (error: unknown) => void) {
  const controller = new AbortController();
  const slots = Array.from({ length: config.WORKER_CONCURRENCY }, async () => {
    while (!controller.signal.aborted) {
      try {
        if (await workOne(solver, controller.signal)) continue;
      } catch (error) {
        onError(error);
      }
      try {
        await delay(500, undefined, { signal: controller.signal });
      } catch {
        break;
      }
    }
  });
  return async () => {
    controller.abort();
    await Promise.allSettled(slots);
  };
}
