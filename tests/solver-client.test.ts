import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { createMimicSolver } from '../server/solver-client';

test('lost dispatch response retries one identity, polls, and preserves acceptance evidence', async () => {
  const identity = randomUUID();
  let puts = 0;
  let gets = 0;
  const jobs = new Set<string>();
  const server = createServer((req, res) => {
    assert.equal(req.headers.authorization, 'Bearer test-secret');
    assert.equal(req.url, `/internal/tasks/${identity}`);
    res.setHeader('Content-Type', 'application/json');
    if (req.method === 'PUT') {
      jobs.add(req.url!);
      puts++;
      if (puts === 1) {
        req.resume();
        req.socket.destroy();
        return;
      }
      res.end(JSON.stringify({ errorId: 0, taskId: identity.replaceAll('-', '') }));
    } else {
      gets++;
      res.end(
        JSON.stringify(
          gets === 1
            ? { errorId: 0, status: 'processing' }
            : {
                errorId: 0,
                status: 'ready',
                solution: {
                  token: 'test-fixture',
                  userAgent: 'fixture-agent',
                  serverAcceptance: 'not_observed',
                },
              },
        ),
      );
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address() as { port: number };
    const engine = createMimicSolver({
      baseURL: `http://127.0.0.1:${address.port}`,
      secret: 'test-secret',
      pollMs: 1,
    });
    const result = await engine.solve(
      { taskId: identity, websiteURL: 'https://example.test', websiteKey: 'fixture' },
      AbortSignal.timeout(5000),
    );
    assert.equal(result.token, 'test-fixture');
    assert.equal(result.serverAcceptance, 'not_observed');
    assert.equal(puts, 2);
    assert.equal(gets, 2);
    assert.equal(jobs.size, 1);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('service authentication failure is terminal and does not enter a retry loop', async () => {
  let requests = 0;
  const server = createServer((_req, res) => {
    requests++;
    res.writeHead(401);
    res.end('{}');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const engine = createMimicSolver({
      baseURL: `http://127.0.0.1:${(server.address() as { port: number }).port}`,
      secret: 'fixture',
      pollMs: 1,
    });
    await assert.rejects(
      engine.solve(
        { taskId: randomUUID(), websiteURL: 'https://example.test', websiteKey: 'fixture' },
        AbortSignal.timeout(5000),
      ),
      /SOLVER_HTTP_401/,
    );
    assert.equal(requests, 1);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
