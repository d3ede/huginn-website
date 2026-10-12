import { z } from 'zod';
import type { ReportAnswer } from '../lib/admin-types';
const number = z.number().finite().nonnegative();
export const reportSummarySchema = z.object({
  rounds: number.int(),
  modelCalls: number.int(),
  inputTokens: number,
  outputTokens: number,
  modelCostUsd: number.nullable(),
  costComplete: z.boolean(),
});
const answer: z.ZodType<ReportAnswer> = z.lazy(() =>
  z.union([
    z.null(),
    z.number().finite(),
    z.boolean(),
    z.array(answer).max(100),
    z.record(z.string().max(80), answer),
  ]),
);
export const solveReportSchema = z.object({
  runId: z.string().max(128),
  status: z.string().max(100),
  serverAcceptance: z.string().max(100).nullable(),
  solveMode: z.enum(['instant', 'challenge', 'unknown']),
  createdAt: z.string(),
  finishedAt: z.string(),
  expiresAt: z.string(),
  durationMs: number.nullable(),
  summary: reportSummarySchema,
  phases: z
    .array(
      z.object({
        name: z.string().max(300),
        durationMs: number.nullable(),
        count: number.nullable(),
      }),
    )
    .max(80),
  models: z
    .array(
      z.object({
        model: z.string().max(300),
        phase: z.string().max(300),
        durationMs: number.nullable(),
        inputTokens: number.nullable(),
        outputTokens: number.nullable(),
        costUsd: number.nullable(),
        outcome: z.string().max(300),
      }),
    )
    .max(200),
  rounds: z
    .array(
      z.object({
        index: number.int(),
        label: z.string().max(500),
        type: z.string().max(300),
        contractSource: z.string().max(300),
        attempts: number.nullable(),
        actionMs: number.nullable(),
        answer,
        observed: answer,
        images: z
          .array(z.object({ id: number.int(), label: z.string().max(80), overlay: z.boolean() }))
          .max(256),
      }),
    )
    .max(100),
});
