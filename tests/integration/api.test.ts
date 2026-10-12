import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHmac } from 'node:crypto';
process.env.PAYMENT_WEBHOOK_SECRET = 'integration-test-secret-at-least-32-chars';
process.env.SETTINGS_ENCRYPTION_KEY = 'integration-fixture-encryption-key-at-least-32-chars';
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
      const created = await isolated.inject({
        method: 'POST',
        url: '/createTask',
        payload: {
          clientKey: apiKey,
          task: {
            type: 'HCaptchaTaskProxyless',
            websiteURL: 'https://example.test',
            websiteKey: 'fixture',
            userAgent: 'cross-service-transmitted-agent',
            isInvisible: true,
            cookies: 'fixture=value',
            enterprisePayload: { rqdata: 'fixture-rqdata' },
            languagePool: 'en-US',
          },
        },
      });
      assert.equal(created.statusCode, 200);
      assert.equal(created.json().errorId, 0);
      const taskId = created.json().taskId;
      const dbId = taskId.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
      await workOne(realAdapter);
      const completed = await isolated.inject({
        method: 'POST',
        url: '/getTaskResult',
        payload: { clientKey: apiKey, taskId },
      });
      assert.equal(completed.json().status, 'ready');
      assert.equal(
        completed.json().solution.gRecaptchaResponse,
        'explicit-cross-service-test-fixture',
      );
      assert.equal(completed.json().solution.userAgent, 'cross-service-transmitted-agent');
      assert.equal(completed.json().solution.serverAcceptance, 'not_observed');
      assert.equal(
        (await db.user.findUniqueOrThrow({ where: { id: owner.id } })).balanceMicro,
        1_000_000n - BigInt(config.TASK_PRICE_MICRO_USD),
      );
      assert.equal(
        await db.ledgerEntry.count({ where: { taskId: dbId, kind: 'TASK_RESERVE' } }),
        1,
      );
    } finally {
      await isolated.close();
    }
  },
);
before(async () => {
  await db.$connect();
});

test('permanent account keys authorize the 2Captcha protocol, wallet and task ownership', async () => {
  const api = await buildApp({ engine, payment, logger: false });
  try {
    const registered = await api.inject({
      method: 'POST',
      url: '/auth/register',
      headers: { origin },
      payload: { email: `${randomUUID()}@protocol.test`, password: 'testpass', name: 'Protocol' },
    });
    const owner = registered.json().user.id;
    ids.push(owner);
    const session = String(registered.headers['set-cookie']).split(';')[0];
    async function issue(name: string) {
      const response = await api.inject({
        method: 'POST',
        url: '/keys',
        headers: { cookie: session, origin },
        payload: { name },
      });
      assert.equal(response.statusCode, 201);
      return response.json() as { id: string; key: string };
    }
    const first = await issue('Solver');
    const second = await issue('Another integration');
    await db.apiKey.update({
      where: { id: first.id },
      data: { createdAt: new Date('2010-01-01') },
    });
    const call = (url: string, payload: Record<string, unknown>) =>
      api.inject({ method: 'POST', url, payload });
    const task = {
      type: 'HCaptchaTask',
      websiteURL: 'https://example.test',
      websiteKey: 'fixture',
      isInvisible: true,
      userAgent: 'fixture-agent',
      cookies: 'a=1; b=2',
      languagePool: 'en-US',
      enterprisePayload: { rqdata: 'fixture-rqdata' },
      proxyType: 'socks5',
      proxyAddress: '127.0.0.1',
      proxyPort: 9050,
      proxyLogin: 'fixture',
      proxyPassword: 'private-fixture',
    };
    for (const clientKey of [undefined, 'hg_live_unknown']) {
      for (const url of ['/createTask', '/getTaskResult', '/getBalance']) {
        const response = await call(url, { clientKey, task, taskId: randomUUID() });
        assert.equal(response.statusCode, 200);
        assert.equal(response.json().errorCode, 'ERROR_KEY_DOES_NOT_EXIST');
      }
    }
    assert.equal((await call('/getBalance', { clientKey: first.key })).json().balance, 0);
    assert.equal(
      (await call('/createTask', { clientKey: first.key, task })).json().errorCode,
      'ERROR_ZERO_BALANCE',
    );
    assert.equal(await db.task.count({ where: { userId: owner } }), 0);
    await db.user.update({
      where: { id: owner },
      data: { balanceMicro: BigInt(config.TASK_PRICE_MICRO_USD) * 3n },
    });
    const startingBalance = (Number(config.TASK_PRICE_MICRO_USD) * 3) / 1_000_000;
    for (const invalid of [
      { ...task, type: 'UnknownTask' },
      { ...task, proxyPort: 0 },
      { ...task, cookies: 'invalid' },
      { ...task, unknownField: 'invalid' },
    ]) {
      const rejected = await call('/createTask', { clientKey: first.key, task: invalid });
      assert.equal(rejected.statusCode, 200);
      assert.equal(rejected.json().errorId, 1);
    }
    const malformed = await api.inject({
      method: 'POST',
      url: '/createTask',
      headers: { 'content-type': 'application/json' },
      payload: '{invalid',
    });
    assert.equal(malformed.json().errorCode, 'ERROR_BAD_PARAMETERS');
    assert.equal(
      (await call('/getBalance', { clientKey: first.key })).json().balance,
      startingBalance,
    );
    assert.equal(await db.ledgerEntry.count({ where: { userId: owner } }), 0);
    const accepted = await call('/createTask', { clientKey: first.key, task });
    assert.equal(accepted.statusCode, 200);
    assert.equal(accepted.json().errorId, 0);
    const taskId = accepted.json().taskId as string;
    assert.match(taskId, /^[a-f0-9]{32}$/);
    const stored = await db.task.findFirstOrThrow({ where: { userId: owner } });
    assert.equal(stored.apiKeyId, first.id);
    assert.deepEqual(stored.solverTask, task);
    assert.equal(
      (await call('/getTaskResult', { clientKey: second.key, taskId })).json().status,
      'processing',
    );
    const outsider = await db.user.create({
      data: {
        email: `${randomUUID()}@outsider.test`,
        name: 'Other',
        passwordHash: 'unused-fixture',
      },
    });
    ids.push(outsider.id);
    const outsiderKey = `hg_live_${randomUUID()}`;
    await db.apiKey.create({
      data: {
        userId: outsider.id,
        name: 'Other',
        prefix: 'hg_live_fixture',
        tokenHash: hashToken(outsiderKey),
      },
    });
    assert.equal(
      (await call('/getTaskResult', { clientKey: outsiderKey, taskId })).json().errorCode,
      'ERROR_TASK_NOT_FOUND',
    );
    // All previous test tasks have settled; the worker claims this durable payload.
    let dispatched = false;
    await workOne({
      available: true,
      async solve(input) {
        assert.equal(input.taskId, stored.id);
        assert.deepEqual(input.task, task);
        dispatched = true;
        return {
          token: 'protocol-fixture',
          userAgent: 'fixture-agent',
          serverAcceptance: 'not_observed',
        };
      },
    });
    assert.equal(dispatched, true);
    const ready = (await call('/getTaskResult', { clientKey: second.key, taskId })).json();
    assert.equal(ready.status, 'ready');
    assert.equal(ready.solution.gRecaptchaResponse, 'protocol-fixture');
    assert.equal(ready.solution.token, 'protocol-fixture');
    assert.equal(ready.cost, (config.TASK_PRICE_MICRO_USD / 1_000_000).toFixed(6));
    assert.equal((await db.task.findUniqueOrThrow({ where: { id: stored.id } })).solverTask, null);
    const publicRecord = (
      await api.inject({ url: `/tasks/${stored.id}`, headers: { cookie: session } })
    ).json();
    assert.equal(publicRecord.solverTask, undefined);
    assert.equal(publicRecord.proxyPassword, undefined);
    const failure = await call('/createTask', { clientKey: first.key, task });
    const failed = await db.task.findFirstOrThrow({ where: { userId: owner, status: 'QUEUED' } });
    await Promise.all([
      settleTask(failed, null, 'ERROR_CAPTCHA_UNSOLVABLE'),
      settleTask(failed, null),
    ]);
    assert.equal(
      (await call('/getTaskResult', { clientKey: first.key, taskId: failure.json().taskId })).json()
        .errorCode,
      'ERROR_CAPTCHA_UNSOLVABLE',
    );
    assert.equal(
      await db.ledgerEntry.count({ where: { taskId: failed.id, kind: 'TASK_REFUND' } }),
      1,
    );
    const beforeRevoke = (await db.user.findUniqueOrThrow({ where: { id: owner } })).balanceMicro;
    await api.inject({
      method: 'DELETE',
      url: `/keys/${first.id}`,
      headers: { cookie: session, origin },
    });
    for (const url of ['/createTask', '/getTaskResult', '/getBalance'])
      assert.equal(
        (await call(url, { clientKey: first.key, task, taskId })).json().errorCode,
        'ERROR_KEY_DOES_NOT_EXIST',
      );
    // Recheck within the reservation transaction, even after earlier authorization.
    await assert.rejects(
      createTask(
        owner,
        first.id,
        { websiteURL: task.websiteURL, websiteKey: task.websiteKey },
        undefined,
        engine,
      ),
      /invalid or revoked/,
    );
    assert.equal(
      (await db.user.findUniqueOrThrow({ where: { id: owner } })).balanceMicro,
      beforeRevoke,
    );
    await api.inject({ method: 'POST', url: '/auth/logout', headers: { cookie: session, origin } });
    assert.equal((await call('/getBalance', { clientKey: second.key })).json().errorId, 0);
    assert.equal(
      (await call('/getTaskResult', { clientKey: second.key, taskId })).json().status,
      'ready',
    );
    await db.task.update({
      where: { id: stored.id },
      data: { completedAt: new Date(Date.now() - 86400001) },
    });
    assert.equal(
      (await call('/getTaskResult', { clientKey: second.key, taskId })).json().errorCode,
      'ERROR_TASK_NOT_FOUND',
    );
  } finally {
    await api.close();
  }
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

test('database-only administration updates billing live and preserves invoice credentials', async () => {
  const api = await buildApp({ engine, logger: false });
  const { getBillingSettings } = await import('../../server/billing-settings');
  const baseline = await getBillingSettings();
  const originalFetch = globalThis.fetch;
  try {
    const registration = await api.inject({
      method: 'POST',
      url: '/auth/register',
      headers: { origin },
      payload: { email: `${randomUUID()}@admin.test`, password: 'testpass', name: 'Admin fixture' },
    });
    const owner = registration.json().user.id;
    ids.push(owner);
    const headers = { origin, cookie: String(registration.headers['set-cookie']).split(';')[0] };
    assert.equal(registration.json().user.isAdmin, false);
    assert.equal((await api.inject({ url: '/admin/billing' })).statusCode, 401);
    assert.equal((await api.inject({ url: '/admin/billing', headers })).statusCode, 403);
    assert.equal((await api.inject({ url: '/admin/billing/history', headers })).statusCode, 403);
    assert.equal(
      (await api.inject({ method: 'PATCH', url: '/admin/billing', headers, payload: {} }))
        .statusCode,
      403,
    );
    assert.equal(
      (
        await api.inject({
          method: 'PATCH',
          url: '/account',
          headers,
          payload: { name: 'Admin fixture', timezone: 'UTC', isAdmin: true },
        })
      ).statusCode,
      400,
    );
    assert.equal(
      (
        await api.inject({
          method: 'POST',
          url: '/auth/register',
          headers: { origin },
          payload: {
            email: `${randomUUID()}@self-promote.test`,
            name: 'Blocked',
            password: 'testpass',
            isAdmin: true,
          },
        })
      ).statusCode,
      400,
    );
    // The only promotion path is a direct database update.
    await db.user.update({ where: { id: owner }, data: { isAdmin: true, balanceMicro: 100_000n } });
    assert.equal((await api.inject({ url: '/account', headers })).json().user.isAdmin, true);
    const initial = (await api.inject({ url: '/admin/billing', headers })).json();
    const patch = (payload: Record<string, unknown>) =>
      api.inject({ method: 'PATCH', url: '/admin/billing', headers, payload });
    const input = {
      revision: initial.revision,
      pricePerThousand: '7.125',
      topUpMinUsd: 12,
      topUpMaxUsd: 25,
      paymentProvider: 'http',
      paymentURL: 'https://payment-fixture.test/checkout-a',
      paymentSecret: 'fixture-checkout-secret-a',
      webhookSecret: 'fixture-webhook-secret-a-at-least-32-chars',
    };
    assert.equal(
      (
        await api.inject({
          method: 'PATCH',
          url: '/admin/billing',
          headers: { ...headers, origin: 'https://attacker.invalid' },
          payload: input,
        })
      ).statusCode,
      403,
    );
    assert.equal((await patch({ ...input, topUpMaxUsd: 2 })).statusCode, 400);
    assert.equal(
      (await patch({ ...input, paymentURL: 'http://payment-fixture.test' })).statusCode,
      400,
    );
    assert.equal((await patch({ ...input, pricePerThousand: '0' })).statusCode, 400);
    assert.equal((await patch({ ...input, webhookSecret: 'too-short' })).statusCode, 400);
    const accepted = await patch(input);
    assert.equal(accepted.statusCode, 200);
    const settings = accepted.json();
    assert.equal(settings.changedById, owner);
    assert.equal(settings.paymentSecretConfigured, true);
    assert.equal(settings.paymentSecret, undefined);
    assert.equal(settings.webhookSecret, undefined);
    const stored = await getBillingSettings();
    assert.notEqual(stored.paymentSecret, input.paymentSecret);
    assert.notEqual(stored.webhookSecret, input.webhookSecret);
    assert.ok(stored.paymentSecret?.startsWith('v1:'));
    const publicConfig = (await api.inject({ url: '/public/config' })).json();
    assert.equal(publicConfig.pricePerTask, '0.007125');
    assert.equal(publicConfig.topUpMinUsd, 12);
    assert.equal(publicConfig.topUpMaxUsd, 25);
    assert.equal(publicConfig.paymentsAvailable, true);
    assert.equal(publicConfig.paymentURL, undefined);
    assert.equal(publicConfig.paymentSecretConfigured, undefined);
    const task = await createTask(
      owner,
      undefined,
      { websiteURL: 'https://example.test', websiteKey: 'fixture' },
      undefined,
      engine,
    );
    assert.equal(task.reservedMicro, 7125n);
    const seen: { url: string; authorization: string }[] = [];
    globalThis.fetch = async (url, options) => {
      assert.ok(String(url).startsWith('https://payment-fixture.test/'));
      const body = JSON.parse(String(options?.body));
      seen.push({
        url: String(url),
        authorization: new Headers(options?.headers).get('authorization')!,
      });
      return new Response(
        JSON.stringify({
          reference: `fixture-${body.paymentId}`,
          checkoutURL: 'https://payment-fixture.test/pay',
        }),
        { status: 200 },
      );
    };
    const checkout = (amount: number) =>
      api.inject({ method: 'POST', url: '/billing/checkout', headers, payload: { amount } });
    assert.equal((await checkout(10)).statusCode, 400);
    assert.equal((await checkout(26)).statusCode, 400);
    const invoice = await checkout(12);
    assert.equal(invoice.statusCode, 201);
    assert.deepEqual(seen[0], {
      url: input.paymentURL,
      authorization: `Bearer ${input.paymentSecret}`,
    });
    const pending = await db.payment.findUniqueOrThrow({ where: { id: invoice.json().paymentId } });
    assert.equal(pending.billingSettingsId, settings.revision);
    const changed = await patch({
      ...input,
      revision: settings.revision,
      pricePerThousand: '9',
      paymentURL: 'https://payment-fixture.test/checkout-b',
      paymentSecret: 'fixture-checkout-secret-b',
      webhookSecret: 'fixture-webhook-secret-b-at-least-32-chars',
    });
    assert.equal(changed.statusCode, 200);
    assert.equal((await patch(input)).statusCode, 409);
    assert.equal((await checkout(12)).statusCode, 201);
    assert.deepEqual(seen[1], {
      url: 'https://payment-fixture.test/checkout-b',
      authorization: 'Bearer fixture-checkout-secret-b',
    });
    const { paymentSecret: unusedSecret, webhookSecret: unusedWebhook, ...withoutSecrets } = input;
    void unusedSecret;
    void unusedWebhook;
    const disabled = await patch({
      ...withoutSecrets,
      revision: changed.json().revision,
      paymentProvider: 'disabled',
      pricePerThousand: '9',
      clearPaymentSecret: true,
      clearWebhookSecret: true,
    });
    assert.equal(disabled.statusCode, 200);
    assert.equal(disabled.json().webhookSecretConfigured, false);
    assert.equal((await api.inject({ url: '/public/config' })).json().paymentsAvailable, false);
    assert.equal((await checkout(12)).statusCode, 503);
    // Earlier tasks retain the reserved rate, even after the tariff changes.
    await settleTask(task, { token: 'explicit-admin-fixture' });
    assert.equal((await db.task.findUniqueOrThrow({ where: { id: task.id } })).costMicro, 7125n);
    const newer = await createTask(
      owner,
      undefined,
      { websiteURL: 'https://example.test', websiteKey: 'fixture' },
      undefined,
      engine,
    );
    assert.equal(newer.reservedMicro, 9000n);
    await settleTask(newer, null);
    const raw = JSON.stringify({
      paymentId: pending.id,
      reference: pending.providerReference,
      amountMicro: pending.amountMicro.toString(),
      currency: 'USD',
      status: 'confirmed',
    });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const webhook = (secret: string) =>
      api.inject({
        method: 'POST',
        url: '/webhooks/payment',
        payload: raw,
        headers: {
          'content-type': 'application/json',
          'x-huginn-timestamp': timestamp,
          'x-huginn-signature': createHmac('sha256', secret)
            .update(`${timestamp}.${raw}`)
            .digest('hex'),
        },
      });
    assert.equal((await webhook('fixture-webhook-secret-b-at-least-32-chars')).statusCode, 401);
    const before = (await db.user.findUniqueOrThrow({ where: { id: owner } })).balanceMicro;
    assert.equal((await webhook(input.webhookSecret)).statusCode, 200);
    assert.equal((await webhook(input.webhookSecret)).statusCode, 200);
    assert.equal(
      (await db.user.findUniqueOrThrow({ where: { id: owner } })).balanceMicro,
      before + 12_000_000n,
    );
    const history = (await api.inject({ url: '/admin/billing/history', headers })).json();
    assert.ok(
      history.changes.some((entry: { revision: number }) => entry.revision === settings.revision),
    );
    assert.ok(!JSON.stringify(history).includes(input.paymentSecret));
    assert.ok(!JSON.stringify(history).includes(input.webhookSecret));
    // Concurrent admin edits use optimistic revisions: one succeeds, one conflicts.
    const concurrent = await Promise.all([
      patch({
        ...withoutSecrets,
        revision: disabled.json().revision,
        pricePerThousand: '3',
        paymentProvider: 'disabled',
      }),
      patch({
        ...withoutSecrets,
        revision: disabled.json().revision,
        pricePerThousand: '4',
        paymentProvider: 'disabled',
      }),
    ]);
    assert.deepEqual(concurrent.map((response) => response.statusCode).sort(), [200, 409]);
    await db.user.update({ where: { id: owner }, data: { isAdmin: false } });
    assert.equal((await api.inject({ url: '/admin/billing', headers })).statusCode, 403);
    assert.equal((await patch(input)).statusCode, 403);
  } finally {
    globalThis.fetch = originalFetch;
    await db.runtimeSettings.update({
      where: { id: 'billing' },
      data: { billingSettingsId: baseline.id },
    });
    await api.close();
  }
});

test('task catalog keeps drafts private and enforces live per-type rates and availability', async () => {
  const api = await buildApp({ engine, logger: false });
  const { getBillingSettings } = await import('../../server/billing-settings');
  const baseline = await getBillingSettings();
  try {
    const registered = await api.inject({
      method: 'POST',
      url: '/auth/register',
      headers: { origin },
      payload: {
        email: `${randomUUID()}@catalog.test`,
        password: 'testpass',
        name: 'Catalog admin',
      },
    });
    const owner = registered.json().user.id;
    ids.push(owner);
    await db.user.update({ where: { id: owner }, data: { isAdmin: true, balanceMicro: 100_000n } });
    const headers = { origin, cookie: String(registered.headers['set-cookie']).split(';')[0] };
    const keyReply = await api.inject({
      method: 'POST',
      url: '/keys',
      headers,
      payload: { name: 'Catalog fixture' },
    });
    const clientKey = keyReply.json().key;
    let revision = (await api.inject({ url: '/admin/billing', headers })).json().revision;
    const product = {
      id: 'hcaptcha',
      name: 'hCaptcha token',
      pricePerThousand: '3.456',
      enabled: true,
    };
    const draft = {
      id: 'future_token',
      name: 'Future token',
      pricePerThousand: '8',
      enabled: false,
    };
    const patch = (taskProducts: object[]) =>
      api.inject({
        method: 'PATCH',
        url: '/admin/billing',
        headers,
        payload: {
          revision,
          taskProducts,
          topUpMinUsd: 5,
          topUpMaxUsd: 10000,
          paymentProvider: 'disabled',
          paymentURL: '',
        },
      });
    assert.equal((await patch([product, { ...draft, enabled: true }])).statusCode, 400);
    assert.equal((await patch([product, { ...draft, id: product.id }])).statusCode, 400);
    assert.equal((await patch([draft])).statusCode, 400);
    assert.equal((await patch([{ ...product, pricePerThousand: '0' }])).statusCode, 400);
    const saved = await patch([product, draft]);
    assert.equal(saved.statusCode, 200);
    revision = saved.json().revision;
    assert.equal(saved.json().taskProducts[1].supported, false);
    assert.deepEqual((await api.inject({ url: '/public/config' })).json().taskProducts, [
      { id: 'hcaptcha', name: 'hCaptcha token', pricePerTask: '0.003456' },
    ]);
    const request = () =>
      api.inject({
        method: 'POST',
        url: '/createTask',
        payload: {
          clientKey,
          task: {
            type: 'HCaptchaTaskProxyless',
            websiteURL: 'https://example.test',
            websiteKey: 'fixture',
          },
        },
      });
    const accepted = await request();
    assert.equal(accepted.json().errorId, 0);
    const task = await db.task.findFirstOrThrow({ where: { userId: owner } });
    assert.equal(task.type, 'hcaptcha');
    assert.equal(task.reservedMicro, 3456n);
    const disabled = await patch([{ ...product, pricePerThousand: '9', enabled: false }, draft]);
    assert.equal(disabled.statusCode, 200);
    assert.deepEqual((await api.inject({ url: '/public/config' })).json().taskProducts, []);
    const balance = (await db.user.findUniqueOrThrow({ where: { id: owner } })).balanceMicro;
    assert.equal((await request()).json().errorCode, 'ERROR_TASK_NOT_SUPPORTED');
    assert.equal((await db.user.findUniqueOrThrow({ where: { id: owner } })).balanceMicro, balance);
    await settleTask(task, { token: 'catalog-fixture-result' });
    assert.equal((await db.task.findUniqueOrThrow({ where: { id: task.id } })).costMicro, 3456n);
    revision = disabled.json().revision;
    const enabled = await patch([{ ...product, pricePerThousand: '9' }, draft]);
    assert.equal(enabled.statusCode, 200);
    assert.equal((await request()).json().errorId, 0);
    const newer = await db.task.findFirstOrThrow({ where: { userId: owner, status: 'QUEUED' } });
    assert.equal(newer.reservedMicro, 9000n);
    await settleTask(newer, null);
    assert.equal((await db.user.findUniqueOrThrow({ where: { id: owner } })).balanceMicro, balance);
  } finally {
    await db.runtimeSettings.update({
      where: { id: 'billing' },
      data: { billingSettingsId: baseline.id },
    });
    await api.close();
  }
});
