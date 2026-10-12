import type { FastifyRequest, FastifyReply } from 'fastify';
import { db } from './db';
import { config, secureCookies } from './config';
import { hashToken, randomToken, money } from './security';
import { AppError } from './errors';
import type { User } from '@prisma/client';
export const cookieName = secureCookies ? '__Host-huginn_session' : 'huginn_session';
export const cookieOptions = {
  httpOnly: true,
  secure: secureCookies,
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
    isAdmin: user.isAdmin,
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
  return authenticateApiKey(authorization.slice(7));
}
export async function adminUser(request: FastifyRequest) {
  const user = await sessionUser(request);
  if (!user.isAdmin) throw new AppError(403, 'FORBIDDEN', 'Administrator access is required.');
  return user;
}
export async function authenticateApiKey(token: unknown) {
  if (typeof token !== 'string' || !token.startsWith('hg_live_') || token.length > 256)
    throw new AppError(401, 'INVALID_API_KEY', 'The API key is invalid or revoked.');
  const key = await db.apiKey.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!key || key.revokedAt)
    throw new AppError(401, 'INVALID_API_KEY', 'The API key is invalid or revoked.');
  const changed = await db.apiKey.updateMany({
    where: { id: key.id, revokedAt: null },
    data: { lastUsedAt: new Date() },
  });
  if (!changed.count)
    throw new AppError(401, 'INVALID_API_KEY', 'The API key is invalid or revoked.');
  return { user: key.user, apiKeyId: key.id };
}
