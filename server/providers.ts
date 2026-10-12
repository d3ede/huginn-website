import { z } from 'zod';
import { config } from './config';
import { AppError } from './errors';

export interface SolverEngine {
  available: boolean;
  solve(
    input: { taskId: string; websiteURL: string; websiteKey: string },
    signal: AbortSignal,
  ): Promise<{ token: string }>;
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
export const solver: SolverEngine = {
  available: config.SOLVER_PROVIDER === 'http',
  async solve(input, signal) {
    if (!this.available)
      throw new AppError(503, 'SOLVER_UNAVAILABLE', 'Task processing is not available yet.');
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
export const payments: PaymentProvider = {
  available: config.PAYMENT_PROVIDER === 'http',
  async checkout(input) {
    if (!this.available)
      throw new AppError(
        503,
        'PAYMENTS_UNAVAILABLE',
        'Payments are not available yet. Your balance has not changed.',
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
