import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import {
  hashPassword,
  verifyPassword,
  randomToken,
  hashToken,
  verifySignature,
  money,
} from '../server/security';
test('password hashes use independent salts and reject incorrect passwords', async () => {
  const first = await hashPassword('a long unique password');
  const second = await hashPassword('a long unique password');
  assert.notEqual(first, second);
  assert.equal(await verifyPassword('a long unique password', first), true);
  assert.equal(await verifyPassword('a wrong password', first), false);
  assert.equal(await verifyPassword('password', 'invalid'), false);
});
test('opaque tokens are unique and only their hashes are stored', () => {
  const first = randomToken();
  const second = randomToken();
  assert.notEqual(first, second);
  assert.equal(first.length, 43);
  assert.equal(hashToken(first).length, 64);
  assert.notEqual(hashToken(first), first);
});
test('payment signatures authenticate exact bytes and reject stale replay', () => {
  const raw = '{"paymentId":"example"}';
  const timestamp = '1800000000';
  const secret = randomToken();
  const signature = createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest('hex');
  assert.equal(verifySignature(raw, timestamp, signature, secret, 1800000000000), true);
  assert.equal(verifySignature(raw + ' ', timestamp, signature, secret, 1800000000000), false);
  assert.equal(verifySignature(raw, timestamp, signature, secret, 1800000400000), false);
  assert.equal(verifySignature(raw, timestamp, 'not-a-signature', secret, 1800000000000), false);
});
test('money is serialized from integer microdollars', () => {
  assert.equal(money(2000n), '0.002000');
  assert.equal(money(-2000n), '-0.002000');
  assert.equal(money(0n), '0.000000');
  assert.equal(money(9007199254740993n), '9007199254.740993');
});
