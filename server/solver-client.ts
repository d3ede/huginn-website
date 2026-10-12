import { setTimeout as delay } from 'node:timers/promises';
import { z } from 'zod';
import type { SolverEngine } from './providers';

export class SolverFailure extends Error {
  constructor(public code: string) {
    super(code);
  }
}
const solution = z.object({
  token: z.string().min(1).max(16384),
  serverAcceptance: z.enum(['accepted', 'not_observed']).optional(),
  userAgent: z.string().optional(),
  respKey: z.string().optional(),
});
const result = z.union([
  z.object({ errorId: z.literal(0), status: z.literal('processing') }),
  z.object({ errorId: z.literal(0), status: z.literal('ready'), solution }),
  z.object({ errorId: z.literal(1), errorCode: z.string() }),
]);

export function createMimicSolver({
  baseURL,
  secret,
  pollMs = 1000,
}: {
  baseURL: string;
  secret: string;
  pollMs?: number;
}): SolverEngine {
  const base = baseURL.replace(/\/$/, '');
  async function request(path: string, options: RequestInit, signal: AbortSignal) {
    for (;;) {
      signal.throwIfAborted();
      try {
        const response = await fetch(base + path, {
          ...options,
          redirect: 'error',
          signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]),
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
        });
        if (response.status >= 500 || response.status === 429) {
          await delay(pollMs, undefined, { signal });
          continue;
        }
        if (!response.ok) throw new SolverFailure(`SOLVER_HTTP_${response.status}`);
        return await response.json();
      } catch (error) {
        if (error instanceof SolverFailure || error instanceof SyntaxError) throw error;
        signal.throwIfAborted();
        await delay(pollMs, undefined, { signal });
      }
    }
  }
  return {
    available: true,
    async solve(input, signal) {
      const path = `/internal/tasks/${encodeURIComponent(input.taskId)}`;
      const ack = z.object({ errorId: z.literal(0), taskId: z.string() }).parse(
        await request(
          path,
          {
            method: 'PUT',
            body: JSON.stringify({
              task: {
                type: 'HCaptchaTaskProxyless',
                websiteURL: input.websiteURL,
                websiteKey: input.websiteKey,
              },
            }),
          },
          signal,
        ),
      );
      if (ack.taskId !== input.taskId.replaceAll('-', ''))
        throw new SolverFailure('SOLVER_ID_MISMATCH');
      for (;;) {
        const state = result.parse(await request(path, {}, signal));
        if (state.errorId === 1) throw new SolverFailure(state.errorCode);
        if (state.status === 'ready') return state.solution;
        await delay(pollMs, undefined, { signal });
      }
    },
  };
}
