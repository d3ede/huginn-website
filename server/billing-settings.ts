import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import type { BillingSettings } from '@prisma/client';
import { z } from 'zod';
import { db } from './db';
import { config } from './config';
import { AppError } from './errors';
import { money } from './security';
import { taskDefinitions } from './solver-protocol';

const productFields = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/),
    name: z.string().trim().min(1).max(80),
    priceMicro: z.number().int().min(1).max(1000000),
    enabled: z.boolean(),
  })
  .strict();
const catalog = z
  .array(productFields)
  .min(1)
  .max(100)
  .refine(
    (entries) => new Set(entries.map((entry) => entry.id)).size === entries.length,
    'Task product IDs must be unique.',
  );
const formatRate = (price: number) =>
  money(price * 1000)
    .replace(/0+$/, '')
    .replace(/\.$/, '');
export function taskProducts(settings: BillingSettings) {
  return catalog.parse(settings.taskProducts).map((entry) => ({
    ...entry,
    supported: taskDefinitions.some((definition) => definition.id === entry.id),
    pricePerThousand: formatRate(entry.priceMicro),
  }));
}
function priceMicro(value: string) {
  const [whole, fraction = ''] = value.split('.');
  return Number(whole) * 1000 + Number(fraction.padEnd(3, '0'));
}

function encryptionKey() {
  if (config.SETTINGS_ENCRYPTION_KEY.length < 32)
    throw new AppError(
      503,
      'SETTINGS_KEY_REQUIRED',
      'Configure SETTINGS_ENCRYPTION_KEY before storing payment credentials.',
    );
  return createHash('sha256').update(config.SETTINGS_ENCRYPTION_KEY).digest();
}
function encrypt(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  cipher.setAAD(Buffer.from('huginn-billing-v1'));
  const data = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return [
    'v1',
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    data.toString('base64url'),
  ].join(':');
}
export function paymentSecret(value: string | null) {
  if (!value) return '';
  const [version, iv, tag, data] = value.split(':');
  if (version !== 'v1') throw new Error('Unsupported credential encoding');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'base64url'));
  decipher.setAAD(Buffer.from('huginn-billing-v1'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(data, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}
const fields = z
  .object({
    priceMicro: z.number().int().min(1).max(1000000),
    topUpMinUsd: z.number().int().min(1).max(1000000),
    topUpMaxUsd: z.number().int().min(1).max(1000000),
    paymentProvider: z.enum(['disabled', 'http']),
    paymentURL: z.string().max(2048),
  })
  .refine((v) => v.topUpMaxUsd >= v.topUpMinUsd, 'Maximum top-up must be at least the minimum.');
function validateProvider(
  value: z.infer<typeof fields>,
  secret: string | null,
  webhook: string | null,
) {
  if (value.paymentProvider !== 'http') return;
  const url = z.url().parse(value.paymentURL);
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.hash)
    throw new AppError(
      400,
      'INVALID_PAYMENT_URL',
      'The payment endpoint requires HTTPS without credentials or fragments.',
    );
  if (!secret || !webhook)
    throw new AppError(
      400,
      'PAYMENT_CREDENTIALS_REQUIRED',
      'Configure both payment and webhook secrets before enabling checkout.',
    );
  if (paymentSecret(webhook).length < 32)
    throw new AppError(
      400,
      'PAYMENT_CREDENTIALS_REQUIRED',
      'Webhook secrets must contain at least 32 characters.',
    );
}
export async function getBillingSettings(): Promise<BillingSettings> {
  const current = await db.runtimeSettings.findUnique({
    where: { id: 'billing' },
    include: { billingSettings: true },
  });
  if (current) return current.billingSettings;
  // Environment settings seed the database once. Later reads always use the DB.
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(62429108)`;
    if (await tx.runtimeSettings.findUnique({ where: { id: 'billing' } })) return;
    const initial = fields.parse({
      priceMicro: config.TASK_PRICE_MICRO_USD,
      topUpMinUsd: 5,
      topUpMaxUsd: 10000,
      paymentProvider: config.PAYMENT_PROVIDER,
      paymentURL: config.PAYMENT_URL,
    });
    if (config.PAYMENT_PROVIDER === 'http' && config.PAYMENT_WEBHOOK_SECRET.length < 32)
      throw new AppError(
        400,
        'PAYMENT_CREDENTIALS_REQUIRED',
        'Webhook secrets must contain at least 32 characters.',
      );
    const secret = config.PAYMENT_SECRET ? encrypt(config.PAYMENT_SECRET) : null;
    const webhook = config.PAYMENT_WEBHOOK_SECRET ? encrypt(config.PAYMENT_WEBHOOK_SECRET) : null;
    validateProvider(initial, secret, webhook);
    const settings = await tx.billingSettings.create({
      data: {
        ...initial,
        taskProducts: [
          { id: 'hcaptcha', name: 'hCaptcha', priceMicro: initial.priceMicro, enabled: true },
        ],
        paymentSecret: secret,
        webhookSecret: webhook,
      },
    });
    await tx.runtimeSettings.create({ data: { id: 'billing', billingSettingsId: settings.id } });
    // Preserve the startup webhook credentials for invoices made before this migration.
    await tx.payment.updateMany({
      where: { billingSettingsId: null, status: 'PENDING' },
      data: { billingSettingsId: settings.id },
    });
  });
  return (
    await db.runtimeSettings.findUniqueOrThrow({
      where: { id: 'billing' },
      include: { billingSettings: true },
    })
  ).billingSettings;
}
export function adminBillingSettings(value: BillingSettings) {
  return {
    revision: value.id,
    pricePerThousand: formatRate(value.priceMicro),
    taskProducts: taskProducts(value).map(({ priceMicro: _price, ...entry }) => entry),
    topUpMinUsd: value.topUpMinUsd,
    topUpMaxUsd: value.topUpMaxUsd,
    paymentProvider: value.paymentProvider,
    paymentURL: value.paymentURL,
    paymentSecretConfigured: Boolean(value.paymentSecret),
    webhookSecretConfigured: Boolean(value.webhookSecret),
    changedById: value.changedById,
    updatedAt: value.createdAt,
  };
}
const updateSchema = z
  .object({
    revision: z.number().int().positive(),
    pricePerThousand: z
      .string()
      .regex(/^\d{1,4}(?:\.\d{1,3})?$/)
      .optional(),
    taskProducts: z
      .array(
        z
          .object({
            id: productFields.shape.id,
            name: productFields.shape.name,
            pricePerThousand: z.string().regex(/^\d{1,4}(?:\.\d{1,3})?$/),
            enabled: z.boolean(),
          })
          .strict(),
      )
      .min(1)
      .max(100)
      .optional(),
    topUpMinUsd: z.number().int(),
    topUpMaxUsd: z.number().int(),
    paymentProvider: z.enum(['disabled', 'http']),
    paymentURL: z.string().trim().max(2048),
    paymentSecret: z.string().min(1).max(4096).optional(),
    webhookSecret: z.string().min(32).max(4096).optional(),
    clearPaymentSecret: z.boolean().optional(),
    clearWebhookSecret: z.boolean().optional(),
  })
  .strict();
export async function updateBillingSettings(actorId: string, body: unknown) {
  const input = updateSchema.parse(body);
  if (
    (input.clearPaymentSecret && input.paymentSecret !== undefined) ||
    (input.clearWebhookSecret && input.webhookSecret !== undefined)
  )
    throw new AppError(
      400,
      'INVALID_SECRET_CHANGE',
      'Choose either clearing or replacing a secret.',
    );
  await getBillingSettings();
  return db.$transaction(async (tx) => {
    const current = await tx.runtimeSettings.findUniqueOrThrow({
      where: { id: 'billing' },
      include: { billingSettings: true },
    });
    if (current.billingSettingsId !== input.revision)
      throw new AppError(
        409,
        'SETTINGS_CONFLICT',
        'Settings changed in another session. Reload before saving.',
      );
    const products = catalog.parse(
      input.taskProducts
        ? input.taskProducts.map(({ pricePerThousand, ...entry }) => ({
            ...entry,
            priceMicro: priceMicro(pricePerThousand),
          }))
        : taskProducts(current.billingSettings).map(
            ({ supported: _supported, pricePerThousand: _rate, ...entry }) => ({
              ...entry,
              ...(entry.id === 'hcaptcha' && input.pricePerThousand !== undefined
                ? { priceMicro: priceMicro(input.pricePerThousand) }
                : {}),
            }),
          ),
    );
    for (const entry of products) {
      if (entry.enabled && !taskDefinitions.some((definition) => definition.id === entry.id))
        throw new AppError(
          400,
          'TASK_ADAPTER_REQUIRED',
          'A task adapter must be registered before this product can be enabled.',
        );
    }
    if (taskDefinitions.some((definition) => !products.some((entry) => entry.id === definition.id)))
      throw new AppError(
        400,
        'TASK_PRODUCT_REQUIRED',
        'Registered task products must remain in the catalog. Disable them instead.',
      );
    const values = fields.parse({
      ...input,
      priceMicro: products.find((entry) => entry.id === 'hcaptcha')!.priceMicro,
    });
    const secret = input.clearPaymentSecret
      ? null
      : input.paymentSecret === undefined
        ? current.billingSettings.paymentSecret
        : encrypt(input.paymentSecret);
    const webhook = input.clearWebhookSecret
      ? null
      : input.webhookSecret === undefined
        ? current.billingSettings.webhookSecret
        : encrypt(input.webhookSecret);
    validateProvider(values, secret, webhook);
    const next = await tx.billingSettings.create({
      data: {
        ...values,
        taskProducts: products,
        paymentSecret: secret,
        webhookSecret: webhook,
        changedById: actorId,
      },
    });
    const changed = await tx.runtimeSettings.updateMany({
      where: { id: 'billing', billingSettingsId: input.revision },
      data: { billingSettingsId: next.id },
    });
    if (!changed.count)
      throw new AppError(
        409,
        'SETTINGS_CONFLICT',
        'Settings changed in another session. Reload before saving.',
      );
    return adminBillingSettings(next);
  });
}
