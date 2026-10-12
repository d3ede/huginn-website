import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHmac } from 'node:crypto';
process.env.PAYMENT_WEBHOOK_SECRET = 'integration-test-secret-at-least-32-chars';
const { buildApp } = await import('../../server/app');
const { db } = await import('../../server/db');
const { createTask, settleTask, workOne } = await import('../../server/tasks');
const { config } = await import('../../server/config');
const { createMimicSolver } = await import('../../server/solver-client');
const { hashToken } = await import('../../server/security');
const engine = {
  available: true,
  async solve() {
    return { token: 'explicit-integration-test-fixture' };
  },
};
const payment = {
  available: true,
  async checkout(input: { paymentId: string }) {
    return {
      reference: `test-${input.paymentId}`,
      checkoutURL: 'https://example.com/test-checkout',
    };
  },
};
const app = await buildApp({ engine, payment, logger: false });
const ids: string[] = [];
const emails = `${randomUUID()}@test.huginn.local`;
let cookie = '';
let userId = '';
let key = '';
let keyId = '';
const origin = new URL(config.APP_ORIGIN).origin;

test(
  'public keyed API settles a real HTTP/Redis/ARQ fixture through the private adapter',
  { skip: !process.env.TEST_SOLVER_URL },
  async () => {
    const realAdapter = createMimicSolver({
      baseURL: process.env.TEST_SOLVER_URL!,
      secret: process.env.TEST_SOLVER_SECRET!,
      pollMs: 10,
    });
    const isolated = await buildApp({ engine: realAdapter, payment, logger: false });
    try {
      const owner = await db.user.create({
        data: {
          email: `${randomUUID()}@cross.test`,
          name: 'Cross-service fixture',
          passwordHash: 'unused-fixture',
          balanceMicro: 1_000_000n,
        },
      });
      ids.push(owner.id);
      const apiKey = `hg_live_${randomUUID()}`;
      await db.apiKey.create({
        data: {
          userId: owner.id,
          name: 'Fixture',
          prefix: 'hg_live_fixture',
          tokenHash: hashToken(apiKey),
        },
      });
      const headers = { authorization: `Bearer ${apiKey}`, 'idempotency-key': 'cross-service' };
      const created = await isolated.inject({
        method: 'POST',
        url: '/v1/tasks',
        headers,
        payload: { type: 'hcaptcha', websiteURL: 'https://example.test', websiteKey: 'fixture' },
      });
      assert.equal(created.statusCode, 202);
      const taskId = created.json().id;
      await workOne(realAdapter);
      const completed = await isolated.inject({ url: `/v1/tasks/${taskId}`, headers });
      assert.equal(completed.json().status, 'succeeded');
      assert.equal(completed.json().result.token, 'explicit-cross-service-test-fixture');
      assert.equal(completed.json().result.serverAcceptance, 'not_observed');
      assert.equal(
        (await db.user.findUniqueOrThrow({ where: { id: owner.id } })).balanceMicro,
        1_000_000n - BigInt(config.TASK_PRICE_MICRO_USD),
      );
      const repeated = await isolated.inject({
        method: 'POST',
        url: '/v1/tasks',
        headers,
        payload: { type: 'hcaptcha', websiteURL: 'https://example.test', websiteKey: 'fixture' },
      });
      assert.equal(repeated.json().id, taskId);
      assert.equal(await db.ledgerEntry.count({ where: { taskId, kind: 'TASK_RESERVE' } }), 1);
    } finally {
      await isolated.close();
    }
  },
);
before(async () => {
  await db.$connect();
});

test('concurrent retries with only one task worth of balance all return the same reservation', async () => {
  const owner = await db.user.create({
    data: {
      email: `${randomUUID()}@last-credit.test`,
      name: 'Fixture',
      passwordHash: 'unused-fixture',
      balanceMicro: BigInt(config.TASK_PRICE_MICRO_USD),
    },
  });
  ids.push(owner.id);
  const results = await Promise.all(
    Array.from({ length: 8 }, () =>
      createTask(
        owner.id,
        undefined,
        { websiteURL: 'https://example.test', websiteKey: 'fixture' },
        'last-credit',
        engine,
      ),
    ),
  );
  assert.equal(new Set(results.map((r) => r.id)).size, 1);
  assert.equal((await db.user.findUniqueOrThrow({ where: { id: owner.id } })).balanceMicro, 0n);
  await settleTask(results[0], null);
  assert.equal(
    (await db.user.findUniqueOrThrow({ where: { id: owner.id } })).balanceMicro,
    BigInt(config.TASK_PRICE_MICRO_USD),
  );
});
after(async () => {
  await app.close();
  await db.ledgerEntry.deleteMany({ where: { userId: { in: ids } } });
  await db.task.deleteMany({ where: { userId: { in: ids } } });
  await db.payment.deleteMany({ where: { userId: { in: ids } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
  await db.$disconnect();
});
test('API lifecycle, account isolation, transaction races, and payment replay', async (t) => {
  await t.test(
    'registration creates a secure session, starts with zero balance, and blocks foreign origins',
    async () => {
      const blocked = await app.inject({
        method: 'POST',
        url: '/auth/register',
        headers: { origin: 'https://attacker.invalid' },
        payload: { email: emails, password: 'testpass', name: 'Test' },
      });
      assert.equal(blocked.statusCode, 403);
      const short = await app.inject({
        method: 'POST',
        url: '/auth/register',
        headers: { origin },
        payload: { email: emails, password: '1234567', name: 'Test' },
      });
      assert.equal(short.statusCode, 400);
      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        headers: { origin },
        payload: { email: emails, password: 'testpass', name: 'Test' },
      });
      assert.equal(response.statusCode, 201);
      userId = response.json().user.id;
      ids.push(userId);
      cookie = String(response.headers['set-cookie']).split(';')[0];
      assert.match(String(response.headers['set-cookie']), /HttpOnly/);
      assert.match(String(response.headers['set-cookie']), /SameSite=Lax/i);
      assert.equal(
        /; Secure/i.test(String(response.headers['set-cookie'])),
        config.APP_ORIGIN.startsWith('https://'),
      );
      assert.equal(cookie.startsWith('__Host-'), config.APP_ORIGIN.startsWith('https://'));
      assert.equal(response.json().user.balance, '0.000000');
      assert.equal(response.json().user.passwordHash, undefined);
      assert.equal((await app.inject({ url: '/account', headers: { cookie } })).statusCode, 200);
      assert.equal((await app.inject({ url: '/account' })).statusCode, 401);
    },
  );
  await t.test(
    'keys are shown once, stored hashed, and authenticate external requests',
    async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/keys',
        headers: { cookie, origin },
        payload: { name: 'Integration test' },
      });
      assert.equal(response.statusCode, 201);
      key = response.json().key;
      keyId = response.json().id;
      const stored = await db.apiKey.findUniqueOrThrow({ where: { id: keyId } });
      assert.notEqual(stored.tokenHash, key);
      assert.equal(stored.tokenHash.length, 64);
      const list = await app.inject({ url: '/keys', headers: { cookie } });
      assert.equal(list.json().keys[0].key, undefined);
      assert.equal(list.json().keys[0].tokenHash, undefined);
      assert.equal(
        (await app.inject({ url: '/v1/balance', headers: { authorization: `Bearer ${key}` } }))
          .statusCode,
        200,
      );
      assert.equal(
        (
          await app.inject({
            method: 'POST',
            url: '/v1/tasks',
            headers: { authorization: `Bearer ${key}` },
            payload: { type: 'recaptcha', websiteURL: 'https://example.com', websiteKey: 'test' },
          })
        ).statusCode,
        400,
      );
      assert.equal(
        (
          await app.inject({
            method: 'POST',
            url: '/v1/tasks',
            headers: { authorization: `Bearer ${key}` },
            payload: { type: 'hcaptcha', websiteURL: 'https://example.com', websiteKey: 'test' },
          })
        ).statusCode,
        402,
      );
    },
  );
  await t.test(
    'concurrent reservations cannot overdraw balance and duplicate failure settlement refunds once',
    async () => {
      await db.user.update({
        where: { id: userId },
        data: { balanceMicro: BigInt(config.TASK_PRICE_MICRO_USD) * 3n },
      });
      const results = await Promise.allSettled(
        Array.from({ length: 10 }, (_, i) =>
          createTask(
            userId,
            keyId,
            { websiteURL: 'https://example.com', websiteKey: 'test' },
            `race-${i}`,
            engine,
          ),
        ),
      );
      const accepted = results.filter(
        (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof createTask>>> =>
          r.status === 'fulfilled',
      );
      assert.equal(accepted.length, 3);
      assert.equal((await db.user.findUniqueOrThrow({ where: { id: userId } })).balanceMicro, 0n);
      const task = accepted[0].value;
      await Promise.all([settleTask(task, null), settleTask(task, null)]);
      assert.equal(
        (await db.user.findUniqueOrThrow({ where: { id: userId } })).balanceMicro,
        BigInt(config.TASK_PRICE_MICRO_USD),
      );
      assert.equal(
        await db.ledgerEntry.count({ where: { taskId: task.id, kind: 'TASK_REFUND' } }),
        1,
      );
      for (const other of accepted.slice(1)) await settleTask(other.value, null);
    },
  );
  await t.test(
    'idempotent task creation reserves once and validates conflicting input',
    async () => {
      const input = { websiteURL: 'https://example.com', websiteKey: 'test' };
      const [first, second] = await Promise.all([
        createTask(userId, keyId, input, 'same-key', engine),
        createTask(userId, keyId, input, 'same-key', engine),
      ]);
      assert.equal(first.id, second.id);
      assert.equal(
        await db.ledgerEntry.count({ where: { taskId: first.id, kind: 'TASK_RESERVE' } }),
        1,
      );
      await assert.rejects(
        createTask(userId, keyId, { ...input, websiteKey: 'different' }, 'same-key', engine),
        /different task/,
      );
      assert.equal(await workOne(engine), true);
      const solved = await db.task.findUniqueOrThrow({ where: { id: first.id } });
      assert.equal(solved.status, 'SUCCEEDED');
      assert.equal(solved.costMicro, BigInt(config.TASK_PRICE_MICRO_USD));
      const response = await app.inject({
        url: `/v1/tasks/${first.id}`,
        headers: { authorization: `Bearer ${key}` },
      });
      assert.equal(response.json().result.token, 'explicit-integration-test-fixture');
    },
  );
  await t.test('unavailable providers never reserve or fake a successful payment', async () => {
    const disabled = await buildApp({
      logger: false,
      engine: { ...engine, available: false },
      payment: { ...payment, available: false },
    });
    const before = (await db.user.findUniqueOrThrow({ where: { id: userId } })).balanceMicro;
    const task = await disabled.inject({
      method: 'POST',
      url: '/v1/tasks',
      headers: { authorization: `Bearer ${key}` },
      payload: { type: 'hcaptcha', websiteURL: 'https://example.com', websiteKey: 'test' },
    });
    assert.equal(task.statusCode, 503);
    const checkout = await disabled.inject({
      method: 'POST',
      url: '/billing/checkout',
      headers: { cookie, origin },
      payload: { amount: 10 },
    });
    assert.equal(checkout.statusCode, 503);
    assert.equal((await db.user.findUniqueOrThrow({ where: { id: userId } })).balanceMicro, before);
    await disabled.close();
  });
  await t.test(
    'worker shutdown preserves the reservation and resumes the same solver identity',
    async () => {
      const task = await createTask(
        userId,
        keyId,
        { websiteURL: 'https://example.test/resume', websiteKey: 'fixture' },
        'resume',
        engine,
      );
      const reservedBalance = (await db.user.findUniqueOrThrow({ where: { id: userId } }))
        .balanceMicro;
      const shutdown = new AbortController();
      const observed: string[] = [];
      await workOne(
        {
          available: true,
          async solve(input, signal) {
            observed.push(input.taskId);
            shutdown.abort();
            signal.throwIfAborted();
            return { token: 'unreachable' };
          },
        },
        shutdown.signal,
      );
      const interrupted = await db.task.findUniqueOrThrow({ where: { id: task.id } });
      assert.equal(interrupted.status, 'PROCESSING');
      assert.equal(interrupted.leaseId, null);
      assert.equal(
        (await db.user.findUniqueOrThrow({ where: { id: userId } })).balanceMicro,
        reservedBalance,
      );
      await workOne({
        available: true,
        async solve(input) {
          observed.push(input.taskId);
          return {
            token: 'resumed-fixture',
            serverAcceptance: 'not_observed',
            userAgent: 'fixture-agent',
          };
        },
      });
      assert.deepEqual(observed, [task.id, task.id]);
      const finished = await db.task.findUniqueOrThrow({ where: { id: task.id } });
      assert.equal(finished.status, 'SUCCEEDED');
      assert.equal(finished.startedAt!.getTime(), interrupted.startedAt!.getTime());
      assert.equal(finished.serverAcceptance, 'not_observed');
      await settleTask(finished, null);
      assert.equal(
        (await db.user.findUniqueOrThrow({ where: { id: userId } })).balanceMicro,
        reservedBalance,
      );
      assert.equal(
        await db.ledgerEntry.count({ where: { taskId: task.id, kind: 'TASK_RESERVE' } }),
        1,
      );
      assert.equal(
        await db.ledgerEntry.count({ where: { taskId: task.id, kind: 'TASK_REFUND' } }),
        0,
      );
    },
  );
  await t.test(
    'an expired processing job refunds once and an old lease cannot settle it',
    async () => {
      const task = await createTask(
        userId,
        keyId,
        { websiteURL: 'https://example.test/timeout', websiteKey: 'fixture' },
        'timeout',
        engine,
      );
      const oldLease = randomUUID();
      await db.task.update({
        where: { id: task.id },
        data: {
          status: 'PROCESSING',
          leaseId: oldLease,
          leaseUntil: new Date(Date.now() - 1000),
          startedAt: new Date(Date.now() - (config.TASK_TIMEOUT_SECONDS + 1) * 1000),
        },
      });
      let called = false;
      await workOne({
        available: true,
        async solve() {
          called = true;
          return { token: 'unreachable' };
        },
      });
      assert.equal(called, false);
      const finished = await db.task.findUniqueOrThrow({ where: { id: task.id } });
      assert.equal(finished.errorCode, 'TASK_TIMEOUT');
      await settleTask(task, { token: 'late-fixture' }, 'TASK_FAILED', oldLease);
      await settleTask(task, null);
      assert.equal((await db.task.findUniqueOrThrow({ where: { id: task.id } })).status, 'FAILED');
      assert.equal(
        await db.ledgerEntry.count({ where: { taskId: task.id, kind: 'TASK_REFUND' } }),
        1,
      );
    },
  );
  await t.test('signed confirmed webhook credits once even under concurrent replay', async () => {
    const checkout = await app.inject({
      method: 'POST',
      url: '/billing/checkout',
      headers: { cookie, origin },
      payload: { amount: 10 },
    });
    assert.equal(checkout.statusCode, 201);
    const pending = await db.payment.findUniqueOrThrow({
      where: { id: checkout.json().paymentId },
    });
    const before = (await db.user.findUniqueOrThrow({ where: { id: userId } })).balanceMicro;
    assert.equal(pending.status, 'PENDING');
    const raw = JSON.stringify({
      paymentId: pending.id,
      reference: pending.providerReference,
      amountMicro: pending.amountMicro.toString(),
      currency: 'USD',
      status: 'confirmed',
    });
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = createHmac('sha256', process.env.PAYMENT_WEBHOOK_SECRET!)
      .update(`${timestamp}.${raw}`)
      .digest('hex');
    const invalid = await app.inject({
      method: 'POST',
      url: '/webhooks/payment',
      payload: raw,
      headers: {
        'content-type': 'application/json',
        'x-huginn-timestamp': timestamp,
        'x-huginn-signature': '0'.repeat(64),
      },
    });
    assert.equal(invalid.statusCode, 401);
    const responses = await Promise.all(
      Array.from({ length: 4 }, () =>
        app.inject({
          method: 'POST',
          url: '/webhooks/payment',
          payload: raw,
          headers: {
            'content-type': 'application/json',
            'x-huginn-timestamp': timestamp,
            'x-huginn-signature': signature,
          },
        }),
      ),
    );
    assert.ok(responses.every((r) => r.statusCode === 200));
    assert.equal(
      (await db.user.findUniqueOrThrow({ where: { id: userId } })).balanceMicro,
      before + 10_000_000n,
    );
    assert.equal(await db.ledgerEntry.count({ where: { paymentId: pending.id } }), 1);
  });
  await t.test(
    'other accounts cannot read tasks or revoke keys; revocation immediately denies access',
    async () => {
      const second = await app.inject({
        method: 'POST',
        url: '/auth/register',
        headers: { origin },
        payload: { email: `second-${emails}`, password: 'testpass', name: 'Other' },
      });
      ids.push(second.json().user.id);
      const secondCookie = String(second.headers['set-cookie']).split(';')[0];
      const task = await db.task.findFirstOrThrow({ where: { userId } });
      assert.equal(
        (await app.inject({ url: `/tasks/${task.id}`, headers: { cookie: secondCookie } }))
          .statusCode,
        404,
      );
      assert.equal(
        (
          await app.inject({
            method: 'DELETE',
            url: `/keys/${keyId}`,
            headers: { cookie: secondCookie, origin },
          })
        ).statusCode,
        404,
      );
      assert.equal(
        (await app.inject({ method: 'DELETE', url: `/keys/${keyId}`, headers: { cookie, origin } }))
          .statusCode,
        200,
      );
      assert.equal(
        (await app.inject({ url: '/v1/balance', headers: { authorization: `Bearer ${key}` } }))
          .statusCode,
        401,
      );
    },
  );
  await t.test(
    'stats are aggregated from stored tasks and logout invalidates the session',
    async () => {
      const stats = await app.inject({ url: '/stats?days=7', headers: { cookie } });
      assert.equal(stats.statusCode, 200);
      assert.equal(stats.json().solved, 2);
      assert.equal(stats.json().daily.length, 7);
      assert.equal(stats.json().total, 6);
      assert.equal(
        stats.json().daily.reduce((sum: number, day: { solved: number }) => sum + day.solved, 0),
        stats.json().solved,
      );
      assert.equal(
        (await app.inject({ method: 'POST', url: '/auth/logout', headers: { cookie, origin } }))
          .statusCode,
        200,
      );
      assert.equal((await app.inject({ url: '/account', headers: { cookie } })).statusCode, 401);
      assert.equal(
        (
          await app.inject({
            method: 'POST',
            url: '/auth/login',
            headers: { origin },
            payload: { email: emails, password: 'incorrect' },
          })
        ).statusCode,
        401,
      );
    },
  );
  await t.test(
    'password rotation invalidates existing sessions and rejects the old password',
    async () => {
      const login = await app.inject({
        method: 'POST',
        url: '/auth/login',
        headers: { origin },
        payload: { email: emails, password: 'testpass' },
      });
      assert.equal(login.statusCode, 200);
      const oldCookie = String(login.headers['set-cookie']).split(';')[0];
      const changed = await app.inject({
        method: 'POST',
        url: '/account/password',
        headers: { origin, cookie: oldCookie },
        payload: { currentPassword: 'testpass', password: 'a newer test password' },
      });
      assert.equal(changed.statusCode, 200);
      assert.equal(
        (await app.inject({ url: '/account', headers: { cookie: oldCookie } })).statusCode,
        401,
      );
      const newCookie = String(changed.headers['set-cookie']).split(';')[0];
      assert.equal(
        (await app.inject({ url: '/account', headers: { cookie: newCookie } })).statusCode,
        200,
      );
      assert.equal(
        (
          await app.inject({
            method: 'POST',
            url: '/auth/login',
            headers: { origin },
            payload: { email: emails, password: 'testpass' },
          })
        ).statusCode,
        401,
      );
    },
  );
});
