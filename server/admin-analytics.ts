import type { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from './db';
import { adminUser } from './auth';
import { money } from './security';
import { publicTask } from './tasks';
import { AppError } from './errors';
import type { SolverEngine } from './providers';

const range = z.object({
  days: z.coerce
    .number()
    .pipe(z.union([z.literal(7), z.literal(30), z.literal(90)]))
    .default(30),
  userId: z.uuid().optional(),
});
const pagination = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  search: z.string().trim().max(100).default(''),
});
function sinceDate(days: number) {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - days + 1);
  return since;
}
type Totals = {
  total: bigint;
  solved: bigint;
  failed: bigint;
  queued: bigint;
  processing: bigint;
  instant: bigint;
  challenge: bigint;
  unknown: bigint;
  revenue: bigint;
  average: number | null;
  p95: number | null;
  active: bigint;
  modelCost: number | null;
  costCount: bigint;
  calls: number;
  input: number;
  output: number;
};

export function registerAdminAnalytics(app: FastifyInstance, engine: SolverEngine) {
  app.get('/admin/stats', async (request) => {
    await adminUser(request);
    const { days, userId } = range.parse(request.query);
    const since = sinceDate(days);
    if (userId && !(await db.user.findUnique({ where: { id: userId }, select: { id: true } })))
      throw new AppError(404, 'NOT_FOUND', 'User not found.');
    const filter = userId ? Prisma.sql`AND "userId"=${userId}::uuid` : Prisma.empty;
    const [totals, daily, types, errors, accounts, payments] = await db.$transaction(
      [
        db.$queryRaw<Totals[]>(Prisma.sql`SELECT COUNT(*) total,
        COUNT(*) FILTER (WHERE status='SUCCEEDED') solved, COUNT(*) FILTER (WHERE status='FAILED') failed,
        COUNT(*) FILTER (WHERE status='QUEUED') queued, COUNT(*) FILTER (WHERE status='PROCESSING') processing,
        COUNT(*) FILTER (WHERE "solveMode"='instant' AND status='SUCCEEDED') instant,
        COUNT(*) FILTER (WHERE "solveMode"='challenge' AND status='SUCCEEDED') challenge,
        COUNT(*) FILTER (WHERE ("solveMode" IS NULL OR "solveMode"='unknown') AND status='SUCCEEDED') unknown,
        COALESCE(SUM("costMicro"),0)::bigint revenue,
        AVG("durationMs") FILTER (WHERE status='SUCCEEDED')::float average,
        percentile_cont(0.95) WITHIN GROUP (ORDER BY "durationMs") FILTER (WHERE status='SUCCEEDED')::float p95,
        COUNT(DISTINCT "userId") active,
        SUM(("reportSummary"->>'modelCostUsd')::float) "modelCost",
        COUNT(*) FILTER (WHERE "reportSummary"->>'costComplete'='true') "costCount",
        COALESCE(SUM(("reportSummary"->>'modelCalls')::float),0) calls,
        COALESCE(SUM(("reportSummary"->>'inputTokens')::float),0) input,
        COALESCE(SUM(("reportSummary"->>'outputTokens')::float),0) output
        FROM "Task" WHERE "createdAt">=${since} ${filter}`),
        db.$queryRaw<{ day: Date; solved: bigint; failed: bigint }[]>(Prisma.sql`
        SELECT date_trunc('day', "createdAt" AT TIME ZONE 'UTC') AS day,
        COUNT(*) FILTER (WHERE status='SUCCEEDED') solved, COUNT(*) FILTER (WHERE status='FAILED') failed
        FROM "Task" WHERE "createdAt">=${since} ${filter} GROUP BY day ORDER BY day`),
        db.$queryRaw<{ type: string; total: bigint; solved: bigint; revenue: bigint }[]>(Prisma.sql`
        SELECT type, COUNT(*) total, COUNT(*) FILTER (WHERE status='SUCCEEDED') solved,
        COALESCE(SUM("costMicro"),0)::bigint revenue FROM "Task" WHERE "createdAt">=${since} ${filter}
        GROUP BY type ORDER BY total DESC, type`),
        db.$queryRaw<{ code: string; count: bigint }[]>(Prisma.sql`
        SELECT COALESCE("errorCode",'TASK_FAILED') code, COUNT(*) count FROM "Task"
        WHERE "createdAt">=${since} AND status='FAILED' ${filter} GROUP BY code ORDER BY count DESC LIMIT 10`),
        db.user.aggregate({
          where: userId ? { id: userId } : {},
          _sum: { balanceMicro: true },
          _count: true,
        }),
        db.payment.aggregate({
          where: {
            ...(userId ? { userId } : {}),
            status: 'CONFIRMED',
            confirmedAt: { gte: since },
          },
          _sum: { amountMicro: true },
        }),
      ],
      { isolationLevel: 'RepeatableRead' },
    );
    const t = totals[0];
    const byDay = new Map(daily.map((d) => [d.day.toISOString().slice(0, 10), d]));
    return {
      days,
      total: Number(t.total),
      solved: Number(t.solved),
      failed: Number(t.failed),
      queued: Number(t.queued),
      processing: Number(t.processing),
      instant: Number(t.instant),
      challenge: Number(t.challenge),
      unknown: Number(t.unknown),
      successRate:
        t.solved + t.failed ? (Number(t.solved) / Number(t.solved + t.failed)) * 100 : null,
      averageMs: t.average,
      p95Ms: t.p95,
      revenue: money(t.revenue),
      deposits: money(payments._sum.amountMicro ?? 0n),
      balance: money(accounts._sum.balanceMicro ?? 0n),
      users: accounts._count,
      activeUsers: Number(t.active),
      newUsers: await db.user.count({
        where: { ...(userId ? { id: userId } : {}), createdAt: { gte: since } },
      }),
      modelCostUsd: t.modelCost,
      costCoverage: Number(t.costCount),
      modelCalls: t.calls,
      inputTokens: t.input,
      outputTokens: t.output,
      daily: Array.from({ length: days }, (_, i) => {
        const date = new Date(since.getTime() + i * 86400000).toISOString().slice(0, 10);
        const row = byDay.get(date);
        return { date, solved: Number(row?.solved ?? 0), failed: Number(row?.failed ?? 0) };
      }),
      types: types.map((row) => ({
        type: row.type,
        total: Number(row.total),
        solved: Number(row.solved),
        revenue: money(row.revenue),
      })),
      errors: errors.map((row) => ({ code: row.code, count: Number(row.count) })),
    };
  });
  app.get('/admin/users', async (request) => {
    await adminUser(request);
    const { days } = range.parse(request.query);
    const { page, search } = pagination.parse(request.query);
    const since = sinceDate(days);
    const where: Prisma.UserWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};
    const searchFilter = search
      ? Prisma.sql`WHERE u.name ILIKE ${'%' + search.replace(/[\\%_]/g, '\\$&') + '%'}
      OR u.email ILIKE ${'%' + search.replace(/[\\%_]/g, '\\$&') + '%'}`
      : Prisma.empty;
    const [rows, total] = await db.$transaction(
      [
        db.$queryRaw<
          {
            id: string;
            name: string;
            email: string;
            balanceMicro: bigint;
            createdAt: Date;
            total: bigint;
            solved: bigint;
            failed: bigint;
            revenue: bigint;
            averageMs: number | null;
          }[]
        >(Prisma.sql`
        SELECT u.id,u.name,u.email,u."balanceMicro",u."createdAt", COALESCE(t.total,0)::bigint total,
        COALESCE(t.solved,0)::bigint solved,COALESCE(t.failed,0)::bigint failed,
        COALESCE(t.revenue,0)::bigint revenue,t.average "averageMs" FROM "User" u LEFT JOIN (
          SELECT "userId",COUNT(*) total,COUNT(*) FILTER (WHERE status='SUCCEEDED') solved,
          COUNT(*) FILTER (WHERE status='FAILED') failed,SUM("costMicro") revenue,
          AVG("durationMs") FILTER (WHERE status='SUCCEEDED')::float average
          FROM "Task" WHERE "createdAt">=${since} GROUP BY "userId"
        ) t ON t."userId"=u.id ${searchFilter}
        ORDER BY COALESCE(t.total,0) DESC,u."createdAt" DESC,u.id LIMIT 20 OFFSET ${(page - 1) * 20}`),
        db.user.count({ where }),
      ],
      { isolationLevel: 'RepeatableRead' },
    );
    return {
      users: rows.map(({ balanceMicro, total, solved, failed, revenue, ...row }) => ({
        ...row,
        balance: money(balanceMicro),
        total: Number(total),
        solved: Number(solved),
        failed: Number(failed),
        revenue: money(revenue),
      })),
      page,
      total,
      pageSize: 20,
    };
  });
  app.get('/admin/tasks', async (request) => {
    await adminUser(request);
    const { days, userId } = range.parse(request.query);
    const { page } = pagination.parse(request.query);
    const { status, mode } = z
      .object({
        status: z.enum(['QUEUED', 'PROCESSING', 'SUCCEEDED', 'FAILED']).optional(),
        mode: z.enum(['instant', 'challenge', 'unknown']).optional(),
      })
      .parse(request.query);
    const where: Prisma.TaskWhereInput = {
      createdAt: { gte: sinceDate(days) },
      ...(userId ? { userId } : {}),
      ...(status ? { status } : {}),
      ...(mode === 'unknown'
        ? { OR: [{ solveMode: null }, { solveMode: 'unknown' }] }
        : mode
          ? { solveMode: mode }
          : {}),
    };
    const [tasks, total] = await db.$transaction([
      db.task.findMany({
        where,
        select: {
          id: true,
          user: { select: { id: true, name: true } },
          type: true,
          websiteURL: true,
          status: true,
          costMicro: true,
          createdAt: true,
          durationMs: true,
          errorCode: true,
          solveMode: true,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * 20,
        take: 20,
      }),
      db.task.count({ where }),
    ]);
    return {
      tasks: tasks.map(({ costMicro, ...task }) => ({ ...task, cost: money(costMicro) })),
      total,
      page,
      pageSize: 20,
    };
  });
  async function reportTask(request: Parameters<typeof adminUser>[0]) {
    await adminUser(request);
    const id = z.uuid().parse((request.params as { id: string }).id);
    const task = await db.task.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true } } },
    });
    if (!task) throw new AppError(404, 'NOT_FOUND', 'Task not found.');
    return task;
  }
  app.get('/admin/tasks/:id/report', async (request) => {
    const task = await reportTask(request);
    if (!engine.report)
      throw new AppError(404, 'REPORT_NOT_AVAILABLE', 'Report is not available for this task.');
    const report = await engine.report(task.id);
    if (!report)
      throw new AppError(
        404,
        'REPORT_NOT_AVAILABLE',
        'Report was not recorded or its retention period has ended.',
      );
    return {
      task: { ...publicTask(task), user: task.user, serverAcceptance: task.serverAcceptance },
      report,
    };
  });
  app.get('/admin/tasks/:id/report/images/:imageId', async (request, reply) => {
    const task = await reportTask(request);
    const imageId = z.coerce
      .number()
      .int()
      .min(0)
      .max(255)
      .parse((request.params as { imageId: string }).imageId);
    const image = await engine.reportImage?.(task.id, imageId);
    if (!image) throw new AppError(404, 'REPORT_NOT_AVAILABLE', 'Report image is not available.');
    return reply
      .type(image.contentType)
      .header('X-Content-Type-Options', 'nosniff')
      .send(image.data);
  });
}
