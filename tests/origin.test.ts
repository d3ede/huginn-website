import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allowedOrigin } from '../server/origin';

test('local deployment accepts loopback aliases on the configured port only', () => {
  for (const configured of ['http://localhost:3000', 'http://127.0.0.1:3000']) {
    for (const origin of ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://[::1]:3000'])
      assert.equal(allowedOrigin(origin, configured), true);
    for (const origin of [
      undefined,
      'null',
      'http://localhost:3001',
      'https://localhost:3000',
      'http://localhost.example:3000',
      'http://evil@localhost:3000',
      'http://localhost:3000/path',
    ])
      assert.equal(allowedOrigin(origin, configured), false);
  }
});

test('public deployment accepts only its configured origin', () => {
  const configured = 'https://huginn.example';
  assert.equal(allowedOrigin(configured, configured), true);
  for (const origin of [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://other.example',
    'http://huginn.example',
    'https://huginn.example:444',
  ])
    assert.equal(allowedOrigin(origin, configured), false);
});
