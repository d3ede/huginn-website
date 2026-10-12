import type { FastifyRequest, FastifyReply } from 'fastify';
import { db } from './db';
import { config } from './config';
import { hashToken, randomToken, money } from './security';
import { AppError } from './errors';
import type { User } from '@prisma/client';
export const cookieName =
  config.NODE_ENV === 'production' ? '__Host-huginn_session' : 'huginn_session';
export const cookieOptions = {
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};
export function publicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    timezone: user.timezone,
    balance: money(user.balanceMicro),
    createdAt: user.createdAt,
  };
}
export async function newSession(userId: string, reply: FastifyReply) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + config.SESSION_DAYS * 86400000);
  await db.session.create({ data: { userId, tokenHash: hashToken(token), expiresAt } });
  reply.setCookie(cookieName, token, { ...cookieOptions, expires: expiresAt });
}
export async function sessionUser(request: FastifyRequest) {
  const token = request.cookies[cookieName];
  if (!token) throw new AppError(401, 'UNAUTHENTICATED', 'Please sign in to continue.');
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date())
    throw new AppError(401, 'UNAUTHENTICATED', 'Your session has expired. Please sign in again.');
  return session.user;
}
export async function apiUser(request: FastifyRequest) {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith('Bearer hg_live_'))
    throw new AppError(401, 'INVALID_API_KEY', 'A valid Bearer API key is required.');
  const key = await db.apiKey.findUnique({
    where: { tokenHash: hashToken(authorization.slice(7)) },
    include: { user: true },
  });
  if (!key || key.revokedAt)
    throw new AppError(401, 'INVALID_API_KEY', 'The API key is invalid or revoked.');
  await db.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });
  return { user: key.user, apiKeyId: key.id };
}
