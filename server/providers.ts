import { z } from 'zod';
import { config } from './config';
import { AppError } from './errors';
import { createMimicSolver } from './solver-client';

export type SolverResult = {
  token: string;
  serverAcceptance?: string;
  userAgent?: string;
  respKey?: string;
};

export interface SolverEngine {
  available: boolean;
  solve(
    input: { taskId: string; websiteURL: string; websiteKey: string },
    signal: AbortSignal,
  ): Promise<SolverResult>;
}
export interface PaymentProvider {
  available: boolean;
  checkout(input: {
    paymentId: string;
    amountMicro: string;
    currency: 'USD';
    returnURL: string;
  }): Promise<{ reference: string; checkoutURL: string }>;
}
const resultSchema = z.object({ token: z.string().min(1).max(16384) });
const checkoutSchema = z.object({
  reference: z.string().min(1).max(200),
  checkoutURL: z.url().refine((v) => new URL(v).protocol === 'https:'),
});
const httpSolver: SolverEngine = {
  available: config.SOLVER_PROVIDER === 'http',
  async solve(input, signal) {
    if (!this.available)
      throw new AppError(503, 'SOLVER_UNAVAILABLE', 'Task processing is temporarily unavailable.');
    const response = await fetch(config.SOLVER_URL, {
      method: 'POST',
      signal,
      redirect: 'error',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.SOLVER_SECRET}`,
      },
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error('Provider rejected request');
    return resultSchema.parse(await response.json());
  },
};
export const solver =
  config.SOLVER_PROVIDER === 'mimic'
    ? createMimicSolver({ baseURL: config.SOLVER_URL, secret: config.SOLVER_SECRET })
    : httpSolver;
export const payments: PaymentProvider = {
  available: config.PAYMENT_PROVIDER === 'http',
  async checkout(input) {
    if (!this.available)
      throw new AppError(
        503,
        'PAYMENTS_UNAVAILABLE',
        'Checkout is temporarily unavailable. Your balance has not changed.',
      );
    const response = await fetch(config.PAYMENT_URL, {
      method: 'POST',
      signal: AbortSignal.timeout(15000),
      redirect: 'error',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.PAYMENT_SECRET}`,
      },
      body: JSON.stringify(input),
    });
    if (!response.ok)
      throw new AppError(
        502,
        'PAYMENT_PROVIDER_ERROR',
        'Unable to start checkout. Please try again later.',
      );
    return checkoutSchema.parse(await response.json());
  },
};
