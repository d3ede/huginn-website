import { setTimeout as delay } from 'node:timers/promises';
import { z } from 'zod';
import type { SolverEngine } from './providers';
import { reportSummarySchema, solveReportSchema } from './report-schema';

export class SolverFailure extends Error {
  constructor(
    public code: string,
    public telemetry?: Pick<import('./providers').SolverResult, 'solveMode' | 'reportSummary'>,
  ) {
    super(code);
  }
}
const solution = z.object({
  token: z.string().min(1).max(16384),
  serverAcceptance: z.enum(['accepted', 'not_observed']).optional(),
  userAgent: z.string().optional(),
  respKey: z.string().optional(),
  solveMode: z.enum(['instant', 'challenge', 'unknown']).optional().catch(undefined),
  reportSummary: reportSummarySchema.optional().catch(undefined),
});
const result = z.union([
  z.object({ errorId: z.literal(0), status: z.literal('processing') }),
  z.object({ errorId: z.literal(0), status: z.literal('ready'), solution }),
  z.object({
    errorId: z.literal(1),
    errorCode: z.string(),
    solveMode: solution.shape.solveMode,
    reportSummary: reportSummarySchema.optional(),
  }),
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
    async report(taskId) {
      const response = await fetch(`${base}/internal/reports/${encodeURIComponent(taskId)}`, {
        headers: { Authorization: `Bearer ${secret}` },
        redirect: 'error',
        signal: AbortSignal.timeout(10000),
      });
      if (response.status === 404) return null;
      if (!response.ok) throw new SolverFailure('REPORT_UNAVAILABLE');
      const report = solveReportSchema.parse(await response.json());
      if (report.runId !== taskId.replaceAll('-', ''))
        throw new SolverFailure('REPORT_ID_MISMATCH');
      return report;
    },
    async reportImage(taskId, imageId) {
      const response = await fetch(
        `${base}/internal/reports/${encodeURIComponent(taskId)}/images/${imageId}`,
        {
          headers: { Authorization: `Bearer ${secret}` },
          redirect: 'error',
          signal: AbortSignal.timeout(10000),
        },
      );
      if (response.status === 404) return null;
      const contentType = response.headers.get('content-type')?.split(';')[0] ?? '';
      if (
        !response.ok ||
        !['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(contentType)
      )
        throw new SolverFailure('REPORT_IMAGE_UNAVAILABLE');
      const chunks: Uint8Array[] = [];
      let size = 0;
      const reader = response.body!.getReader();
      try {
        for (;;) {
          const { done, value: chunk } = await reader.read();
          if (done) break;
          size += chunk.length;
          if (size > 10_000_000) throw new SolverFailure('REPORT_IMAGE_TOO_LARGE');
          chunks.push(chunk);
        }
      } finally {
        await reader.cancel();
      }
      return { data: Buffer.concat(chunks), contentType };
    },
    async solve(input, signal) {
      const path = `/internal/tasks/${encodeURIComponent(input.taskId)}`;
      const ack = z
        .union([
          z.object({ errorId: z.literal(0), taskId: z.string() }),
          z.object({ errorId: z.literal(1), errorCode: z.string() }),
        ])
        .parse(
          await request(
            path,
            {
              method: 'PUT',
              body: JSON.stringify({
                task: input.task ?? {
                  type: 'HCaptchaTaskProxyless',
                  websiteURL: input.websiteURL,
                  websiteKey: input.websiteKey,
                },
              }),
            },
            signal,
          ),
        );
      if (ack.errorId === 1) throw new SolverFailure(ack.errorCode);
      if (ack.taskId !== input.taskId.replaceAll('-', ''))
        throw new SolverFailure('SOLVER_ID_MISMATCH');
      for (;;) {
        const state = result.parse(await request(path, {}, signal));
        if (state.errorId === 1) throw new SolverFailure(state.errorCode, state);
        if (state.status === 'ready') return state.solution;
        await delay(pollMs, undefined, { signal });
      }
    },
  };
}
