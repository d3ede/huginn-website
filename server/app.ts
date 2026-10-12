import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { Prisma } from '@prisma/client';
import { z, ZodError } from 'zod';
import { config } from './config';
import { db } from './db';
import { AppError } from './errors';
import {
  hashPassword,
  verifyPassword,
  hashToken,
  randomToken,
  money,
  verifySignature,
} from './security';
import { sessionUser, apiUser, newSession, publicUser, cookieName, cookieOptions } from './auth';
import { createTask, publicTask } from './tasks';
import { payments, solver, type PaymentProvider, type SolverEngine } from './providers';

declare module 'fastify' {
  interface FastifyRequest {
    rawBody?: string;
  }
}
const password = z.string().min(8, 'Use at least 8 characters.').max(128);
const email = z
  .email()
  .max(254)
  .transform((v) => v.toLowerCase());
const taskInput = z
  .object({
    type: z.literal('hcaptcha'),
    websiteURL: z
      .url()
      .max(2048)
      .refine((v) => ['http:', 'https:'].includes(new URL(v).protocol)),
    websiteKey: z.string().min(1).max(256),
  })
  .strict();
const uuid = z.uuid();
const paging = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  status: z.enum(['queued', 'processing', 'succeeded', 'failed']).optional(),
});
const dummyPassword = await hashPassword(randomToken());

export async function buildApp(
  adapters: { engine?: SolverEngine; payment?: PaymentProvider; logger?: boolean } = {},
) {
  const engine = adapters.engine ?? solver;
  const payment = adapters.payment ?? payments;
  const app = Fastify({
    bodyLimit: 65536,
    trustProxy: config.TRUSTED_PROXIES.split(',')
      .map((v) => v.trim())
      .filter(Boolean),
    logger:
      adapters.logger === false
        ? false
        : {
            level: 'info',
            redact: [
              'req.headers.authorization',
              'req.headers.cookie',
              'res.headers.set-cookie',
              'req.body',
              'rawBody',
            ],
          },
  });
  await app.register(cookie);
  await app.register(helmet);
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });
  app.removeContentTypeParser('application/json');
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (request, body, done) => {
    try {
      request.rawBody = body as string;
      done(null, JSON.parse(body as string));
    } catch {
      done(new AppError(400, 'INVALID_JSON', 'Invalid JSON body.'));
    }
  });
  app.addHook('onRequest', async (request) => {
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
      !request.url.startsWith('/v1/') &&
      request.url !== '/webhooks/payment'
    ) {
      if (request.headers.origin !== new URL(config.APP_ORIGIN).origin)
        throw new AppError(403, 'INVALID_ORIGIN', 'Request origin is not allowed.');
    }
  });
  app.addHook('onSend', async (_request, reply) => {
    reply.header('Cache-Control', 'no-store');
  });
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError)
      return reply.code(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
        },
      });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
      return reply.code(409).send({
        error: {
          code: 'CONFLICT',
          message: 'An account or record with these details already exists.',
        },
      });
    const status =
      error instanceof AppError
        ? error.statusCode
        : error instanceof Error && 'statusCode' in error && typeof error.statusCode === 'number'
          ? error.statusCode
          : 500;
    if (status >= 500)
      request.log.error(
        {
          err: {
            name: error instanceof Error ? error.name : 'Error',
            message: error instanceof AppError ? error.message : 'Internal operation failed',
          },
          requestId: request.id,
        },
        'Request failed',
      );
    return reply.code(status).send({
      error: {
        code:
          error instanceof AppError
            ? error.code
            : status === 429
              ? 'RATE_LIMITED'
              : 'INTERNAL_ERROR',
        message:
          error instanceof AppError
            ? error.message
            : status === 429
              ? 'Too many requests. Please try again shortly.'
              : 'The request could not be completed.',
      },
      requestId: request.id,
    });
  });
  app.get('/health', async () => {
    await db.$queryRaw`SELECT 1`;
    return { status: 'ok' };
  });
  app.get('/public/config', async () => ({
    pricePerTask: money(config.TASK_PRICE_MICRO_USD),
    currency: 'USD',
    solverAvailable: engine.available,
    paymentsAvailable: payment.available,
    demoMode: config.NODE_ENV !== 'production' && config.DEMO_MODE === 'true',
  }));
  const authLimit = { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } };
  app.post('/auth/register', authLimit, async (request, reply) => {
    const input = z
      .object({ email, password, name: z.string().trim().min(1).max(80) })
      .strict()
      .parse(request.body);
    const user = await db.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash: await hashPassword(input.password),
      },
    });
    await newSession(user.id, reply);
    return reply.code(201).send({ user: publicUser(user) });
  });
  app.post('/auth/login', authLimit, async (request, reply) => {
    const input = z
      .object({ email, password: z.string().min(1).max(128) })
      .strict()
      .parse(request.body);
    const user = await db.user.findUnique({ where: { email: input.email } });
    const valid = await verifyPassword(input.password, user?.passwordHash ?? dummyPassword);
    if (!user || !valid)
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
    await newSession(user.id, reply);
    return { user: publicUser(user) };
  });
  app.post('/auth/logout', async (request, reply) => {
    const token = request.cookies[cookieName];
    if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
    reply.clearCookie(cookieName, cookieOptions);
    return { ok: true };
  });
  app.get('/account', async (request) => ({ user: publicUser(await sessionUser(request)) }));
  app.patch('/account', async (request) => {
    const user = await sessionUser(request);
    const input = z
      .object({
        name: z.string().trim().min(1).max(80),
        timezone: z
          .string()
          .max(100)
          .refine((v) => {
            try {
              new Intl.DateTimeFormat('en', { timeZone: v });
              return true;
            } catch {
              return false;
            }
          }),
      })
      .strict()
      .parse(request.body);
    return { user: publicUser(await db.user.update({ where: { id: user.id }, data: input })) };
  });
  app.post('/account/password', authLimit, async (request, reply) => {
    const user = await sessionUser(request);
    const input = z
      .object({ currentPassword: z.string().min(1).max(128), password })
      .strict()
      .parse(request.body);
    if (!(await verifyPassword(input.currentPassword, user.passwordHash)))
      throw new AppError(400, 'WRONG_PASSWORD', 'Current password is incorrect.');
    await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: { passwordHash: await hashPassword(input.password) },
      }),
      db.session.deleteMany({ where: { userId: user.id } }),
    ]);
    await newSession(user.id, reply);
    return { ok: true };
  });
  app.get('/keys', async (request) => {
    const user = await sessionUser(request);
    return {
      keys: await db.apiKey.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          name: true,
          prefix: true,
          createdAt: true,
          lastUsedAt: true,
          revokedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    };
  });
  app.post('/keys', async (request, reply) => {
    const user = await sessionUser(request);
    const { name } = z
      .object({ name: z.string().trim().min(1).max(80) })
      .strict()
      .parse(request.body);
    const key = `hg_live_${randomToken()}`;
    const record = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id}::uuid FOR UPDATE`;
      if ((await tx.apiKey.count({ where: { userId: user.id, revokedAt: null } })) >= 20)
        throw new AppError(400, 'KEY_LIMIT', 'You can have up to 20 active keys.');
      return tx.apiKey.create({
        data: { userId: user.id, name, prefix: key.slice(0, 16), tokenHash: hashToken(key) },
      });
    });
    return reply.code(201).send({ id: record.id, key, name: record.name, prefix: record.prefix });
  });
  app.delete('/keys/:id', async (request) => {
    const user = await sessionUser(request);
    const id = uuid.parse((request.params as { id: string }).id);
    const changed = await db.apiKey.updateMany({
      where: { id, userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (!changed.count) throw new AppError(404, 'NOT_FOUND', 'Active key not found.');
    return { ok: true };
  });
  async function listTasks(userId: string, query: unknown) {
    const { page, status } = paging.parse(query);
    const where: Prisma.TaskWhereInput = {
      userId,
      ...(status ? { status: status.toUpperCase() as Prisma.EnumTaskStatusFilter['equals'] } : {}),
    };
    const [tasks, total] = await db.$transaction([
      db.task.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * 20,
        take: 20,
      }),
      db.task.count({ where }),
    ]);
    return { tasks: tasks.map((t) => publicTask(t)), total, page, pageSize: 20 };
  }
  app.get('/tasks', async (request) => listTasks((await sessionUser(request)).id, request.query));
  app.post('/tasks', async (request, reply) => {
    const user = await sessionUser(request);
    const input = taskInput.parse(request.body);
    const task = await createTask(user.id, undefined, input, undefined, engine);
    return reply.code(202).send(publicTask(task));
  });
  app.get('/tasks/:id', async (request) => {
    const user = await sessionUser(request);
    const task = await db.task.findFirst({
      where: { id: uuid.parse((request.params as { id: string }).id), userId: user.id },
    });
    if (!task) throw new AppError(404, 'NOT_FOUND', 'Task not found.');
    return publicTask(task, true);
  });
  app.get('/stats', async (request) => {
    const user = await sessionUser(request);
    const { days } = z
      .object({
        days: z.coerce
          .number()
          .pipe(z.union([z.literal(7), z.literal(30), z.literal(90)]))
          .default(30),
      })
      .parse(request.query);
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - days + 1);
    const [totals, daily, types, recent] = await Promise.all([
      db.$queryRaw<
        { total: bigint; solved: bigint; terminal: bigint; average: number | null }[]
      >`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='SUCCEEDED') AS solved, COUNT(*) FILTER (WHERE status IN ('SUCCEEDED','FAILED')) AS terminal, AVG("durationMs") FILTER (WHERE status='SUCCEEDED')::float AS average FROM "Task" WHERE "userId"=${user.id}::uuid AND "createdAt">=${since}`,
      db.$queryRaw<
        { day: Date; solved: bigint; failed: bigint }[]
      >`SELECT date_trunc('day', "createdAt") AS day, COUNT(*) FILTER (WHERE status='SUCCEEDED') AS solved, COUNT(*) FILTER (WHERE status='FAILED') AS failed FROM "Task" WHERE "userId"=${user.id}::uuid AND "createdAt">=${since} GROUP BY day ORDER BY day`,
      db.$queryRaw<
        { type: string; count: bigint }[]
      >`SELECT type, COUNT(*) AS count FROM "Task" WHERE "userId"=${user.id}::uuid AND "createdAt">=${since} GROUP BY type`,
      db.task.findMany({ where: { userId: user.id }, take: 5, orderBy: { createdAt: 'desc' } }),
    ]);
    const t = totals[0];
    const byDay = new Map(daily.map((d) => [d.day.toISOString().slice(0, 10), d]));
    return {
      days,
      timezone: 'UTC',
      balance: money(user.balanceMicro),
      total: Number(t.total),
      solved: Number(t.solved),
      successRate: t.terminal ? (Number(t.solved) / Number(t.terminal)) * 100 : null,
      averageMs: t.average,
      daily: Array.from({ length: days }, (_, i) => {
        const date = new Date(since.getTime() + i * 86400000).toISOString().slice(0, 10);
        const d = byDay.get(date);
        return { date, solved: Number(d?.solved ?? 0), failed: Number(d?.failed ?? 0) };
      }),
      types: types.map((t) => ({ type: t.type, count: Number(t.count) })),
      recent: recent.map((t) => publicTask(t)),
    };
  });
  app.get('/billing', async (request) => {
    const user = await sessionUser(request);
    const { page } = paging.parse(request.query);
    const [entries, total] = await db.$transaction([
      db.ledgerEntry.findMany({
        where: { userId: user.id },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 20,
        skip: (page - 1) * 20,
      }),
      db.ledgerEntry.count({ where: { userId: user.id } }),
    ]);
    return {
      balance: money(user.balanceMicro),
      entries: entries.map((e) => ({
        id: e.id,
        kind: e.kind.toLowerCase(),
        amount: money(e.amountMicro),
        balanceAfter: money(e.balanceAfterMicro),
        createdAt: e.createdAt,
      })),
      page,
      total,
      pageSize: 20,
    };
  });
  app.post(
    '/billing/checkout',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const user = await sessionUser(request);
      const { amount } = z
        .object({ amount: z.number().int().min(5).max(10000) })
        .strict()
        .parse(request.body);
      if (!payment.available)
        throw new AppError(
          503,
          'PAYMENTS_UNAVAILABLE',
          'Checkout is temporarily unavailable. Your balance has not changed.',
        );
      const pending = await db.payment.create({
        data: { userId: user.id, amountMicro: BigInt(amount) * 1_000_000n },
      });
      try {
        const checkout = await payment.checkout({
          paymentId: pending.id,
          amountMicro: pending.amountMicro.toString(),
          currency: 'USD',
          returnURL: `${config.APP_ORIGIN}/app/billing`,
        });
        await db.payment.update({
          where: { id: pending.id },
          data: { providerReference: checkout.reference },
        });
        return reply.code(201).send({ checkoutURL: checkout.checkoutURL, paymentId: pending.id });
      } catch (error) {
        await db.payment.update({ where: { id: pending.id }, data: { status: 'FAILED' } });
        throw error;
      }
    },
  );
  app.post('/webhooks/payment', async (request) => {
    if (!payment.available || !config.PAYMENT_WEBHOOK_SECRET)
      throw new AppError(503, 'PAYMENTS_UNAVAILABLE', 'Payments are not available.');
    const timestamp = String(request.headers['x-huginn-timestamp'] ?? '');
    const signature = String(request.headers['x-huginn-signature'] ?? '');
    if (
      !verifySignature(request.rawBody ?? '', timestamp, signature, config.PAYMENT_WEBHOOK_SECRET)
    )
      throw new AppError(401, 'INVALID_SIGNATURE', 'Invalid webhook signature.');
    const input = z
      .object({
        paymentId: uuid,
        reference: z.string().min(1).max(200),
        amountMicro: z.string().regex(/^\d+$/).max(20),
        currency: z.literal('USD'),
        status: z.literal('confirmed'),
      })
      .strict()
      .parse(request.body);
    await db.$transaction(async (tx) => {
      const pending = await tx.payment.findUnique({ where: { id: input.paymentId } });
      if (
        !pending ||
        pending.providerReference !== input.reference ||
        pending.amountMicro !== BigInt(input.amountMicro)
      )
        throw new AppError(400, 'PAYMENT_MISMATCH', 'Payment details do not match.');
      const changed = await tx.payment.updateMany({
        where: { id: pending.id, status: 'PENDING' },
        data: { status: 'CONFIRMED', confirmedAt: new Date() },
      });
      if (!changed.count) return;
      const user = await tx.user.update({
        where: { id: pending.userId },
        data: { balanceMicro: { increment: pending.amountMicro } },
      });
      await tx.ledgerEntry.create({
        data: {
          userId: user.id,
          paymentId: pending.id,
          kind: 'PAYMENT',
          amountMicro: pending.amountMicro,
          balanceAfterMicro: user.balanceMicro,
        },
      });
    });
    return { ok: true };
  });
  app.get('/v1/balance', async (request) => ({
    balance: money((await apiUser(request)).user.balanceMicro),
    currency: 'USD',
  }));
  app.post('/v1/tasks', async (request, reply) => {
    const { user, apiKeyId } = await apiUser(request);
    const input = taskInput.parse(request.body);
    const key =
      request.headers['idempotency-key'] === undefined
        ? undefined
        : z.string().min(1).max(128).parse(request.headers['idempotency-key']);
    return reply
      .code(202)
      .send(publicTask(await createTask(user.id, apiKeyId, input, key, engine)));
  });
  app.get('/v1/tasks/:id', async (request) => {
    const { user } = await apiUser(request);
    const task = await db.task.findFirst({
      where: { id: uuid.parse((request.params as { id: string }).id), userId: user.id },
    });
    if (!task) throw new AppError(404, 'NOT_FOUND', 'Task not found.');
    return publicTask(task, true);
  });
  return app;
}
