import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  APP_ORIGIN: z.url().default('http://localhost:3000'),
  API_HOST: z.string().default('127.0.0.1'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  SESSION_DAYS: z.coerce.number().int().min(1).max(30).default(7),
  TASK_PRICE_MICRO_USD: z.coerce.number().int().min(1).max(1_000_000).default(2000),
  TASK_TIMEOUT_SECONDS: z.coerce.number().int().min(10).max(600).default(120),
  SOLVER_PROVIDER: z.enum(['disabled', 'http']).default('disabled'),
  SOLVER_URL: z.string().default(''),
  SOLVER_SECRET: z.string().default(''),
  PAYMENT_PROVIDER: z.enum(['disabled', 'http']).default('disabled'),
  PAYMENT_URL: z.string().default(''),
  PAYMENT_SECRET: z.string().default(''),
  PAYMENT_WEBHOOK_SECRET: z.string().default(''),
  DEMO_MODE: z.string().default('false'),
});
export const config = schema.parse(process.env);
if (
  config.NODE_ENV === 'production' &&
  (config.DEMO_MODE === 'true' || !config.APP_ORIGIN.startsWith('https://'))
) {
  throw new Error('Production requires HTTPS and DEMO_MODE=false');
}
for (const prefix of ['SOLVER', 'PAYMENT'] as const) {
  if (config[`${prefix}_PROVIDER`] === 'http') {
    const url = new URL(config[`${prefix}_URL`]);
    if (
      !config[`${prefix}_SECRET`] ||
      (config.NODE_ENV === 'production' && url.protocol !== 'https:')
    )
      throw new Error(`Invalid ${prefix} adapter configuration`);
  }
}
if (config.PAYMENT_PROVIDER === 'http' && config.PAYMENT_WEBHOOK_SECRET.length < 32)
  throw new Error('Payment webhook secret must be at least 32 characters');
