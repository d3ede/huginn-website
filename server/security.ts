import {
  randomBytes,
  scrypt as scryptCallback,
  createHash,
  timingSafeEqual,
  createHmac,
} from 'node:crypto';
const passwordParameters = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
function derivePassword(password: string, salt: string, legacy = false) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, 64, legacy ? {} : passwordParameters, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
export const randomToken = () => randomBytes(32).toString('base64url');
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = await derivePassword(password, salt);
  return `scrypt-v1:${salt}:${key.toString('hex')}`;
}
export async function verifyPassword(password: string, encoded: string) {
  const [scheme, salt, hex] = encoded.split(':');
  if (
    !['scrypt-v1', 'scrypt'].includes(scheme) ||
    !/^[a-f0-9]{32}$/.test(salt ?? '') ||
    !/^[a-f0-9]{128}$/.test(hex ?? '')
  )
    return false;
  const candidate = await derivePassword(password, salt, scheme === 'scrypt');
  return timingSafeEqual(candidate, Buffer.from(hex, 'hex'));
}
export function verifySignature(
  raw: string,
  timestamp: string,
  signature: string,
  secret: string,
  now = Date.now(),
) {
  if (
    !/^\d{10}$/.test(timestamp) ||
    Math.abs(now / 1000 - Number(timestamp)) > 300 ||
    !/^[a-f0-9]{64}$/.test(signature)
  )
    return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest();
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}
export function money(micro: bigint | number) {
  const value = BigInt(micro);
  const absolute = value < 0n ? -value : value;
  return `${value < 0n ? '-' : ''}${absolute / 1_000_000n}.${(absolute % 1_000_000n).toString().padStart(6, '0')}`;
}
