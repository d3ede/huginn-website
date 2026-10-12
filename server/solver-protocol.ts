import { z, ZodError } from 'zod';
import { AppError } from './errors';

const safeText = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .regex(/^[^\x00-\x1f\x7f]+$/);
const common = {
  websiteURL: z
    .url()
    .max(8192)
    .refine((value) => {
      const url = new URL(value);
      return (
        ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && !url.hash
      );
    }),
  websiteKey: z.string().trim().min(1).max(256),
  isInvisible: z.boolean().optional(),
  userAgent: safeText(2048).optional(),
  cookies: safeText(16384)
    .refine((value) =>
      value.split(';').every((part) => {
        if (!part.trim()) return false;
        const split = part.indexOf('=');
        return split > 0 && /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/.test(part.slice(0, split).trim());
      }),
    )
    .optional(),
  languagePool: z
    .string()
    .regex(/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$/)
    .optional(),
  enterprisePayload: z
    .object({ rqdata: z.string().trim().min(1).max(16384) })
    .strict()
    .optional(),
  websiteContext: z
    .record(z.string(), z.json())
    .refine((v) => Buffer.byteLength(JSON.stringify(v)) <= 4096)
    .optional(),
};
const proxy = z
  .object({
    type: z.literal('HCaptchaTask'),
    ...common,
    proxyType: z.enum(['http', 'https', 'socks5']),
    proxyAddress: safeText(253).refine((value) => !/[\s/?#@]/.test(value)),
    proxyPort: z
      .union([z.number(), z.string().regex(/^\d+$/).transform(Number)])
      .pipe(z.number().int().min(1).max(65535)),
    proxyLogin: safeText(1024).optional(),
    proxyPassword: z.string().max(1024).optional(),
  })
  .strict()
  .refine((v) => (v.proxyLogin === undefined) === (v.proxyPassword === undefined));
const hcaptchaTaskSchema = z.union([
  z.object({ type: z.literal('HCaptchaTaskProxyless'), ...common }).strict(),
  proxy,
]);
// Add a validated task schema here when its solver adapter is available.
// Product IDs connect protocol capabilities to DB-managed names, availability and rates.
export const taskDefinitions = [
  {
    id: 'hcaptcha',
    name: 'hCaptcha',
    basicType: 'HCaptchaTaskProxyless',
    protocolTypes: ['HCaptchaTask', 'HCaptchaTaskProxyless'],
    schema: hcaptchaTaskSchema,
  },
];
export type SolverTask = z.infer<(typeof taskDefinitions)[number]['schema']>;
export function taskDefinition(type: string) {
  return taskDefinitions.find((entry) => entry.protocolTypes.includes(type));
}
export function parseSolverTask(input: unknown): SolverTask {
  const type = z.object({ type: z.string() }).safeParse(input);
  const definition = type.success ? taskDefinition(type.data.type) : undefined;
  if (!definition)
    throw new AppError(400, 'ERROR_TASK_NOT_SUPPORTED', 'This task type is not supported.');
  return definition.schema.parse(input);
}
export const keyRequest = z.object({ clientKey: z.unknown().optional() }).passthrough();
export const resultRequest = z
  .object({
    clientKey: z.string().min(1).max(256),
    taskId: z.string().regex(/^(?:[0-9a-f]{32}|[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})$/i),
  })
  .strict();
export function parseCreateRequest(body: unknown) {
  const envelope = keyRequest.parse(body);
  if (envelope.task === undefined)
    throw new AppError(400, 'ERROR_TASK_ABSENT', 'A task is required.');
  const task = parseSolverTask(envelope.task);
  const request = z
    .object({ clientKey: z.string().min(1).max(256), task: z.unknown() })
    .strict()
    .parse(body);
  return { ...request, task };
}
export function protocolPath(path: string) {
  return ['/createTask', '/getTaskResult', '/getBalance'].includes(path.split('?')[0]);
}
export function protocolError(error: unknown, status = 500) {
  let code = 'ERROR_SERVICE_UNAVAILABLE';
  let description = 'The request could not be completed. Please try again later.';
  if (error instanceof ZodError || status === 400 || status === 413 || status === 415) {
    code = 'ERROR_BAD_PARAMETERS';
    description = 'Missing or invalid request parameters.';
  }
  if (error instanceof AppError) {
    const codes: Record<string, string> = {
      INVALID_API_KEY: 'ERROR_KEY_DOES_NOT_EXIST',
      INSUFFICIENT_BALANCE: 'ERROR_ZERO_BALANCE',
      NOT_FOUND: 'ERROR_TASK_NOT_FOUND',
      SOLVER_UNAVAILABLE: 'ERROR_SERVICE_UNAVAILABLE',
      TASK_TIMEOUT: 'ERROR_CAPTCHA_TIMEOUT',
      TASK_FAILED: 'ERROR_CAPTCHA_UNSOLVABLE',
    };
    code = codes[error.code] ?? (error.code.startsWith('ERROR_') ? error.code : code);
    description = error.message;
  }
  if (status === 429) {
    code = 'ERROR_NO_SLOT_AVAILABLE';
    description = 'Too many requests. Please try again shortly.';
  }
  return { errorId: 1, errorCode: code, errorDescription: description };
}
export function taskUUID(id: string) {
  const hex = id.replaceAll('-', '').toLowerCase();
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
